import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { KeyRound, Lock } from 'lucide-react';
import { normalizeInviteCode } from '../data/groups';
import type { Member } from '../domain/types';
import { Button, Card, CardHeader, EmptyState, Input, TopBar } from '../shared/ui';
import { PageBody } from './shell/PageBody';
import { useBack } from './shell/useBack';

export interface NotMemberStateProps {
  /** My member document in this group when one exists (left, removed); null when I never joined. */
  readonly membership: Member | null;
}

/**
 * `/g/:gid` for a signed-in visitor who is not an active member: says so, and offers the way in (an invite
 * code, which resolves to the invite landing) instead of bouncing to My groups without a word.
 */
export function NotMemberState({ membership }: NotMemberStateProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const back = useBack('/');
  const [code, setCode] = useState('');
  const removed = membership?.status === 'removed';
  const onJoin = (e: FormEvent) => {
    e.preventDefault();
    navigate(`/join/${encodeURIComponent(normalizeInviteCode(code))}`);
  };

  return (
    <>
      <TopBar title={t('ux2.notMember.screen')} onBack={back} backLabel={t('nav.back')} />
      <PageBody>
        <Card padding="none">
          <EmptyState
            icon={<Lock />}
            title={removed ? t('join.removedTitle') : t('ux2.notMember.title')}
            description={removed ? t('join.removed') : t('ux2.notMember.hint')}
            action={
              <Button variant="ghost" onClick={() => navigate('/')} data-testid="group-not-member-home">
                {t('ux2.notMember.myGroups')}
              </Button>
            }
            data-testid="group-not-member"
          />
        </Card>
        {!removed && (
          <Card as="section">
            <CardHeader title={t('myGroups.joinTitle')} description={t('myGroups.joinHint')} />
            <form onSubmit={onJoin} className="mt-4 flex flex-col gap-3">
              <Input
                id="group-join-code"
                label={t('myGroups.joinCode')}
                required
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                maxLength={12}
                leading={<KeyRound />}
                className="font-mono uppercase tracking-[0.15em]"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                data-testid="group-join-code"
              />
              <Button type="submit" variant="secondary" data-testid="group-join-code-submit">
                {t('myGroups.join')}
              </Button>
            </form>
          </Card>
        )}
      </PageBody>
    </>
  );
}
