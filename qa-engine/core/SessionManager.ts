import { SignJWT, jwtVerify } from 'jose';
import { BrowserContext } from '@playwright/test';
import { QA_CONFIG } from '../config/environments';
import { TEST_ACCOUNTS, TestRoleAccount } from '../config/test-roles';

export class SessionManager {
  private secret: Uint8Array;

  constructor() {
    this.secret = new TextEncoder().encode(QA_CONFIG.JWT_SECRET);
  }

  /**
   * Membuat token JWT valid untuk role tertentu sesuai payload LMS asli
   */
  public async createJwtForRole(roleKey: keyof typeof TEST_ACCOUNTS, overrides: Record<string, any> = {}): Promise<string> {
    const account = TEST_ACCOUNTS[roleKey];
    if (!account) {
      throw new Error(`Role key '${String(roleKey)}' tidak ditemukan dalam TEST_ACCOUNTS`);
    }

    const payload: Record<string, any> = {
      id: account.roleName === 'student' ? '1' : account.roleName === 'teacher' ? '2' : account.roleName === 'admin_langganan' ? '3' : '7',
      userId: account.roleName === 'student' ? '1' : account.roleName === 'teacher' ? '2' : account.roleName === 'admin_langganan' ? '3' : '7',
      role: account.roleName,
      name: account.name,
      school: account.schoolId ? {
        id: account.schoolId,
        name: account.schoolName,
        province: account.province,
      } : null,
      schoolId: account.schoolId,
      grade: account.grade || null,
      studentId: account.roleName === 'student' ? 's1' : null,
      ...overrides
    };

    return new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(this.secret);
  }

  /**
   * Menempelkan cookie otentikasi auth_token ke Playwright BrowserContext
   */
  public async applyAuthToContext(context: BrowserContext, token: string): Promise<void> {
    const parsedUrl = new URL(QA_CONFIG.APP_URL);
    await context.addCookies([
      {
        name: 'auth_token',
        value: token,
        domain: parsedUrl.hostname,
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      }
    ]);
  }

  /**
   * Melakukan login via HTTP API dan mengembalikan token cookie
   */
  public async loginViaApi(email: string, password = 'password123'): Promise<{ token?: string; cookieHeader?: string; data: any; status: number }> {
    const res = await fetch(`${QA_CONFIG.APP_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const setCookie = res.headers.get('set-cookie') || '';
    let token = '';
    const match = setCookie.match(/auth_token=([^;]+)/);
    if (match) {
      token = match[1];
    }

    let data = {};
    try {
      data = await res.json();
    } catch {
      // response non-json
    }

    return { token, cookieHeader: setCookie, data, status: res.status };
  }

  /**
   * Membuat token manipulasi/tampered untuk pengujian keamanan (IDOR / Privilege Escalation)
   */
  public async createTamperedToken(roleKey: keyof typeof TEST_ACCOUNTS, maliciousClaims: Record<string, any>): Promise<string> {
    return this.createJwtForRole(roleKey, maliciousClaims);
  }
}

export const sessionManager = new SessionManager();
