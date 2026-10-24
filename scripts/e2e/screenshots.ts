/**
 * Screenshot run for docs/screenshots: seeds a realistic KR group (four members, one active crew, a
 * completed trip, an absence) through the real UI, then captures every main screen at 390x844 and
 * 1280x900. Run from the repo root: `bun scripts/e2e/screenshots.ts` (needs Java 21+, see JAVA_HOME).
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ORIGIN_A, ORIGIN_B, PROJECT_ID, openPage, signInWithEmailLink, startStack, stopStack, type Page } from './harness';

const AUTH_EMULATOR = 'http://127.0.0.1:9099';
interface OobCode { email: string; requestType: string; oobLink: string }
async function oobCodes(email: string): Promise<OobCode[]> {
  const res = await fetch(`${AUTH_EMULATOR}/emulator/v1/projects/${PROJECT_ID}/oobCodes`);
  const body = (await res.json()) as { oobCodes: OobCode[] };
  return body.oobCodes.filter((c) => c.email === email && c.requestType === 'EMAIL_SIGNIN');
}

/** Like the harness sign-in, but waits for a link newer than the ones already issued (re-sign-in of the same email). */
async function signInFresh(page: Page, origin: string, email: string, next: string): Promise<void> {
  const before = (await oobCodes(email)).length;
  await page.goto(`${origin}/signin?next=${encodeURIComponent(next)}`);
  await page.fill('[data-testid="signin-email"]', email);
  await page.click('[data-testid="signin-email-submit"]');
  const deadline = Date.now() + 15_000;
  let link = '';
  for (;;) {
    const codes = await oobCodes(email);
    if (codes.length > before) {
      link = codes[codes.length - 1].oobLink;
      break;
    }
    if (Date.now() > deadline) throw new Error(`no fresh sign-in link for ${email}`);
    await Bun.sleep(300);
  }
  const url = new URL(link);
  const finish = new URL(url.searchParams.get('continueUrl') ?? `${origin}/signin/finish`);
  for (const key of ['mode', 'oobCode', 'apiKey', 'lang']) {
    const v = url.searchParams.get(key);
    if (v) finish.searchParams.set(key, v);
  }
  await page.goto(finish.toString());
  // wait until the finish page has signed the user in (it leaves /signin/finish on success)
  const settled = Date.now() + 20_000;
  while ((await page.eval<string>('location.pathname')) === '/signin/finish') {
    if (Date.now() > settled) {
      await page.shot('signin-stuck');
      throw new Error(`sign-in did not finish for ${email}: ${(await page.text()).slice(0, 300)}`);
    }
    await Bun.sleep(200);
  }
}

const OUT = join(import.meta.dir, '..', '..', 'docs', 'screenshots');
const WORK = join(import.meta.dir, '..', '..', '.omo', 'qa', 'screens');
const JAVA_HOME = 'C:\\Users\\sdlab\\.cache\\open-carpool-tools\\jdk-21.0.12.1+1-jre';
const PORTS = [5173, 8080, 9099] as const;

const pathKey = Object.keys(process.env).find((k) => k.toLowerCase() === 'path') ?? 'PATH';
process.env[pathKey] = `${JAVA_HOME}\\bin;${process.env[pathKey] ?? ''}`;
process.env.JAVA_HOME = JAVA_HOME;
// Another editor saving files mid-run would trigger HMR full reloads in the capture browsers.
process.env.DISABLE_HMR = 'true';

const seoulToday = (): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const addDays = (date: string, days: number): string => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const isoWeekday = (date: string): number => [7, 1, 2, 3, 4, 5, 6][new Date(`${date}T00:00:00Z`).getUTCDay()];
/**
 * The seed crew's departure time. 운행 완료 is offered only once the leg has departed, so the captures need a
 * time already in the past today (KST): the realistic 07:40 when it has passed, otherwise one hour ago.
 */
const seedOutTime = (): string => {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
  if (hour > 7 || (hour === 7 && Number(minute) >= 41)) return '07:40';
  return hour >= 1 ? `${String(hour - 1).padStart(2, '0')}:${minute}` : '00:00';
};

