import type { NextRequest } from 'next/server';

// Возвращает userId или null, НИКОГДА не кидает наружу
export async function safeGetUserId(req: NextRequest): Promise<string | null> {
  try {
    // ⚠️ динамический import, чтобы не грузить auth модуль при каждом запросе
    const mod = await import('@/auth');
    const auth = (mod as any).auth;

    if (!auth?.api?.getSession) return null;

    const session = await auth.api.getSession({
      headers: req.headers,
    });

    return session?.user?.id ?? null;
  } catch {
    // если auth0/next-auth конфиг битый — просто считаем гостем
    return null;
  }
}
