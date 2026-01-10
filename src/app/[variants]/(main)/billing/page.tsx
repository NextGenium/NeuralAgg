'use client';

import { Flexbox } from 'react-layout-kit';

export default function BillingPage() {
  return (
    <Flexbox gap={12} padding={16}>
      <div className="text-lg font-semibold">Tariffs</div>

      <div className="rounded-lg border p-3">
        <div className="font-medium">Creator Light</div>
        <div className="text-sm opacity-70">20,000 diamonds per month + access to all models</div>

        {/* eslint-disable-next-line react/button-has-type */}
        <button
          className="mt-3 rounded-lg border px-3 py-2 text-sm"
          onClick={async () => {
            const res = await fetch('/api/billing/stripe/checkout', { method: 'POST' });
            const json = await res.json();
            if (json?.url) window.location.href = json.url;
          }}
        >
          Manage subscription($9.99)
        </button>
      </div>
    </Flexbox>
  );
}