async function portInUse(port: number): Promise<boolean> {
  try {
    const socket = await Bun.connect({ hostname: '127.0.0.1', port, socket: { data() {} } });
    socket.end();
    return true;
  } catch {
    return false;
  }
}
async function waitPortsFree(timeoutMs: number): Promise<number[]> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const busy = (await Promise.all(PORTS.map(async (p) => ((await portInUse(p)) ? p : null)))).filter((p) => p !== null);
    if (busy.length === 0 || Date.now() > deadline) return busy;
    await Bun.sleep(500);
  }
}

async function spaGo(page: Page, path: string): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.eval(`(() => { history.pushState({}, '', ${JSON.stringify(path)}); dispatchEvent(new PopStateEvent('popstate')); })()`);
    await Bun.sleep(300);
    if ((await page.eval<string>('location.pathname')) === path) return;
    await Bun.sleep(700);
  }
  throw new Error(`could not navigate to ${path}; at ${await page.eval<string>('location.href')}`);
}
async function waitGone(page: Page, selector: string, timeoutMs = 20_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (await page.eval<boolean>(`!!document.querySelector(${JSON.stringify(selector)})`)) {
    if (Date.now() > deadline) throw new Error(`${selector} still present`);
    await Bun.sleep(200);
  }
}
async function waitForInText(page: Page, selector: string, needle: string, timeoutMs = 20_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const text = await page.text(selector);
    if (text.includes(needle)) return text;
    if (Date.now() > deadline) throw new Error(`"${selector}" never contained "${needle}"; last: "${text}"`);
    await Bun.sleep(200);
  }
}
const isKo = async (page: Page): Promise<boolean> => (await page.eval<string>('navigator.language')).toLowerCase().startsWith('ko');
const savedText = async (page: Page): Promise<string> => ((await isKo(page)) ? '저장했어요' : 'Saved');
const GROUP_NAME = '다온테크 판교 출근 카풀';

interface ProfileSpec {
  name: string;
  drives: boolean;
  seats?: number;
  area: string;
  days: number[];
  out: string;
  back: string;
}

async function pressed(page: Page, selector: string): Promise<boolean> {
  return page.eval<boolean>(`document.querySelector(${JSON.stringify(selector)})?.getAttribute('aria-pressed') === 'true'`);
}

async function saveProfile(page: Page, gid: string, spec: ProfileSpec): Promise<void> {
  await spaGo(page, `/g/${gid}/profile`);
  await page.waitFor('[data-testid="profile-display-name"]');
  await page.fill('[data-testid="profile-display-name"]', spec.name);
  await page.fill('[data-testid="profile-area-query"]', spec.area);
  await page.click('[data-testid="profile-area-search"]');
  await page.click('[data-testid="profile-area-result"]');
  const drives = await page.eval<boolean>(`document.querySelector('[data-testid="profile-can-drive"]').getAttribute('aria-checked') === 'true'`);
  if (drives !== spec.drives) await page.click('[data-testid="profile-can-drive"]');
  if (spec.drives) await page.fill('[data-testid="profile-seats"]', String(spec.seats ?? 3));
  for (const d of [1, 2, 3, 4, 5, 6, 7]) {
    const want = spec.days.includes(d);
    if ((await pressed(page, `[data-testid="profile-day-${d}"]`)) !== want) await page.click(`[data-testid="profile-day-${d}"]`);
  }
  for (const d of spec.days) {
    await page.fill(`[data-testid="profile-out-${d}"]`, spec.out);
    await page.fill(`[data-testid="profile-back-${d}"]`, spec.back);
  }
  await page.click('[data-testid="profile-save"]');
  await page.waitForText(await savedText(page));
}

async function signOut(page: Page): Promise<void> {
  await spaGo(page, '/me');
  await page.click('[data-testid="signout"]');
  await page.waitFor('[data-testid="signin-email"]');
}

async function joinAs(page: Page, email: string, code: string, gid: string, spec: ProfileSpec): Promise<void> {
  // first sign-in: the invite landing asks for the name before 참여하기
  await signInWithEmailLink(page, ORIGIN_B, email, `/join/${code}`, spec.name);
  await page.click('[data-testid="join-submit"]');
  await page.waitFor('[data-testid="profile-display-name"]', 20_000);
  await saveProfile(page, gid, spec);
}

