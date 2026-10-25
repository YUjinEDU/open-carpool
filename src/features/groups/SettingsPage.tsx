import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { ArrowRightLeft, RefreshCw, Trash2, X } from 'lucide-react';
import { useGroup } from '../../app/providers/group';
import { useSession } from '../../app/providers/session';
import { InviteShare } from '../../app/shell/InviteShare';
import { PageBody } from '../../app/shell/PageBody';
import { useBack } from '../../app/shell/useBack';
import { rotateInviteCode, updateGroup, type GroupPatch } from '../../data/groups';
import type { CostMode, GroupPolicy, PlateRotation } from '../../domain/types';
import { useAction } from '../../shared/lib/useAction';
import { Badge, Button, Card, CardHeader, Dialog, EmptyState, IconButton, Input, Select, TopBar } from '../../shared/ui';
import type { Place } from '../map/geocoder';
import { PlaceSearch } from '../map/PlaceSearch';
import { DeleteGroupDialog } from './DeleteGroupDialog';
import { GroupBasicsFields, type GroupBasics } from './GroupBasicsFields';
import { LegalNotice } from './LegalNotice';
import { COST_MODES, parseEmailDomains, PLATE_ROTATIONS } from './options';
import { TransferOwnershipSheet } from './TransferOwnershipSheet';

const isCostMode = (v: string): v is CostMode => COST_MODES.some((m) => m === v);
const isPlateRotation = (v: string): v is PlateRotation => PLATE_ROTATIONS.some((r) => r === v);
const CUTOFF_HOURS = [17, 18, 19, 20, 21, 22, 23];
const SAVED_BADGE_MS = 2000;

/** Per-card save: runs the patch, refreshes the group and shows a "saved" badge for two seconds. */
function useCardSave(patch: () => GroupPatch) {
  const { group, refresh } = useGroup();
  const [saved, setSaved] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const action = useAction(async () => {
    await updateGroup(group.id, patch());
    refresh();
    setSaved(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setSaved(false), SAVED_BADGE_MS);
  });
  return { ...action, saved } as const;
}

function SavedBadge({ saved }: { readonly saved: boolean }) {
  const { t } = useTranslation();
  return saved ? <Badge variant="success">{t('common.savedBadge')}</Badge> : null;
}

export function SettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { group, me, isAdmin } = useGroup();
  const back = useBack(`/g/${group.id}`);
  return (
    <>
      <TopBar wide title={t('settings.title')} onBack={back} backLabel={t('nav.back')} />
      <PageBody nav wide className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
        {isAdmin ? (
          <>
            <InviteCard />
            <BasicsCard />
            <PolicyCard />
            <DomainsCard />
            {me.role === 'owner' && <OwnerCard />}
          </>
        ) : (
          <EmptyState
            title={t('common.forbiddenTitle')}
            description={t('common.forbiddenBody')}
            action={<Button variant="secondary" onClick={() => navigate(`/g/${group.id}`)}>{t('common.toGroup')}</Button>}
            className="lg:col-span-2"
          />
        )}
      </PageBody>
    </>
  );
}

function OwnerCard() {
  const { t } = useTranslation();
  const [transferring, setTransferring] = useState(false);
  const [deleting, setDeleting] = useState(false);
  return (
    <Card as="section" className="flex flex-col gap-3">
      <CardHeader title={t('settings.owner.title')} description={t('settings.owner.description')} />
      <Button variant="secondary" leadingIcon={<ArrowRightLeft />} className="self-start" onClick={() => setTransferring(true)} data-testid="owner-transfer">
        {t('settings.owner.transfer')}
      </Button>
      <Button variant="ghost" leadingIcon={<Trash2 />} className="self-start text-danger-ink" onClick={() => setDeleting(true)} data-testid="owner-delete-group">
        {t('settings.owner.delete')}
      </Button>
      <TransferOwnershipSheet open={transferring} onClose={() => setTransferring(false)} leaveAfter={false} />
      <DeleteGroupDialog open={deleting} onClose={() => setDeleting(false)} />
    </Card>
  );
}

function InviteCard() {
  const { t } = useTranslation();
  const { group, refresh } = useGroup();
  const { user } = useSession();
  const [asking, setAsking] = useState(false);
  const rotate = useAction(async () => {
    await rotateInviteCode(group.id, user.uid);
    setAsking(false);
    refresh();
  });
  return (
    <Card as="section" className="flex flex-col gap-4">
      <CardHeader title={t('settings.invite')} description={t('invite.hint')} />
      <InviteShare group={group} withTestIds />
      <Button variant="ghost" leadingIcon={<RefreshCw />} className="self-start" onClick={() => setAsking(true)} data-testid="invite-rotate">
        {t('invite.rotate')}
      </Button>
      <Dialog
        open={asking}
        onClose={() => setAsking(false)}
        role="alertdialog"
        title={t('invite.rotateConfirmTitle')}
        description={t('invite.rotateConfirmBody')}
        actions={
          <>
            <Button variant="secondary" onClick={() => setAsking(false)}>{t('common.cancel')}</Button>
            <Button loading={rotate.busy} onClick={() => rotate.run()} data-testid="invite-rotate-confirm">
              {t('invite.rotateAction')}
            </Button>
          </>
        }
      />
    </Card>
  );
}

