import { useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  Car,
  Check,
  ChevronRight,
  Clock3,
  ExternalLink,
  Globe,
  Home,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Share2,
  UserRound,
  Users,
  UserX,
} from 'lucide-react';
import {
  Avatar,
  AvatarStack,
  Badge,
  Banner,
  BottomNav,
  Button,
  Card,
  CardHeader,
  Checkbox,
  IconButton,
  Input,
  LedgerBar,
  List,
  ListItem,
  SheetPanel,
  Stat,
  TopBar,
  cx,
} from '..';
import { crew, formatBalance, group, me, members, tomorrow, week } from './sample';

/* ---------- frame ---------- */

export function PhoneFrame({ children, label, className, id }: { children: ReactNode; label: string; className?: string; id?: string }) {
  return (
    <figure className="flex w-full max-w-[390px] flex-col items-center gap-3">
      <div
        id={id}
        className={cx(
          'relative flex h-[760px] w-full flex-col overflow-hidden rounded-[1.75rem] border border-line bg-canvas text-ink shadow-float',
          className,
        )}
      >
        {children}
      </div>
      <figcaption className="text-caption text-ink-3">{label}</figcaption>
    </figure>
  );
}

const NAV_ITEMS = [
  { key: 'home', label: '홈', icon: Home },
  { key: 'crews', label: '크루', icon: Users },
  { key: 'events', label: '이벤트', icon: CalendarDays },
  { key: 'members', label: '멤버', icon: UserRound },
  { key: 'more', label: '더보기', icon: Menu },
];

const STATUS_BADGE = {
  planned: { variant: 'neutral' as const, label: '예정', icon: null },
  needs_driver: { variant: 'warn' as const, label: '운전자 필요', icon: <AlertTriangle /> },
  done: { variant: 'success' as const, label: '완료', icon: <Check /> },
  absent: { variant: 'neutral' as const, label: '결석', icon: <UserX /> },
};

/* ---------- 1. Group home ---------- */

export function GroupHomeScreen({ dimmed = false }: { dimmed?: boolean }) {
  return (
    <>
      <TopBar
        title={group.name}
        onTitleClick={() => {}}
        titleActionLabel="그룹 바꾸기"
        trailing={<IconButton label="공유" icon={<Share2 />} />}
        sticky={false}
      />
      <div className={cx('scroll-body flex-1 px-4 pb-safe-nav pt-3', dimmed && 'pointer-events-none')} aria-hidden={dimmed || undefined}>
        <section className="flex flex-col gap-3">
          <Card variant="inverse" padding="lg" className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sub font-medium text-ink-2">내일 아침</p>
                <p className="mt-0.5 text-sub text-ink-2">
                  {tomorrow.dateLabel} <span className="tabular-nums">{tomorrow.time}</span> 출발
                </p>
              </div>
              <Badge variant="brand">예정</Badge>
            </div>
            <div className="flex items-center gap-3">
              <Avatar name={tomorrow.driver.name} size="lg" tint="neutral" className="bg-accent-wash-strong text-ink" marker={<Car />} />
              <div className="min-w-0">
                <p className="text-title-1 text-ink">{tomorrow.driver.name} 님이 운전해요</p>
                <p className="mt-1 flex items-center gap-1.5 text-sub text-ink-2">
                  <MapPin aria-hidden="true" className="size-4 shrink-0" />
                  {crew.pickup}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-control bg-accent-wash px-3 py-2.5">
              <div className="flex items-center gap-2 text-sub text-ink-2">
                <AvatarStack people={tomorrow.riders} size="xs" />
                <span>{tomorrow.riders.map((r) => r.name).join(', ')} 탑승</span>
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sub text-ink-2">변경 마감까지</p>
              <p className="text-title-2 tabular-nums text-ink">
                {tomorrow.remaining} <span className="text-caption font-normal text-ink-3">({tomorrow.cutoffLabel})</span>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary">내일 못 가요</Button>
              <Button variant="ghost" trailingIcon={<ChevronRight />}>크루 보기</Button>
            </div>
          </Card>

          <Card padding="none">
            <CardHeader
              className="px-4 pt-4"
              title="이번 주"
              description={crew.name}
              action={<Button variant="ghost" size="sm" trailingIcon={<ChevronRight />}>주간 계획</Button>}
            />
            <List inset={false} className="mt-2">
              {week.map((d) => {
                const spec = STATUS_BADGE[d.status];
                return (
                  <ListItem
                    key={d.day}
                    leading={
                      <span className={cx('flex w-10 flex-col items-center rounded-control py-1', d.status === 'planned' && d.day === '화' ? 'bg-accent-wash text-accent-ink' : 'text-ink-2')}>
                        <span className="text-caption font-medium">{d.day}</span>
                        <span className="text-body font-semibold tabular-nums">{d.date}</span>
                      </span>
                    }
                    title={d.text}
                    description={`${crew.outTime} 출발`}
                    trailing={<Badge variant={spec.variant} icon={spec.icon}>{spec.label}</Badge>}
                    onClick={() => {}}
                  />
                );
              })}
            </List>
          </Card>

          <Card padding="none">
            <List inset={false}>
              <ListItem
                leading={<AvatarStack people={members} size="sm" max={3} />}
                title={crew.name}
                description={`멤버 ${members.length}명 · 캡틴 ${members[0].name}`}
                trailing={<Badge variant="success" icon={<Check />}>활동 중</Badge>}
                href="#crew"
                onClick={(e) => e.preventDefault()}
              />
            </List>
          </Card>
        </section>
      </div>
      <BottomNav items={NAV_ITEMS} activeKey="home" label="주요 메뉴" position="absolute" />
    </>
  );
}

