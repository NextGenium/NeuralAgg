import type { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';

import { getRequestUserId } from './getRequestUserId';

export type Actor = { id: string; type: 'user' } | { id: string; type: 'guest' };

const GUEST_ID_COOKIE = 'na_guest_id';

export async function getActor(req: NextRequest): Promise<{
  actor: Actor;
  ensureGuestCookie: (res: Response) => void;
}> {
  const userId = await getRequestUserId(req);

  if (userId) {
    return { actor: { id: userId, type: 'user' }, ensureGuestCookie: () => {} };
  }

  const existing = req.cookies.get(GUEST_ID_COOKIE)?.value;
  const guestId = existing || `guest_${randomUUID()}`;

  return {
    actor: { id: guestId, type: 'guest' },
    ensureGuestCookie: (res: any) => {
      if (!existing) {
        res.cookies?.set?.(GUEST_ID_COOKIE, guestId, {
          httpOnly: true,
          path: '/',
          sameSite: 'lax',
        });
      }
    },
  };
}
