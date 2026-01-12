import { NextResponse } from 'next/server';

import { auth } from '@/auth';

export const getRequestUserId = async (req: Request): Promise<string | null> => {
  const session = await auth.api.getSession({
    headers: req.headers,
  });
  return session?.user?.id ?? null;
};

/**
 * Возвращает userId авторизованного пользователя.
 * Если пользователь не авторизован — кидает ошибку USER_NOT_AUTHENTICATED.
 */
export const getRequestUserIdOrThrow = async (req: Request): Promise<string> => {
  // BetterAuth: получаем сессию по заголовкам запроса
  // const session = await auth.api.getSession({
  //   headers: req.headers,
  // });

  const userId = await getRequestUserId(req);

  if (!userId) {
    const err: any = new Error('UNAUTHORIZED');
    err.code = 'UNAUTHORIZED';
    throw err;
    //throw new Error('USER_NOT_AUTHENTICATED');
  }

  return userId;
};

/**
 * Универсальный обработчик ошибок для API, использующих getRequestUserIdOrThrow.
 */
export const handleUserError = (e: unknown) => {
  const anyErr = e as any;
  if (anyErr?.message === 'UNAUTHORIZED' || anyErr?.code === 'UNAUTHORIZED') {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  return null;
};
