import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

import { getRequestUserIdOrThrow } from '@/server/utils/getRequestUserId';

export const runtime = 'nodejs';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export async function POST(req: NextRequest) {
  const userId = await getRequestUserIdOrThrow(req);

  const priceId = process.env.STRIPE_CREATOR_PRICE_ID!;
  const appUrl = process.env.APP_URL || 'http://localhost:3010';

  const session = await stripe.checkout.sessions.create({
    cancel_url: `${appUrl}/billing/cancel`,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    metadata: { userId },
    mode: 'subscription',
    success_url: `${appUrl}/billing/success`,
  });

  return NextResponse.json(
    {
      url: session.url,
    },
    {
      status: 200,
    },
  );
}
