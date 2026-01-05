import { NextResponse } from 'next/server';

import { auth } from '@/auth';

/**
 * Возвращает userId авторизованного пользователя.
 * Если пользователь не авторизован — кидает ошибку USER_NOT_AUTHENTICATED.
 */
export const getRequestUserIdOrThrow = async (req: Request): Promise<string> => {
  // BetterAuth: получаем сессию по заголовкам запроса
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  const userId = session?.user?.id;

  if (!userId) {
    throw new Error('USER_NOT_AUTHENTICATED');
  }

  return userId;
};

/**
 * Универсальный обработчик ошибок для API, использующих getRequestUserIdOrThrow.
 */
export const handleUserError = (e: unknown) => {
  if (e instanceof Error && e.message === 'USER_NOT_AUTHENTICATED') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
};
