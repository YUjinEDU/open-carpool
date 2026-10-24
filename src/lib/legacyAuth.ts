import type { User } from '../types';
import { signOut } from '../features/auth/authService';

/**
 * Temporary shim so the legacy CNU screens keep compiling until they are replaced (U3).
 * The employee-id + password-hash login is removed; sign-in now goes through
 * src/features/auth/authService (Firebase Auth).
 */
export class LegacyAuthRemovedError extends Error {
  constructor() {
    super('교번/비밀번호 로그인은 종료되었습니다. 새 로그인 화면을 이용해 주세요.');
    this.name = 'LegacyAuthRemovedError';
  }
}

export function getCurrentEmployeeId(): string | null {
  return null;
}

export async function signup(_employeeId: string, _password: string, _userData: unknown): Promise<User> {
  throw new LegacyAuthRemovedError();
}

export async function login(_employeeId: string, _password: string): Promise<User> {
  throw new LegacyAuthRemovedError();
}

export async function resetPassword(_id: string, _name: string, _dept: string, _pw: string): Promise<void> {
  throw new LegacyAuthRemovedError();
}

export function logout(): void {
  signOut().catch((error: unknown) => console.error('sign-out failed', error));
}
