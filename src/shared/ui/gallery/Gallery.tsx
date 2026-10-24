import { useState, type ReactNode } from 'react';
import { AlertTriangle, Car, Check, ChevronRight, Inbox, Mail, Moon, Plus, Search, Share2, Sun, Trash2, UserX, Users } from 'lucide-react';
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
  Chip,
  ChipGroup,
  Dialog,
  EmptyState,
  IconButton,
  Input,
  LedgerBar,
  List,
  ListItem,
  SegmentedControl,
  Select,
  ShareButtons,
  Sheet,
  SheetPanel,
  Skeleton,
  Spinner,
  Stat,
  Switch,
  TextArea,
  TimeField,
  ToastContainer,
  TopBar,
  showToast,
} from '..';
import { CrewLedgerScreen, GroupHomeScreen, PhoneFrame, SignInScreen, TripCompletionMock } from './mockups';
import { formatBalance, members, weekdays } from './sample';
import { Home, Users as UsersIcon, CalendarDays, UserRound, Menu } from 'lucide-react';

/* ---------- gallery scaffolding ---------- */

function Section({ id, title, description, children, wide = false }: { id: string; title: string; description?: string; children: ReactNode; wide?: boolean }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={wide ? 'md:col-span-2' : undefined}>
      <h2 id={`${id}-title`} className="text-title-2 text-ink">
        {title}
      </h2>
      {description && <p className="mt-1 text-sub text-ink-2">{description}</p>}
      <div className="mt-3 flex flex-col gap-4 rounded-card border border-line bg-surface p-4">{children}</div>
    </section>
  );
}