async function acceptCrew(page: Page, gid: string, cid: string): Promise<void> {
  await spaGo(page, `/g/${gid}/crews`);
  try {
    await page.click(`[data-testid="crew-card-${cid}"] [data-testid="crew-accept"]`);
  } catch (e) {
    await page.shot('accept-failed');
    console.log(`accept failed at ${await page.eval<string>('location.href')}: ${(await page.text()).replace(/\\s+/g, ' ').slice(0, 400)}`);
    throw e;
  }
  await waitGone(page, `[data-testid="crew-card-${cid}"] [data-testid="crew-accept"]`);
}

const shots: string[] = [];
async function shot(page: Page, prefix: string, name: string): Promise<void> {
  await Bun.sleep(450);
  const path = join(OUT, `${prefix}-${name}.png`);
  await Bun.write(path, await page.view.screenshot());
  shots.push(path);
  console.log(`shot ${prefix}-${name}`);
}
async function closeTopDialog(page: Page): Promise<void> {
  await page.eval(`(() => { const d = [...document.querySelectorAll('dialog[open]')].at(-1); d?.dispatchEvent(new Event('cancel', { cancelable: true })); })()`);
  await Bun.sleep(350);
}
async function scrollEnd(page: Page): Promise<void> {
  await page.eval('window.scrollTo(0, document.documentElement.scrollHeight)');
  await Bun.sleep(250);
}