function BasicsCard() {
  const { t } = useTranslation();
  const { group } = useGroup();
  const [basics, setBasics] = useState<GroupBasics>({ name: group.name, type: group.type, country: group.country });
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [destination, setDestination] = useState<Place | null>(
    group.destination ? { label: group.destination.label, point: group.destination } : null,
  );
  const save = useCardSave(() => ({
    name: basics.name.trim(),
    type: basics.type,
    destination: destination?.point ? { label: destination.label, lat: destination.point.lat, lng: destination.point.lng } : null,
  }));
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (basics.name.trim() === '') {
      setNameError(t('createGroup.nameError'));
      return;
    }
    setNameError(undefined);
    save.run();
  };
  return (
    <Card as="section">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <CardHeader title={t('settings.basics')} action={<SavedBadge saved={save.saved} />} />
        <GroupBasicsFields prefix="settings" value={basics} onChange={setBasics} nameError={nameError} countryReadOnly />
        <PlaceSearch id="settings-destination" label={t('group.destination')} country={basics.country} value={destination} onChange={setDestination} />
        <Button type="submit" variant="secondary" loading={save.busy} loadingLabel={t('settings.saving')} className="self-start" data-testid="settings-save">
          {t('common.save')}
        </Button>
      </form>
    </Card>
  );
}

function PolicyCard() {
  const { t } = useTranslation();
  const { group } = useGroup();
  const [policy, setPolicy] = useState<GroupPolicy>(group.policy);
  const isKorea = group.country.trim().toUpperCase() === 'KR';
  const hours = CUTOFF_HOURS.includes(policy.absenceCutoffHour) ? CUTOFF_HOURS : [...CUTOFF_HOURS, policy.absenceCutoffHour].sort((a, b) => a - b);
  const save = useCardSave(() => ({ policy: isKorea ? { ...policy, costMode: 'rotation' } : policy }));
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save.run();
  };
  return (
    <Card as="section">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <CardHeader title={t('settings.policy')} action={<SavedBadge saved={save.saved} />} />
        <Select
          id="settings-cutoff"
          label={t('settings.absenceCutoffHour')}
          value={String(policy.absenceCutoffHour)}
          onChange={(e) => setPolicy({ ...policy, absenceCutoffHour: Number(e.target.value) })}
          data-testid="settings-cutoff"
        >
          {hours.map((hour) => (
            <option key={hour} value={hour}>
              {t('settings.cutoffOption', { hour })}
            </option>
          ))}
        </Select>
        <Select
          id="settings-plate-rotation"
          label={t('settings.plateRotation')}
          value={policy.plateRotation}
          onChange={(e) => isPlateRotation(e.target.value) && setPolicy({ ...policy, plateRotation: e.target.value })}
          data-testid="settings-plate-rotation"
        >
          {PLATE_ROTATIONS.map((rotation) => (
            <option key={rotation} value={rotation}>
              {t(`plateRotation.${rotation}`)}
            </option>
          ))}
        </Select>
        <Select
          id="settings-cost-mode"
          label={t('settings.costMode')}
          value={isKorea ? 'rotation' : policy.costMode}
          disabled={isKorea}
          onChange={(e) => isCostMode(e.target.value) && setPolicy({ ...policy, costMode: e.target.value })}
          data-testid="settings-cost-mode"
        >
          {COST_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {t(`costMode.${mode}`)}
            </option>
          ))}
        </Select>
        <LegalNotice group={{ country: group.country, policy }} data-testid="settings-legal-notice" />
        <Button type="submit" variant="secondary" loading={save.busy} loadingLabel={t('settings.saving')} className="self-start" data-testid="settings-save-policy">
          {t('common.save')}
        </Button>
      </form>
    </Card>
  );
}

function DomainsCard() {
  const { t } = useTranslation();
  const { group } = useGroup();
  const [domains, setDomains] = useState<readonly string[]>(group.allowedEmailDomains);
  const [draft, setDraft] = useState('');
  const save = useCardSave(() => ({ allowedEmailDomains: [...domains] }));
  const add = () => {
    const parsed = parseEmailDomains(draft);
    if (parsed.length === 0) return;
    setDomains((prev) => [...new Set([...prev, ...parsed])]);
    setDraft('');
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    add();
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (draft.trim()) add();
    save.run();
  };
  return (
    <Card as="section">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <CardHeader title={t('settings.domains')} action={<SavedBadge saved={save.saved} />} />
        {domains.length === 0 ? (
          <p className="text-sub text-ink-2">{t('settings.domainsEmpty')}</p>
        ) : (
          <ul role="list" className="flex flex-wrap gap-2">
            {domains.map((domain) => (
              <li key={domain} className="inline-flex h-11 items-center gap-1 rounded-chip border border-line-strong bg-surface pl-3.5 pr-1 text-sub font-medium text-ink">
                @{domain}
                <IconButton label={t('settings.domainRemove', { domain })} icon={<X />} onClick={() => setDomains((prev) => prev.filter((d) => d !== domain))} />
              </li>
            ))}
          </ul>
        )}
        <Input
          id="settings-domains"
          label={t('settings.allowedEmailDomains')}
          labelHidden
          hint={t('settings.allowedEmailDomainsHint')}
          inputMode="email"
          autoCapitalize="none"
          autoComplete="off"
          spellCheck={false}
          placeholder={t('settings.domainPlaceholder')}
          leading={<span className="text-sub">@</span>}
          trailing={
            <Button type="button" variant="ghost" size="sm" onClick={add} disabled={!draft.trim()} className="mr-1">
              {t('settings.domainAdd')}
            </Button>
          }
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          data-testid="settings-domains"
        />
        <Button type="submit" variant="secondary" loading={save.busy} loadingLabel={t('settings.saving')} className="self-start" data-testid="settings-save-domains">
          {t('common.save')}
        </Button>
      </form>
    </Card>
  );
}
