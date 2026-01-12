import { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';

export const GUEST_COOKIE = 'na_guest_id';

export type Actor = { id: string; kind: 'user' } | { id: string; kind: 'guest' };

async function safeGetUserId(req: NextRequest): Promise<string | null> {
  try {
    const mod = await import('@/auth');
    const auth = (mod as any).auth;
    if (!auth?.api?.getSession) return null;

    const session = await auth.api.getSession({ headers: req.headers });
    return session?.user?.id ?? null;
  } catch {
    return null; // auth может быть битый — тогда гость
  }
}

export async function getActor(req: NextRequest): Promise<{ actor: Actor; setCookie?: string }> {
  const userId = await safeGetUserId(req);
  if (userId) return { actor: { id: userId, kind: 'user' } };

  const existing = req.cookies.get(GUEST_COOKIE)?.value;
  if (existing) return { actor: { id: existing, kind: 'guest' } };

  const id = randomUUID();
  // строка Set-Cookie (ручная), чтобы можно было прокинуть в response headers
  const setCookie = `${GUEST_COOKIE}=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`;
  return { actor: { id, kind: 'guest' }, setCookie };
}