/* ---------- 2. Trip completion sheet ---------- */

export function TripCompletionMock() {
  const [checked, setChecked] = useState<Record<string, boolean>>({ u2: true, u3: true, u4: true });
  const riding = tomorrow.riders.filter((r) => checked[r.uid]).length;
  return (
    <>
      <GroupHomeScreen dimmed />
      <div className="absolute inset-0 z-40 bg-scrim" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 z-40 overflow-hidden rounded-t-sheet shadow-sheet">
        <SheetPanel
          title="운행 완료"
          description="탑승하지 않은 사람은 체크를 해제하세요."
          closeLabel="닫기"
          onClose={() => {}}
          footer={
            <div className="flex flex-col gap-2">
              <Button size="lg" fullWidth>
                완료 기록
              </Button>
              <p className="text-center text-caption text-ink-3">기록하면 장부가 바로 갱신돼요.</p>
            </div>
          }
        >
          <div className="flex items-center gap-3 rounded-card bg-surface-2 px-4 py-3">
            <Avatar name={tomorrow.driver.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sub font-medium text-ink">운전 {tomorrow.driver.name}</p>
              <p className="text-caption text-ink-3">
                {tomorrow.dateLabel} <span className="tabular-nums">{tomorrow.time}</span> 출근
              </p>
            </div>
            <span className="text-sub font-semibold tabular-nums text-ink-2">탑승 {riding}명</span>
          </div>
          <ul role="list" className="mt-2 divide-y divide-line">
            {tomorrow.riders.map((r) => (
              <li key={r.uid} className="flex items-center gap-3">
                <Avatar name={r.name} size="sm" />
                <Checkbox
                  boxPosition="end"
                  wrapperClassName="flex-1"
                  label={r.name}
                  description={r.uid === me.uid ? '나' : undefined}
                  checked={checked[r.uid]}
                  onChange={(e) => setChecked((prev) => ({ ...prev, [r.uid]: e.target.checked }))}
                />
              </li>
            ))}
          </ul>
        </SheetPanel>
      </div>
    </>
  );
}

/* ---------- 3. Crew ledger ---------- */

export function CrewLedgerScreen() {
  const max = Math.max(1, ...members.map((m) => Math.abs(m.balance)));
  const next = members.reduce((a, b) => (b.canDrive && b.balance < a.balance ? b : a), members[0]);
  return (
    <>
      <TopBar title={crew.name} onBack={() => {}} backLabel="뒤로" trailing={<IconButton label="크루 설정" icon={<Menu />} />} sticky={false} />
      <div className="scroll-body flex-1 px-4 pb-safe-nav pt-3">
        <div className="flex flex-col gap-3">
          <Card>
            <CardHeader title="운전 장부" description="0에 가까울수록 공평해요. 결석한 날은 점수에 들어가지 않아요." />
            <div className="mt-2 divide-y divide-line">
              {members.map((m) => (
                <LedgerBar
                  key={m.uid}
                  name={m.uid === me.uid ? `${m.name} (나)` : m.name}
                  value={m.balance}
                  max={max}
                  label={formatBalance(m.balance)}
                  leading={<Avatar name={m.name} size="md" marker={m.uid === next.uid ? <Car /> : undefined} />}
                  detail={m.uid === next.uid ? '다음 운전 차례' : m.detail}
                  highlight={m.uid === next.uid}
                />
              ))}
            </div>
            <p className="mt-3 text-caption text-ink-3">+ 는 자기 몫보다 더 운전했다는 뜻이고, - 는 더 탑승했다는 뜻이에요.</p>
          </Card>

          <Card>
            <div className="grid grid-cols-3 gap-3">
              <Stat value="18회" label="이번 달 운행" />
              <Stat value="92%" label="참여율" hint="지난달 88%" />
              <Stat value="4명" label="멤버" />
            </div>
          </Card>

          <Card padding="none">
            <CardHeader className="px-4 pt-4" title="멤버" />
            <List inset={false} className="mt-2">
              {members.map((m) => (
                <ListItem
                  key={m.uid}
                  leading={<Avatar name={m.name} size="md" />}
                  title={m.name}
                  description={m.canDrive ? '운전 가능 · 좌석 3' : '탑승만 해요'}
                  trailing={m.role === 'captain' ? <Badge variant="brand">캡틴</Badge> : m.role === 'backup' ? <Badge>예비 운전자</Badge> : undefined}
                  onClick={() => {}}
                />
              ))}
            </List>
          </Card>
        </div>
      </div>
      <BottomNav items={NAV_ITEMS} activeKey="crews" label="주요 메뉴" position="absolute" />
    </>
  );
}

/* ---------- 4. Sign-in ---------- */

export function SignInScreen() {
  return (
    <div className="scroll-body flex flex-1 flex-col px-5 pb-safe pt-14">
      <div className="flex flex-col gap-2">
        <p className="text-display text-ink">open carpool</p>
        <p className="text-body text-ink-2">아는 사람끼리, 공평하게 번갈아 운전해요.</p>
      </div>
      <div className="mt-6">
        <Banner
          variant="warn"
          title="카카오톡 안에서는 Google 로그인이 되지 않아요"
          action={
            <Button variant="secondary" size="sm" leadingIcon={<ExternalLink />}>
              외부 브라우저로 열기
            </Button>
          }
        >
          오른쪽 위 메뉴의 '다른 브라우저로 열기'를 누르거나 아래 버튼을 눌러 주세요.
        </Banner>
      </div>
      <div className="mt-6 flex flex-col gap-2">
        <Button size="lg" fullWidth leadingIcon={<MessageCircle />}>
          카카오로 계속하기
        </Button>
        <Button size="lg" fullWidth variant="secondary" leadingIcon={<Globe />}>
          Google로 계속하기
        </Button>
      </div>
      <div className="my-5 flex items-center gap-3 text-caption text-ink-3">
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
        또는 이메일로
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
      </div>
      <form className="flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
        <Input label="이메일" type="email" inputMode="email" autoComplete="email" placeholder="name@company.com" leading={<Mail />} hint="링크를 누르면 바로 로그인돼요. 비밀번호는 없어요." />
        <Button type="submit" size="lg" fullWidth variant="secondary" leadingIcon={<Clock3 />}>
          로그인 링크 받기
        </Button>
      </form>
      <p className="mt-auto pt-8 text-center text-caption text-ink-3">계속하면 이용약관과 개인정보처리방침에 동의하게 돼요.</p>
    </div>
  );
}