/** Every main screen from A's (captain) point of view in one viewport. */
async function captureAll(page: Page, prefix: string, ctx: { gid: string; cid: string; code: string; today: string }): Promise<void> {
  const { gid, cid, code, today } = ctx;
  // the docs set is light; the OS of the capture machine may prefer dark
  await page.eval("(() => { localStorage.setItem('oc-theme', 'light'); delete document.documentElement.dataset.theme; })()");
  const safe = async (name: string, run: () => Promise<void>) => {
    try {
      await run();
    } catch (e) {
      console.log(`skip ${prefix}-${name}: ${String(e).slice(0, 200)}`);
    }
  };
  await safe('my-groups', async () => {
    await spaGo(page, '/');
    await page.waitFor('[data-testid="my-groups"]');
    await shot(page, prefix, 'my-groups');
  });
  await safe('create-group', async () => {
    await spaGo(page, '/groups/new');
    await page.waitFor('[data-testid="group-name"]');
    await page.fill('[data-testid="group-name"]', '다온테크 판교 출근 카풀');
    await shot(page, prefix, 'create-group-1');
    await page.click('[data-testid="group-next"]');
    await page.waitFor('[data-testid="group-destination-query"]');
    await page.fill('[data-testid="group-destination-query"]', '판교역 1번 출구');
    await page.click('[data-testid="group-destination-search"]');
    await page.click('[data-testid="group-destination-result"]');
    await shot(page, prefix, 'create-group-2');
    await page.click('[data-testid="group-next"]');
    await page.waitFor('[data-testid="group-create-submit"]');
    await shot(page, prefix, 'create-group-3');
  });
  await safe('join-member', async () => {
    // signed in and already a member: the landing says so instead of offering 참여하기 again
    await spaGo(page, `/join/${code}`);
    await page.waitFor('[data-testid="join-already-member"]');
    await shot(page, prefix, 'join-member');
  });
  await safe('home', async () => {
    await spaGo(page, `/g/${gid}`);
    await page.waitFor('[data-testid="next-trip-card"]', 20_000);
    await Bun.sleep(800);
    await shot(page, prefix, 'home');
    await scrollEnd(page);
    await shot(page, prefix, 'home-end');
    await page.eval('window.scrollTo(0, 0)');
    await page.click('[data-testid="home-invite"]');
    await page.waitFor('dialog[open]');
    await Bun.sleep(600);
    await shot(page, prefix, 'home-invite');
    await closeTopDialog(page);
    await page.click('header button[aria-haspopup="dialog"]');
    await page.waitFor('dialog[open]');
    await shot(page, prefix, 'home-switcher');
    await closeTopDialog(page);
    await page.click('[data-testid="nav-more"]');
    await page.waitFor('dialog[open]');
    await shot(page, prefix, 'more');
    await closeTopDialog(page);
  });
  await safe('crews', async () => {
    await spaGo(page, `/g/${gid}/crews`);
    await page.waitFor(`[data-testid="crew-card-${cid}"]`);
    await shot(page, prefix, 'crews');
    await page.click('[data-testid="crew-new"]:not([disabled])');
    await page.waitFor('[data-testid="crew-form"]');
    await page.fill('[data-testid="crew-name"]', '야탑 8시 크루');
    await shot(page, prefix, 'crew-new');
  });
  await safe('crew', async () => {
    await spaGo(page, `/g/${gid}/crews/${cid}`);
    await page.waitFor('[data-testid="crew-title"]');
    await Bun.sleep(1200);
    await shot(page, prefix, 'crew');
    await scrollEnd(page);
    await shot(page, prefix, 'crew-end');
    await page.eval('window.scrollTo(0, 0)');
    const done = `[data-testid="trip-card-${today}_back"] [data-testid="trip-done"]`;
    if (await page.eval<boolean>(`!!document.querySelector(${JSON.stringify(done)})`)) {
      await page.click(done);
      await page.waitFor('dialog[open]');
      await Bun.sleep(600);
      await shot(page, prefix, 'trip-done');
      await closeTopDialog(page);
    }
  });
  await safe('members', async () => {
    await spaGo(page, `/g/${gid}/members`);
    await page.waitFor('[data-testid="member-list"]');
    await shot(page, prefix, 'members');
    await page.click('[data-testid="member-manage"]');
    await page.waitFor('dialog[open]');
    await shot(page, prefix, 'member-manage');
    await closeTopDialog(page);
  });
  await safe('profile', async () => {
    await spaGo(page, `/g/${gid}/profile`);
    await page.waitFor('[data-testid="profile-save"]');
    await shot(page, prefix, 'profile');
    await scrollEnd(page);
    await shot(page, prefix, 'profile-end');
  });
  await safe('settings', async () => {
    await spaGo(page, `/g/${gid}/settings`);
    await page.waitFor('[data-testid="invite-qr"] img', 20_000);
    await shot(page, prefix, 'settings');
    await scrollEnd(page);
    await shot(page, prefix, 'settings-end');
  });
  await safe('me', async () => {
    await spaGo(page, '/me');
    await page.waitFor('[data-testid="me-save"]');
    await shot(page, prefix, 'me');
  });
  await safe('admin', async () => {
    await spaGo(page, `/g/${gid}/admin`);
    await page.waitFor('[data-testid="admin-stats"]', 20_000);
    await page.waitFor(`[data-testid="admin-crew-${cid}"]`);
    await Bun.sleep(400);
    await shot(page, prefix, 'admin');
  });
  await safe('events', async () => {
    await spaGo(page, `/g/${gid}/events`);
    await page.waitFor('[data-testid="event-new"]', 20_000);
    await Bun.sleep(400);
    await shot(page, prefix, 'events');
  });
  await safe('not-found', async () => {
    await spaGo(page, '/nowhere');
    await Bun.sleep(300);
    await shot(page, prefix, 'not-found');
  });
  await safe('dark', async () => {
    await page.eval("document.documentElement.dataset.theme = 'dark'");
    await spaGo(page, `/g/${gid}`);
    await page.waitFor('[data-testid="next-trip-card"]', 20_000);
    await Bun.sleep(600);
    await shot(page, prefix, 'home-dark');
    await spaGo(page, `/g/${gid}/crews/${cid}`);
    await page.waitFor('[data-testid="crew-title"]');
    await Bun.sleep(900);
    await shot(page, prefix, 'crew-dark');
    await page.eval('delete document.documentElement.dataset.theme');
  });
  await page.eval("localStorage.removeItem('oc-theme')");
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  mkdirSync(WORK, { recursive: true });
  const busy = await waitPortsFree(0);
  if (busy.length > 0) throw new Error(`ports already in use: ${busy.join(', ')}`);
  await startStack();
  const a = openPage('A', 430, 1400, WORK);
  const b = openPage('B', 430, 1400, WORK);
  const today = seoulToday();
  const crewDays = [...new Set([1, 2, 3, 4, 5, isoWeekday(today), isoWeekday(addDays(today, 1))])].sort();
  let gid = '';
  let code = '';
  let cid = '';
  const uids: Record<string, string> = {};
  try {
    // --- seed -------------------------------------------------------------
    await signInWithEmailLink(a, ORIGIN_A, 'seoyeon@daon.kr', '/groups/new', '박서연');
    await a.waitFor('[data-testid="group-name"]', 30_000);
    await a.fill('[data-testid="group-name"]', GROUP_NAME);
    await a.fill('[data-testid="group-country"]', 'KR');
    await a.click('[data-testid="group-next"]');
    await a.fill('[data-testid="group-destination-query"]', '판교역 1번 출구');
    await a.click('[data-testid="group-destination-search"]');
    await a.click('[data-testid="group-destination-result"]');
    await a.click('[data-testid="group-next"]');
    await a.click('[data-testid="group-create-submit"]');
    await a.waitFor('[data-testid="invite-code"]', 20_000);
    gid = (await a.eval<string>('location.pathname')).split('/')[2] ?? '';
    code = (await a.text('[data-testid="invite-code"]')).trim();
    console.log(`group ${gid} code ${code}`);
    await saveProfile(a, gid, { name: '박서연', drives: true, seats: 3, area: '분당구 정자동', days: [1, 2, 3, 4, 5], out: '07:40', back: '18:30' });

    await joinAs(b, 'doyun@daon.kr', code, gid, { name: '김도윤', drives: true, seats: 3, area: '분당구 수내동', days: [1, 2, 3, 4, 5], out: '07:45', back: '18:30' });
    await signOut(b);
    await joinAs(b, 'haeun@daon.kr', code, gid, { name: '이하은', drives: false, area: '분당구 정자동', days: [1, 2, 3, 4, 5], out: '07:40', back: '18:40' });
    await signOut(b);
    await joinAs(b, 'minjae@daon.kr', code, gid, { name: '최민재', drives: false, area: '분당구 금곡동', days: [1, 2, 3, 4, 5], out: '07:40', back: '18:30' });

    // A proposes the crew with everyone
    await spaGo(a, `/g/${gid}/crews`);
    await a.click('[data-testid="crew-new"]:not([disabled])');
    await a.waitFor('[data-testid="crew-form"]');
    const boxes = await a.eval<{ uid: string; name: string; disabled: boolean }[]>(`[...document.querySelectorAll('input[data-testid^="crew-member-"]')].map((el) => ({ uid: el.dataset.testid.slice('crew-member-'.length), name: el.closest('label').innerText.split('\\n')[0], disabled: el.disabled }))`);
    for (const box of boxes) {
      uids[box.name.replace(/ \(.*\)$/, '')] = box.uid;
      if (!box.disabled) await a.click(`[data-testid="crew-member-${box.uid}"]`);
    }
    await a.fill('[data-testid="crew-name"]', '분당 7시 40분 크루');
    for (const d of [1, 2, 3, 4, 5, 6, 7]) {
      const want = crewDays.includes(d);
      if ((await pressed(a, `[data-testid="crew-day-${d}"]`)) !== want) await a.click(`[data-testid="crew-day-${d}"]`);
    }
    const outTime = seedOutTime();
    await a.fill('[data-testid="crew-out-time"]', outTime);
    await a.fill('[data-testid="crew-back-time"]', '18:30');
    await a.fill('[data-testid="crew-pickup-note"]', '정자역 3번 출구 앞');
    await a.fill('[data-testid="crew-wait-limit"]', '10');
    await a.click('[data-testid="crew-create-submit"]');
    await waitGone(a, '[data-testid="crew-form"]');
    cid = await a.eval<string>(`document.querySelector('li[data-testid^="crew-card-"]').dataset.testid.slice('crew-card-'.length)`);
    console.log(`crew ${cid}; uids ${JSON.stringify(uids)}`);

    // everyone accepts (B view cycles through the three members)
    await acceptCrew(b, gid, cid); // 최민재
    await signOut(b);
    await signInFresh(b, ORIGIN_B, 'haeun@daon.kr', `/g/${gid}/crews`);
    await acceptCrew(b, gid, cid);
    await signOut(b);
    await signInFresh(b, ORIGIN_B, 'doyun@daon.kr', `/g/${gid}/crews`);
    await acceptCrew(b, gid, cid);
    await waitForInText(b, `[data-testid="crew-card-${cid}"] [data-testid="crew-card-status"]`, (await isKo(b)) ? '운영 중' : 'Active');

    // the plan appears once a member opens the crew; the captain records today's morning trip
    await spaGo(a, `/g/${gid}/crews/${cid}`);
    await a.waitFor('[data-testid="crew-title"]', 20_000);
    const todayOut = `[data-testid="trip-card-${today}_out"]`;
    await a.waitFor(todayOut, 30_000);
    console.log(`crew out time ${outTime}; today's out trip planned`);
    // Before it is recorded: the driver's Home on trip day shows 운전 못 해요 and 운행 완료 side by side.
    const m = openPage('M', 390, 844, WORK);
    const d = openPage('D', 1280, 900, WORK);
    for (const [page, prefix] of [[m, 'mobile'], [d, 'desktop']] as const) {
      await page.goto(`${ORIGIN_A}/g/${gid}`);
      await page.waitFor('[data-testid="group-home-title"]', 30_000);
      await page.eval("(() => { localStorage.setItem('oc-theme', 'light'); delete document.documentElement.dataset.theme; })()");
      await page.waitFor('[data-testid="next-trip-card"]', 20_000);
      await Bun.sleep(800);
      if (await page.eval<boolean>('!!document.querySelector(\'[data-testid="next-trip-card"] [data-testid="trip-done"]\')')) {
        await shot(page, prefix, 'home-trip-day');
      } else {
        console.log(`skip ${prefix}-home-trip-day: A does not drive today's departed leg`);
      }
    }
    if (await a.eval<boolean>(`!!document.querySelector('${todayOut} [data-testid="trip-done"]')`)) {
      await a.click(`${todayOut} [data-testid="trip-done"]`);
      await a.click(`${todayOut} [data-testid="trip-done-confirm"]`);
      // the ledger write waits for the 10 s undo window
      await a.waitFor(`${todayOut} [data-testid="trip-completed"]`, 30_000);
    }
    // 김도윤 cannot make the day after tomorrow
    const later = `[data-testid="trip-card-${addDays(today, 2)}_out"]`;
    await spaGo(b, `/g/${gid}/crews/${cid}`);
    await b.waitFor('[data-testid="crew-title"]', 20_000);
    if (await b.eval<boolean>(`!!document.querySelector('${later} [data-testid="trip-absent-toggle"]')`)) {
      await b.click(`${later} [data-testid="trip-absent-toggle"]`);
      await b.click('[data-testid="trip-absent-confirm"]');
      await Bun.sleep(1500);
    }
    await a.shot('seeded');

    // --- capture ----------------------------------------------------------
    const ctx = { gid, cid, code, today };
    try {
      await m.goto(`${ORIGIN_A}/g/${gid}`);
      await m.waitFor('[data-testid="group-home-title"]', 30_000);
      await captureAll(m, 'mobile', ctx);
      await d.goto(`${ORIGIN_A}/g/${gid}`);
      await d.waitFor('[data-testid="group-home-title"]', 30_000);
      await captureAll(d, 'desktop', ctx);
    } finally {
      m.close();
      d.close();
    }
    // sign-in screens from B's origin after signing out
    await signOut(b);
    const sm = openPage('SM', 390, 844, WORK);
    const sd = openPage('SD', 1280, 900, WORK);
    try {
      for (const [page, prefix] of [[sm, 'mobile'], [sd, 'desktop']] as const) {
        await page.goto(`${ORIGIN_B}/signin`);
        await page.waitFor('[data-testid="signin-email"]');
        await page.eval('delete document.documentElement.dataset.theme');
        await shot(page, prefix, 'signin');
        // the shared invite link, opened signed out: group name first, sign-in inline below it
        await page.goto(`${ORIGIN_B}/join/${code}?name=${encodeURIComponent(GROUP_NAME)}`);
        await page.waitFor('[data-testid="join-group-name"]');
        await page.waitFor('[data-testid="signin-email"]');
        await page.eval('delete document.documentElement.dataset.theme');
        await shot(page, prefix, 'join');
      }
    } finally {
      sm.close();
      sd.close();
    }
  } finally {
    a.close();
    b.close();
  }
}

let failed = false;
try {
  await main();
} catch (e) {
  failed = true;
  console.error(e);
} finally {
  await stopStack();
  const busy = await waitPortsFree(20_000);
  console.log(busy.length === 0 ? `ports ${PORTS.join('/')} free` : `PORTS STILL IN USE: ${busy.join(', ')}`);
  console.log(`shots: ${shots.length}`);
  if (failed || busy.length > 0) process.exitCode = 1;
}
