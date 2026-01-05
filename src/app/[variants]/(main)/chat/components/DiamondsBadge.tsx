'use client';

import { FC } from 'react';

import { useDiamondsBalance } from '@/app/[variants]/(main)/chat/components/diamonds/useDiamondsBalance';

export const DiamondsBadge: FC = () => {
  const { diamonds, tier, loading } = useDiamondsBalance();

  if (loading) {
    return <div className="text-[11px] opacity-60 px-2 py-1 rounded-lg border">💎 Balance…</div>;
  }

  // eslint-disable-next-line eqeqeq
  if (tier == null) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border bg-[rgba(255,255,255,0.03)]">
      <span>💎</span>
      <span>{diamonds}</span>
      <span className="opacity-60">({tier})</span>
    </div>
  );
};
