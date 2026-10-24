/**
 * Real-browser E2E harness: Firebase emulators + Vite dev server + Bun.WebView.
 * Run with `bun scripts/e2e/happy-path.ts` (needs Java 21+ on PATH for the Firestore emulator).
 *
 * Two users are isolated by origin: user A uses http://localhost:5173, user B http://127.0.0.1:5173,
 * so their Firebase Auth state (IndexedDB) never mixes.
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

export const PROJECT_ID = 'demo-open-carpool';
export const ORIGIN_A = 'http://localhost:5173';
export const ORIGIN_B = 'http://127.0.0.1:5173';
const AUTH_EMULATOR = 'http://127.0.0.1:9099';

type Proc = ReturnType<typeof Bun.spawn>;
const procs: Proc[] = [];

async function waitForHttp(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const up = await fetch(url).then((res) => res.status < 500, () => false);
    if (up) return;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${url}`);
    await Bun.sleep(500);
  }
}

export async function startStack(): Promise<void> {
  const isWin = process.platform === 'win32';
  const npx = isWin ? 'npx.cmd' : 'npx';
  procs.push(
    Bun.spawn([npx, 'firebase', 'emulators:start', '--only', 'auth,firestore', '--project', PROJECT_ID], {
      // explicit env: Bun.spawn does not see PATH / JAVA_HOME changes made at runtime otherwise
      env: { ...process.env },
      stdout: 'ignore',
      stderr: 'ignore',
    }),
  );
  await waitForHttp(`${AUTH_EMULATOR}/`, 120_000);
  await waitForHttp('http://127.0.0.1:8080/', 120_000);
  procs.push(
    Bun.spawn([npx, 'vite', '--port=5173', '--host=0.0.0.0', '--strictPort'], {
      env: { ...process.env, VITE_USE_FIREBASE_EMULATOR: 'true', VITE_FIREBASE_PROJECT_ID: PROJECT_ID },
      stdout: 'ignore',
      stderr: 'ignore',
    }),
  );
  await waitForHttp(`${ORIGIN_A}/`, 60_000);
}

export async function stopStack(): Promise<void> {
  for (const p of procs.reverse()) {
    if (process.platform === 'win32' && p.pid) {
      // kill the whole tree (npx -> node -> java)
      Bun.spawnSync(['taskkill', '/PID', String(p.pid), '/T', '/F'], { stdout: 'ignore', stderr: 'ignore' });
    } else {
      p.kill();
    }
  }
  procs.length = 0;
}

export async function latestSignInLink(email: string): Promise<string> {
  const deadline = Date.now() + 15_000;
  for (;;) {
    const res = await fetch(`${AUTH_EMULATOR}/emulator/v1/projects/${PROJECT_ID}/oobCodes`);
    const body = (await res.json()) as { oobCodes: { email: string; requestType: string; oobLink: string }[] };
    const hit = body.oobCodes.filter((c) => c.email === email && c.requestType === 'EMAIL_SIGNIN').at(-1);
    if (hit) return hit.oobLink;
    if (Date.now() > deadline) throw new Error(`no sign-in link for ${email}`);
    await Bun.sleep(300);
  }
}

export async function resetEmulators(): Promise<void> {
  await fetch(`${AUTH_EMULATOR}/emulator/v1/projects/${PROJECT_ID}/accounts`, { method: 'DELETE' });
  await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, { method: 'DELETE' });
}

export interface Page {
  view: InstanceType<typeof Bun.WebView>;
  eval<T = unknown>(js: string): Promise<T>;
  goto(url: string): Promise<void>;
  waitFor(selector: string, timeoutMs?: number): Promise<void>;
  waitForText(text: string, timeoutMs?: number): Promise<void>;
  click(selector: string): Promise<void>;
  fill(selector: string, value: string): Promise<void>;
  text(selector?: string): Promise<string>;
  shot(name: string): Promise<string>;
  close(): void;
}

export function openPage(label: string, width: number, height: number, outDir: string): Page {
  mkdirSync(outDir, { recursive: true });
  const view = new Bun.WebView({ width, height });
  const page: Page = {
    view,
    async eval<T>(js: string) {
      return (await view.evaluate(js)) as T;
    },
    async goto(url) {
      await view.navigate(url);
    },
    async waitFor(selector, timeoutMs = 15_000) {
      const deadline = Date.now() + timeoutMs;
      while (!(await page.eval<boolean>(`!!document.querySelector(${JSON.stringify(selector)})`))) {
        if (Date.now() > deadline) throw new Error(`[${label}] timeout waiting for ${selector} at ${await page.eval('location.href')}`);
        await Bun.sleep(200);
      }
    },
    async waitForText(text, timeoutMs = 15_000) {
      const deadline = Date.now() + timeoutMs;
      while (!(await page.eval<boolean>(`document.body.innerText.includes(${JSON.stringify(text)})`))) {
        if (Date.now() > deadline) throw new Error(`[${label}] timeout waiting for text "${text}" at ${await page.eval('location.href')}`);
        await Bun.sleep(200);
      }
    },
    async click(selector) {
      await page.waitFor(selector);
      await page.eval(`document.querySelector(${JSON.stringify(selector)}).click()`);
    },
    async fill(selector, value) {
      await page.waitFor(selector);
      // React tracks the native value setter; use it so onChange fires.
      await page.eval(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)});
        el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      })()`);
    },
    async text(selector) {
      return page.eval<string>(selector ? `document.querySelector(${JSON.stringify(selector)})?.innerText ?? ''` : 'document.body.innerText');
    },
    async shot(name) {
      const path = join(outDir, `${label}-${name}.png`);
      await Bun.write(path, await view.screenshot());
      return path;
    },
    close() {
      view.close?.();
    },
  };
  return page;
}

/**
 * Email-link sign-in through the emulator. `name` is required for a first-time user: the app asks for a
 * name before any group sees the placeholder (RequireAuth gate, or inline on the invite landing).
 */
export async function signInWithEmailLink(page: Page, origin: string, email: string, next = '/', name?: string): Promise<void> {
  await page.goto(`${origin}/signin?next=${encodeURIComponent(next)}`);
  await page.fill('[data-testid="signin-email"]', email);
  await page.click('[data-testid="signin-email-submit"]');
  const link = await latestSignInLink(email);
  // The emulator link points at its own host; it redirects to continueUrl with the oob params.
  const url = new URL(link);
  const continueUrl = url.searchParams.get('continueUrl') ?? `${origin}/signin/finish`;
  const finish = new URL(continueUrl);
  for (const key of ['mode', 'oobCode', 'apiKey', 'lang']) {
    const v = url.searchParams.get(key);
    if (v) finish.searchParams.set(key, v);
  }
  await page.goto(finish.toString());
  if (name) await passNameGate(page, name);
}

/** The one-field name prompt: fill it, submit, and wait until it has left the page. */
export async function passNameGate(page: Page, name: string, timeoutMs = 30_000): Promise<void> {
  await page.waitFor('[data-testid="name-prompt-input"]', timeoutMs);
  await page.fill('[data-testid="name-prompt-input"]', name);
  await page.click('[data-testid="name-prompt-submit"]');
  const deadline = Date.now() + timeoutMs;
  while (await page.eval<boolean>('!!document.querySelector(\'[data-testid="name-prompt-input"]\')')) {
    if (Date.now() > deadline) throw new Error(`name prompt still open at ${await page.eval('location.href')}`);
    await Bun.sleep(200);
  }
}

export interface StepLog { step: string; ok: boolean; detail: string; shots: string[] }
