import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

import { TIERS } from '@/config/billing/tiers';
import { UserCreditsService } from '@/server/services/billing/userCredits';

export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  const rawBody = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (e) {
    console.error('Stripe webhook signature error', e);
    return NextResponse.json(
      {
        error: 'BAD_SIGNATURE',
      },
      {
        status: 400,
      },
    );
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userid;

    if (userId) {
      await UserCreditsService.setTier(userId, 'creator', TIERS.creator.monthlyDiamondsLimit);
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
