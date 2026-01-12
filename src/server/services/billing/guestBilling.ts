import { NextRequest, NextResponse } from 'next/server';

const COOKIE_GUEST_ID = 'na_guest_id';
const COOKIE_GUEST_DIAMONDS = 'na_guest_diamonds';

export const GUEST_DEFAULT_DIAMONDS = 1000;
export const GUEST_TIER = 'starter' as const;

export type GuestState = {
  diamonds: number;
  guestId: string;
  isNew: boolean;
  tier: typeof GUEST_TIER;
};

const randomId = () => {
  // достаточно для local demo
  return `guest_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
};

export const readGuestState = (req: NextRequest): GuestState => {
  const id = req.cookies.get(COOKIE_GUEST_ID)?.value;
  const diamondsRaw = req.cookies.get(COOKIE_GUEST_DIAMONDS)?.value;

  const diamondsParsed = diamondsRaw ? Number.parseInt(diamondsRaw, 10) : NaN;

  const isNew = !id || !Number.isFinite(diamondsParsed);

  return {
    diamonds: Number.isFinite(diamondsParsed) ? diamondsParsed : GUEST_DEFAULT_DIAMONDS,
    guestId: id || randomId(),
    isNew,
    tier: GUEST_TIER,
  };
};

export const attachGuestCookies = (res: NextResponse, state: GuestState) => {
  // 30 дней
  const maxAge = 60 * 60 * 24 * 30;

  res.cookies.set(COOKIE_GUEST_ID, state.guestId, {
    httpOnly: true,
    maxAge,
    path: '/',
    sameSite: 'lax',
  });

  res.cookies.set(COOKIE_GUEST_DIAMONDS, String(state.diamonds), {
    httpOnly: true,
    maxAge,
    path: '/',
    sameSite: 'lax',
  });
};

export const chargeGuestDiamonds = (req: NextRequest, cost: number): GuestState => {
  const state = readGuestState(req);

  const next = Math.max(0, state.diamonds - Math.max(0, cost));

  return {
    ...state,
    diamonds: next,
    isNew: state.isNew,
  };
};