function Spec({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="mb-2 text-caption font-medium text-ink-3">{label}</p>
      {children}
    </div>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

function Swatch({ name, className, border = false }: { name: string; className: string; border?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden="true" className={`size-8 shrink-0 rounded-[0.5rem] ${className} ${border ? 'border border-line' : ''}`} />
      <span className="text-caption text-ink-2">{name}</span>
    </div>
  );
}

const NAV = [
  { key: 'home', label: '홈', icon: Home },
  { key: 'crews', label: '크루', icon: UsersIcon },
  { key: 'events', label: '이벤트', icon: CalendarDays, badge: 2 },
  { key: 'members', label: '멤버', icon: UserRound },
  { key: 'more', label: '더보기', icon: Menu },
];

const SEGMENTS = [
  { value: 'out', label: '출근' },
  { value: 'back', label: '퇴근' },
  { value: 'both', label: '왕복' },
] as const;

function QrPlaceholder() {
  // Gallery-only stand-in for the QR slot; the feature renders a real code here.
  return (
    <svg viewBox="0 0 21 21" role="img" aria-label="QR 코드 자리" className="rounded-[0.375rem] bg-white p-1 text-ink">
      {Array.from({ length: 21 * 21 }, (_, i) => {
        const x = i % 21;
        const y = Math.floor(i / 21);
        const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
        const ring = finder && (x % 14 === 0 || x % 14 === 6 || y % 14 === 0 || y % 14 === 6 || ((x % 14) >= 2 && (x % 14) <= 4 && (y % 14) >= 2 && (y % 14) <= 4));
        const noise = !finder && ((x * 7 + y * 13 + x * y) % 5 < 2);
        return ring || noise ? <rect key={i} x={x} y={y} width="1" height="1" fill="currentColor" /> : null;
      })}
    </svg>
  );
}

/* ---------- page ---------- */

export function Gallery() {
  const [dark, setDark] = useState(false);
  const [segment, setSegment] = useState<(typeof SEGMENTS)[number]['value']>('out');
  const [days, setDays] = useState<string[]>(['1', '2', '3', '4', '5']);
  const [sw1, setSw1] = useState(true);
  const [sw2, setSw2] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    if (next) document.documentElement.dataset.theme = 'dark';
    else delete document.documentElement.dataset.theme;
  };

  const fakeSave = () => {
    setSaving(true);
    window.setTimeout(() => {
      setSaving(false);
      showToast('저장했어요', 'success');
    }, 1200);
  };

  const max = Math.max(1, ...members.map((m) => Math.abs(m.balance)));

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <header className="hairline-bottom sticky top-0 z-20 bg-surface/92 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <div className="min-w-0">
            <p className="truncate text-title-3 text-ink">open-carpool 디자인 갤러리</p>
            <p className="truncate text-caption text-ink-3">src/shared/ui · 샘플 데이터 · docs/DESIGN.md가 계약</p>
          </div>
          <Button variant="secondary" size="sm" onClick={toggleTheme} leadingIcon={dark ? <Sun /> : <Moon />} aria-pressed={dark}>
            {dark ? '라이트 테마' : '다크 테마'}
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6">
        <h1 className="text-display text-ink">컴포넌트 키트</h1>
        <p className="mt-2 max-w-[60ch] text-body text-ink-2">
          그룹 카풀 운영 도구의 UI 키트예요. 차분하고, 믿음직하고, 한 손으로 빠르게 쓰도록 만들었어요. 모든 색과 간격은 토큰에서 나오고, 모든 문구는 props로 받아요.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
          <Section id="tokens" title="토큰" description="색은 의미 이름으로만 씁니다. 브랜드 그린 하나, 상태색 넷, 회색 단계." wide>
            <div className="grid gap-6 md:grid-cols-3">
              <Spec label="표면과 잉크">
                <div className="grid grid-cols-2 gap-2">
                  <Swatch name="canvas" className="bg-canvas" border />
                  <Swatch name="surface" className="bg-surface" border />
                  <Swatch name="surface-2" className="bg-surface-2" />
                  <Swatch name="surface-3" className="bg-surface-3" />
                  <Swatch name="ink" className="bg-ink" />
                  <Swatch name="ink-2" className="bg-ink-2" />
                  <Swatch name="ink-3" className="bg-ink-3" />
                  <Swatch name="line" className="bg-line" />
                </div>
              </Spec>
              <Spec label="브랜드 그린">
                <div className="grid grid-cols-2 gap-2">
                  <Swatch name="brand-50" className="bg-brand-50" border />
                  <Swatch name="brand-100" className="bg-brand-100" />
                  <Swatch name="brand-300" className="bg-brand-300" />
                  <Swatch name="brand-500" className="bg-brand-500" />
                  <Swatch name="brand-600 (accent)" className="bg-brand-600" />
                  <Swatch name="brand-700" className="bg-brand-700" />
                  <Swatch name="brand-900" className="bg-brand-900" />
                  <Swatch name="brand-950" className="bg-brand-950" />
                </div>
              </Spec>
              <Spec label="상태색 (wash + ink)">
                <div className="grid grid-cols-2 gap-2">
                  <Swatch name="success" className="bg-success-wash" />
                  <Swatch name="success-ink" className="bg-success-ink" />
                  <Swatch name="warn" className="bg-warn-wash" />
                  <Swatch name="warn-ink" className="bg-warn-ink" />
                  <Swatch name="danger" className="bg-danger-wash" />
                  <Swatch name="danger-ink" className="bg-danger-ink" />
                  <Swatch name="info" className="bg-info-wash" />
                  <Swatch name="info-ink" className="bg-info-ink" />
                </div>
              </Spec>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <Spec label="타입 스케일 (Pretendard, 본문 17px)">
                <div className="flex flex-col gap-1.5">
                  <p className="text-display">display 28 · 내일 아침 7시 40분</p>
                  <p className="text-title-1">title-1 24 · 박서연 님이 운전해요</p>
                  <p className="text-title-2">title-2 20 · 운전 장부</p>
                  <p className="text-title-3">title-3 17 · 이번 주</p>
                  <p className="text-body">body 17 · 결석한 날은 점수에 들어가지 않아요.</p>
                  <p className="text-sub text-ink-2">sub 15 · 보조 설명은 ink-2로 씁니다.</p>
                  <p className="text-caption text-ink-3">caption 13 · 오늘 21:00 마감</p>
                  <p className="text-label text-ink-3">label 12 · 탭 바 라벨</p>
                  <p className="text-numeral tabular-nums">2:14:09</p>
                </div>
              </Spec>
              <Spec label="모양과 깊이">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="grid size-16 place-items-center rounded-control bg-surface-2 text-caption text-ink-2">12</div>
                  <div className="grid size-20 place-items-center rounded-card border border-line bg-surface text-caption text-ink-2">16 + 헤어라인</div>
                  <div className="grid h-20 w-28 place-items-center rounded-sheet bg-surface text-caption text-ink-2 shadow-float">24 + float</div>
                  <div className="grid size-12 place-items-center rounded-chip bg-accent-wash-strong text-caption text-accent-ink">pill</div>
                  <div className="grid h-16 w-28 place-items-center rounded-card tone-inverse text-caption">inverse</div>
                </div>
              </Spec>
            </div>
          </Section>

          <Section id="button" title="Button" description="primary는 화면에 하나. 44px 기본, lg 52px는 페이지의 주 행동.">
            <Spec label="variant">
              <Row>
                <Button>크루 만들기</Button>
                <Button variant="secondary">내일 못 가요</Button>
                <Button variant="ghost">자세히</Button>
                <Button variant="danger">크루 나가기</Button>
              </Row>
            </Spec>
            <Spec label="size · icon">
              <Row>
                <Button size="sm" leadingIcon={<Plus />}>추가</Button>
                <Button size="md" leadingIcon={<Share2 />}>공유</Button>
                <Button size="lg" trailingIcon={<ChevronRight />}>다음</Button>
              </Row>
            </Spec>
            <Spec label="loading · disabled · fullWidth">
              <div className="flex flex-col gap-2">
                <Row>
                  <Button loading loadingLabel="저장 중">저장</Button>
                  <Button variant="secondary" loading loadingLabel="불러오는 중">불러오기</Button>
                  <Button disabled>비활성</Button>
                  <Button variant="secondary" disabled>비활성</Button>
                  <Button variant="ghost" disabled>비활성</Button>
                </Row>
                <Button size="lg" fullWidth onClick={fakeSave} loading={saving} loadingLabel="저장 중">
                  완료 기록
                </Button>
              </div>
            </Spec>
          </Section>

          <Section id="iconbutton" title="IconButton" description="label은 필수. 44px, lg는 52px.">
            <Spec label="variant · size · disabled">
              <Row>
                <IconButton label="공유" icon={<Share2 />} />
                <IconButton label="검색" icon={<Search />} variant="secondary" />
                <IconButton label="추가" icon={<Plus />} variant="primary" />
                <IconButton label="추가" icon={<Plus />} variant="primary" size="lg" />
                <IconButton label="삭제" icon={<Trash2 />} disabled />
              </Row>
            </Spec>
            <Spec label="Spinner">
              <Row>
                <Spinner label="불러오는 중" size="sm" />
                <Spinner label="불러오는 중" />
                <Spinner label="불러오는 중" size="lg" />
                <span className="text-accent-ink"><Spinner label="불러오는 중" /></span>
              </Row>
            </Spec>
          </Section>

          <Section id="badge" title="Badge" description="운행 상태: 예정 neutral · 운전자 필요 warn · 완료 success · 취소/결석 neutral. 색에는 항상 글리프나 낱말을 붙입니다.">
            <Spec label="variant (sm)">
              <Row>
                <Badge>예정</Badge>
                <Badge variant="brand">캡틴</Badge>
                <Badge variant="success" icon={<Check />}>완료</Badge>
                <Badge variant="warn" icon={<AlertTriangle />}>운전자 필요</Badge>
                <Badge variant="danger">마감 지남</Badge>
                <Badge variant="info">새 제안</Badge>
                <Badge icon={<UserX />}>결석</Badge>
              </Row>
            </Spec>
            <Spec label="md">
              <Row>
                <Badge size="md" variant="success" icon={<Check />}>운행 완료</Badge>
                <Badge size="md" variant="warn" icon={<AlertTriangle />}>운전자 필요</Badge>
                <Badge size="md">일시정지</Badge>
              </Row>
            </Spec>
          </Section>

          <Section id="chip" title="Chip · ChipGroup" description="요일 칩은 월부터 일까지, 다중 선택, 체크 없이 wash + 굵기. 필터 칩은 체크 글리프.">
            <Spec label="weekday group (multiple)">
              <ChipGroup label="출근 요일" options={weekdays} value={days} onChange={setDays} showCheck={false} />
            </Spec>
            <Spec label="single · sm · disabled · icon">
              <Row>
                <Chip selected>이번 주</Chip>
                <Chip>다음 주</Chip>
                <Chip size="sm" selected>출근</Chip>
                <Chip size="sm">퇴근</Chip>
                <Chip disabled>지난 주</Chip>
                <Chip icon={<Car />}>운전 가능</Chip>
              </Row>
            </Spec>
          </Section>

          <Section id="segmented" title="SegmentedControl" description="2~4개의 배타 선택. 방향키로 이동.">
            <Spec label="md">
              <SegmentedControl label="구간" options={SEGMENTS} value={segment} onChange={(v) => setSegment(v as typeof segment)} />
            </Spec>
            <Spec label="lg · inline">
              <SegmentedControl label="구간" size="lg" fullWidth={false} options={SEGMENTS} value={segment} onChange={(v) => setSegment(v as typeof segment)} />
            </Spec>
          </Section>

          <Section id="switch" title="Switch · Checkbox" description="행 전체가 44px 타깃. 켜짐/꺼짐은 위치와 체크 글리프로도 구분.">
            <Spec label="Switch">
              <div className="divide-y divide-line">
                <Switch checked={sw1} onCheckedChange={setSw1} label="전날 저녁 요약 알림" description="매일 20:00에 내일 계획을 보내요" />
                <Switch checked={sw2} onCheckedChange={setSw2} label="운전할 수 있어요" />
                <Switch checked disabled onCheckedChange={() => {}} label="비활성 (켜짐)" />
                <Switch checked={false} disabled onCheckedChange={() => {}} label="비활성 (꺼짐)" />
              </div>
            </Spec>
            <Spec label="Checkbox">
              <div className="divide-y divide-line">
                <Checkbox label="김도윤" description="나" defaultChecked />
                <Checkbox label="이하은" />
                <Checkbox label="최민재 (탑승 안 함)" disabled />
                <Checkbox label="박스 오른쪽 (명단형)" boxPosition="end" defaultChecked />
              </div>
            </Spec>
          </Section>

          <Section id="inputs" title="Input · TextArea · Select · TimeField" description="라벨은 위, 오류는 아래. placeholder는 형식만 보여줍니다.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="표시 이름" placeholder="김도윤" hint="크루원에게 보이는 이름이에요." defaultValue="김도윤" />
              <Input label="이메일" type="email" inputMode="email" placeholder="name@company.com" leading={<Mail />} />
              <Input label="초대 코드" inputMode="text" autoCapitalize="characters" placeholder="ABCD-12" defaultValue="7K3P" error="코드를 다시 확인해 주세요. 6자리예요." />
              <Input label="탑승 가능 좌석" type="number" inputMode="numeric" defaultValue={3} trailing={<span className="pr-2 text-sub text-ink-3">석</span>} />
              <Input label="비활성" disabled defaultValue="수정할 수 없어요" />
              <Input label="검색" labelHidden placeholder="주소나 역 이름" leading={<Search />} />
              <Select label="그룹 유형" defaultValue="company">
                <option value="company">회사</option>
                <option value="campus">대학</option>
                <option value="club">동호회</option>
                <option value="school">학부모 모임</option>
              </Select>
              <TimeField label="출발 시각" defaultValue="07:40" hint="5분 단위" />
              <TextArea label="픽업 메모" optionalLabel="(선택)" placeholder="정자역 3번 출구 앞, 10분 넘게 기다리지 않아요" wrapperClassName="sm:col-span-2" />
            </div>
          </Section>

          <Section id="card" title="Card · CardHeader" description="default는 헤어라인, tonal은 가라앉은 면, inverse는 '오늘 저녁' 카드 하나에만." wide>
            <div className="grid gap-3 sm:grid-cols-3">
              <Card>
                <CardHeader title="기본 카드" description="surface + line" action={<Button variant="ghost" size="sm">전체</Button>} />
                <p className="mt-3 text-sub text-ink-2">본문은 sub나 body.</p>
              </Card>
              <Card variant="tonal">
                <CardHeader title="톤 카드" description="surface-2, 테두리 없음" />
                <p className="mt-3 text-sub text-ink-2">그룹 안의 보조 블록에 씁니다.</p>
              </Card>
              <Card variant="inverse" padding="lg">
                <p className="text-sub text-ink-2">내일 아침</p>
                <p className="mt-1 text-title-2">박서연 님이 운전해요</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm">못 가요</Button>
                  <Button size="sm">운행 완료</Button>
                </div>
              </Card>
            </div>
          </Section>

          <Section id="list" title="List · ListItem" description="행 56px, 헤어라인은 행 사이에만. 선택은 wash + 체크 글리프.">
            <List>
              <ListItem leading={<Avatar name="박서연" />} title="박서연" description="캡틴 · 운전 가능" trailing={<Badge variant="brand">캡틴</Badge>} onClick={() => {}} />
              <ListItem leading={<Avatar name="김도윤" />} title="김도윤" description="운전 가능 · 좌석 3" href="#member" onClick={(e) => e.preventDefault()} />
              <ListItem leading={<Avatar name="이하은" />} title="이하은" description="예비 운전자" trailing={<Check aria-hidden="true" className="size-5 text-accent-ink" />} selected onClick={() => {}} />
              <ListItem leading={<Avatar name="최민재" />} title="최민재" description="탑승만 해요" trailing="좌석 없음" disabled />
              <ListItem leading={<span className="grid size-10 place-items-center rounded-chip bg-surface-2"><Users className="size-5" /></span>} title="아주 긴 제목은 한 줄에서 말줄임표로 잘립니다 아주 긴 제목은 한 줄에서" description="설명도 두 줄까지만" chevron onClick={() => {}} />
            </List>
          </Section>

          <Section id="avatar" title="Avatar · AvatarStack" description="한국 이름은 이름(성 제외)을, 영문은 머리글자를. 정체성 틴트 5종은 아바타에만.">
            <Spec label="size · tint">
              <Row>
                <Avatar name="박서연" size="xs" />
                <Avatar name="김도윤" size="sm" />
                <Avatar name="이하은" size="md" />
                <Avatar name="최민재" size="lg" />
                <Avatar name="정우진" size="xl" />
                <Avatar name="Alex Kim" size="md" />
                <Avatar name="박서연" size="md" tint="neutral" />
                <Avatar name="박서연" size="md" marker={<Car />} />
              </Row>
            </Spec>
            <Spec label="stack">
              <Row>
                <AvatarStack people={members} size="xs" />
                <AvatarStack people={members} size="sm" max={3} />
                <AvatarStack people={[...members, { name: '정우진' }, { name: '한지민' }]} size="md" max={4} />
              </Row>
            </Spec>
          </Section>

          <Section id="nav" title="TopBar · BottomNav" description="TopBar는 화면 이름, 홈에서는 그룹 스위처. 탭은 5개 고정, 활성은 wash + 진한 글리프." wide>
            <div className="grid gap-4 md:grid-cols-2">
              <Spec label="TopBar: back + action">
                <div className="overflow-hidden rounded-card border border-line">
                  <TopBar title="크루 설정" onBack={() => {}} backLabel="뒤로" trailing={<IconButton label="공유" icon={<Share2 />} />} sticky={false} />
                </div>
              </Spec>
              <Spec label="TopBar: group switcher">
                <div className="overflow-hidden rounded-card border border-line">
                  <TopBar title="다온테크 판교 출근 카풀" onTitleClick={() => {}} titleActionLabel="그룹 바꾸기" trailing={<><IconButton label="검색" icon={<Search />} /><IconButton label="공유" icon={<Share2 />} /></>} sticky={false} />
                </div>
              </Spec>
              <Spec label="BottomNav (events에 배지 2)" className="md:col-span-2">
                <div className="relative h-20 overflow-hidden rounded-card border border-line bg-canvas">
                  <BottomNav items={NAV} activeKey="home" label="주요 메뉴" position="absolute" />
                </div>
              </Spec>
            </div>
          </Section>

          <Section id="banner" title="Banner" description="톤 면 + 글리프. 옆줄 없음. warn/danger는 role=alert.">
            <Banner variant="info" title="홈 화면에 추가하면 알림을 받을 수 있어요" action={<Button variant="secondary" size="sm">방법 보기</Button>} onDismiss={() => {}} dismissLabel="닫기">
              iPhone은 공유 버튼에서 '홈 화면에 추가'를 누르세요.
            </Banner>
            <Banner variant="warn" title="카카오톡 안에서는 Google 로그인이 되지 않아요" action={<Button variant="secondary" size="sm">외부 브라우저로 열기</Button>}>
              오른쪽 위 메뉴의 '다른 브라우저로 열기'를 누르세요.
            </Banner>
            <Banner variant="success">초대 링크를 복사했어요.</Banner>
            <Banner variant="danger" title="저장하지 못했어요">네트워크를 확인한 뒤 다시 시도해 주세요.</Banner>
          </Section>

          <Section id="empty" title="EmptyState" description="무엇이 없는지, 다음에 무엇을 하면 되는지.">
            <Card padding="none">
              <EmptyState icon={<Users />} title="아직 크루가 없어요" description="방향과 시간이 맞는 멤버를 찾아 첫 크루를 제안해 보세요." action={<Button leadingIcon={<Plus />}>크루 제안하기</Button>} />
            </Card>
            <Card variant="tonal" padding="none">
              <EmptyState compact icon={<Inbox />} title="이번 주 운행이 없어요" description="주간 템플릿을 만들면 자동으로 채워져요." />
            </Card>
          </Section>

          <Section id="skeleton" title="Skeleton" description="최종 레이아웃 모양대로. 1초 이내 로딩은 스피너 대신 스켈레톤.">
            <Card>
              <div className="flex items-center gap-3">
                <Skeleton variant="circle" className="size-10" />
                <div className="flex-1">
                  <Skeleton variant="text" lines={2} />
                </div>
              </div>
              <Skeleton className="mt-4 h-24 w-full" />
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Skeleton className="h-11" />
                <Skeleton className="h-11" />
                <Skeleton className="h-11" />
              </div>
            </Card>
          </Section>

          <Section id="stat" title="Stat" description="숫자는 tabular. 추정값은 hint에 '추정'이라고 적습니다.">
            <Card>
              <div className="grid grid-cols-3 gap-3">
                <Stat value="18회" label="이번 달 운행" />
                <Stat value="92%" label="참여율" hint="지난달 88%" />
                <Stat value="146km" label="절감 거리" hint="추정값" />
              </div>
            </Card>
            <Card variant="tonal">
              <Stat size="lg" value="2:14:09" label="변경 마감까지" hint="오늘 21:00 마감" align="center" />
            </Card>
          </Section>

          <Section id="ledger" title="LedgerBar" description="0을 가운데 둔 균형 막대. +는 더 운전, -는 더 탑승. 다음 운전자는 highlight.">
            <Card>
              <div className="divide-y divide-line">
                {members.map((m, i) => (
                  <LedgerBar
                    key={m.uid}
                    name={m.name}
                    value={m.balance}
                    max={max}
                    label={formatBalance(m.balance)}
                    leading={<Avatar name={m.name} marker={i === 2 ? <Car /> : undefined} />}
                    detail={i === 2 ? '다음 운전 차례' : m.detail}
                    highlight={i === 2}
                  />
                ))}
                <LedgerBar name="정우진" value={0} max={max} label={formatBalance(0)} leading={<Avatar name="정우진" />} detail="새 멤버" />
              </div>
            </Card>
          </Section>

          <Section id="share" title="ShareButtons" description="복사 + Web Share(지원 기기) + QR 슬롯. 복사 후 2초 동안 라벨이 바뀝니다.">
            <ShareButtons
              url="https://carpool.example/join/7K3P-Q2"
              title="다온테크 판교 출근 카풀"
              text="카풀 그룹에 초대해요"
              labels={{ copy: '링크 복사', copied: '복사했어요', share: '공유하기' }}
              qr={<QrPlaceholder />}
              code="7K3P-Q2"
              onCopied={() => showToast('초대 링크를 복사했어요', 'success')}
            />
          </Section>

          <Section id="overlays" title="Sheet · Dialog · Toast" description="네이티브 dialog 위에 만든 바텀시트와 대화상자. 초기 포커스는 패널에 두어 Enter가 아무 버튼도 누르지 않아요.">
            <Row>
              <Button variant="secondary" onClick={() => setSheetOpen(true)}>시트 열기</Button>
              <Button variant="secondary" onClick={() => setDialogOpen(true)}>대화상자 열기</Button>
              <Button variant="ghost" onClick={() => showToast('내일 못 간다고 표시했어요')}>info 토스트</Button>
              <Button variant="ghost" onClick={() => showToast('운행을 기록했어요', 'success')}>success 토스트</Button>
              <Button variant="ghost" onClick={() => showToast('저장하지 못했어요. 다시 시도해 주세요.', 'error')}>error 토스트</Button>
            </Row>
            <Spec label="SheetPanel (정적 렌더)">
              <div className="overflow-hidden rounded-t-sheet border border-line bg-surface">
                <SheetPanel
                  title="내일 못 가요"
                  description="10월 27일 (화) 출근 운행에서 빠질게요."
                  closeLabel="닫기"
                  onClose={() => {}}
                  footer={<div className="grid grid-cols-2 gap-2"><Button variant="secondary">취소</Button><Button>빠지기</Button></div>}
                >
                  <p className="text-body text-ink-2">마감(오늘 21:00) 전이라 크루원에게 바로 알리고, 운전 순번은 그대로 유지돼요.</p>
                </SheetPanel>
              </div>
            </Spec>
            <Sheet
              open={sheetOpen}
              onClose={() => setSheetOpen(false)}
              title="내일 못 가요"
              description="10월 27일 (화) 출근 운행에서 빠질게요."
              closeLabel="닫기"
              footer={<div className="grid grid-cols-2 gap-2"><Button variant="secondary" onClick={() => setSheetOpen(false)}>취소</Button><Button onClick={() => { setSheetOpen(false); showToast('내일 못 간다고 표시했어요'); }}>빠지기</Button></div>}
            >
              <p className="text-body text-ink-2">마감(오늘 21:00) 전이라 크루원에게 바로 알리고, 운전 순번은 그대로 유지돼요.</p>
              <TextArea label="한마디" optionalLabel="(선택)" placeholder="재택이라 안 가요" wrapperClassName="mt-4" />
            </Sheet>
            <Dialog
              open={dialogOpen}
              onClose={() => setDialogOpen(false)}
              role="alertdialog"
              title="이 크루를 일시정지할까요?"
              description="운행 계획이 멈추고 장부는 그대로 남아요. 언제든 다시 켤 수 있어요."
              actions={<><Button variant="secondary" onClick={() => setDialogOpen(false)}>취소</Button><Button variant="danger" onClick={() => { setDialogOpen(false); showToast('크루를 일시정지했어요'); }}>일시정지</Button></>}
            />
          </Section>
        </div>

        <h2 className="mt-14 text-title-1 text-ink">화면 목업</h2>
        <p className="mt-1 max-w-[60ch] text-sub text-ink-2">키트만으로 조합한 네 화면. 390px 프레임, 한국어 샘플 데이터.</p>
        <div className="-mx-4 mt-6 grid grid-cols-1 justify-items-center gap-8 sm:mx-0 lg:grid-cols-2">
          <PhoneFrame id="mock-home" label="그룹 홈 (탑승자 시점)">
            <GroupHomeScreen />
          </PhoneFrame>
          <PhoneFrame id="mock-complete" label="운행 완료 시트 (운전자 시점)">
            <TripCompletionMock />
          </PhoneFrame>
          <PhoneFrame id="mock-ledger" label="크루 장부">
            <CrewLedgerScreen />
          </PhoneFrame>
          <PhoneFrame id="mock-signin" label="로그인 (카카오톡 인앱 브라우저)">
            <SignInScreen />
          </PhoneFrame>
        </div>
      </main>
      <ToastContainer aboveNav={false} />
    </div>
  );
}
