import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useGroup } from '../../app/providers/group';
import { useSession } from '../../app/providers/session';
import { showToast } from '../../components/Toast';
import { rotateInviteCode, updateGroup } from '../../data/groups';
import { legalNoticeKey } from '../../domain/policies';
import type { CostMode, GroupPolicy, PlateRotation } from '../../domain/types';
import { useAction } from '../../shared/lib/useAction';
import type { Place } from '../map/geocoder';
import { PlaceSearch } from '../map/PlaceSearch';
import { GroupBasicsFields, type GroupBasics } from './GroupBasicsFields';
import { COST_MODES, parseEmailDomains, PLATE_ROTATIONS } from './options';

const isCostMode = (v: string): v is CostMode => COST_MODES.some((m) => m === v);
const isPlateRotation = (v: string): v is PlateRotation => PLATE_ROTATIONS.some((r) => r === v);

export function SettingsPage() {
  const { t } = useTranslation();
  const { isAdmin } = useGroup();
  return (
    <main className="p-4">
      <h1>{t('settings.title')}</h1>
      {isAdmin ? (
        <>
          <GroupSettingsForm />
          <InviteSection />
        </>
      ) : (
        <p role="alert">{t('common.adminsOnly')}</p>
      )}
    </main>
  );
}

function GroupSettingsForm() {
  const { t } = useTranslation();
  const { group, refresh } = useGroup();
  const [basics, setBasics] = useState<GroupBasics>({ name: group.name, type: group.type, country: group.country });
  const [policy, setPolicy] = useState<GroupPolicy>(group.policy);
  const [domains, setDomains] = useState(group.allowedEmailDomains.join(', '));
  const [destination, setDestination] = useState<Place | null>(
    group.destination ? { label: group.destination.label, point: group.destination } : null,
  );
  const isKorea = basics.country === 'KR';

  const save = useAction(async () => {
    await updateGroup(group.id, {
      name: basics.name.trim(),
      type: basics.type,
      country: basics.country,
      allowedEmailDomains: parseEmailDomains(domains),
      destination: destination?.point
        ? { label: destination.label, lat: destination.point.lat, lng: destination.point.lng }
        : null,
      policy: isKorea ? { ...policy, costMode: 'rotation' } : policy,
    });
    refresh();
    showToast(t('common.saved'), 'success');
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save.run();
  };

  return (
    <form onSubmit={onSubmit}>
      <GroupBasicsFields prefix="settings" value={basics} onChange={setBasics} />
      <label htmlFor="settings-cost-mode">{t('settings.costMode')}</label>
      <select
        id="settings-cost-mode"
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
      </select>
      <p data-testid="settings-legal-notice">{t(legalNoticeKey({ country: basics.country, policy }))}</p>
      <label htmlFor="settings-cutoff">{t('settings.absenceCutoffHour')}</label>
      <input
        id="settings-cutoff"
        type="number"
        min={0}
        max={23}
        required
        value={policy.absenceCutoffHour}
        onChange={(e) => setPolicy({ ...policy, absenceCutoffHour: Number(e.target.value) })}
        data-testid="settings-cutoff"
      />
      <label htmlFor="settings-plate-rotation">{t('settings.plateRotation')}</label>
      <select
        id="settings-plate-rotation"
        value={policy.plateRotation}
        onChange={(e) => isPlateRotation(e.target.value) && setPolicy({ ...policy, plateRotation: e.target.value })}
        data-testid="settings-plate-rotation"
      >
        {PLATE_ROTATIONS.map((rotation) => (
          <option key={rotation} value={rotation}>
            {t(`plateRotation.${rotation}`)}
          </option>
        ))}
      </select>
      <label htmlFor="settings-domains">{t('settings.allowedEmailDomains')}</label>
      <textarea
        id="settings-domains"
        value={domains}
        onChange={(e) => setDomains(e.target.value)}
        placeholder="example.com"
        data-testid="settings-domains"
      />
      <p>{t('settings.allowedEmailDomainsHint')}</p>
      <PlaceSearch
        id="settings-destination"
        label={t('group.destination')}
        country={basics.country}
        value={destination}
        onChange={setDestination}
      />
      <button type="submit" disabled={save.busy} data-testid="settings-save">
        {t('common.save')}
      </button>
    </form>
  );
}

function InviteSection() {
  const { t } = useTranslation();
  const { group, refresh } = useGroup();
  const { user } = useSession();
  const link = `${window.location.origin}/join/${group.inviteCode}`;
  const copy = useAction(async () => {
    await navigator.clipboard.writeText(link);
    showToast(t('invite.copied'), 'success');
  });
  const rotate = useAction(async () => {
    if (!window.confirm(t('invite.rotateConfirm'))) return;
    await rotateInviteCode(group.id, user.uid);
    refresh();
  });

  return (
    <section aria-labelledby="invite-heading">
      <h2 id="invite-heading">{t('invite.title')}</h2>
      <p>
        {t('invite.code')}: <code data-testid="invite-code">{group.inviteCode}</code>
      </p>
      <p>
        {t('invite.link')}:{' '}
        <a href={link} data-testid="invite-link">
          {link}
        </a>
      </p>
      <button type="button" onClick={() => copy.run()} disabled={copy.busy} data-testid="invite-copy">
        {t('invite.copy')}
      </button>
      <button type="button" onClick={() => rotate.run()} disabled={rotate.busy} data-testid="invite-rotate">
        {t('invite.rotate')}
      </button>
    </section>
  );
}
