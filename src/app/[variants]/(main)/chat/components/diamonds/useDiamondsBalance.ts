'use client';

import { useEffect, useState } from 'react';

type Tier = 'starter' | 'creator' | 'admin' | null;

interface DiamondsState {
  diamonds: number;
  error: string | null;
  loading: boolean;
  tier: Tier;
}

export const useDiamondsBalance = (): DiamondsState => {
  const [diamonds, setDiamonds] = useState(0);
  const [tier, setTier] = useState<Tier>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/billing/credits', {
          credentials: 'include',
        });

        if (res.status === 401) {
          if (!cancelled) {
            setTier(null);
            setDiamonds(0);
          }
          return;
        }

        const json = await res.json();

        if (!cancelled) {
          setDiamonds(json.diamonds ?? 0);
          setTier(json.tier ?? null);
        }
      } catch (e) {
        console.error('Failed to load diamond balance', e);
        if (!cancelled) setError('Failed to load balance');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { diamonds, error, loading, tier };
};
