'use client';

import { useEffect, useState } from 'react';

type Tier = 'starter' | 'creator' | 'admin' | null;

interface DiamondsState {
  diamonds: number;
  error: string | null;
  loading: boolean;
  tier: Tier;
}

const ENDPOINT = '/api/billing/credits';

const safeParseJson = (text: string): any | null => {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

export const useDiamondsBalance = (): DiamondsState => {
  const [diamonds, setDiamonds] = useState(0);
  const [tier, setTier] = useState<Tier>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(ENDPOINT, {
          credentials: 'include',
          signal: controller.signal,
        });

        const text = await res.text();
        const json = safeParseJson(text) ?? {};

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
      controller.abort();
    };
  }, []);

  return { diamonds, error, loading, tier };
};

//'use client';

//import { useEffect, useState } from 'react';

//type Tier = 'starter' | 'creator' | 'admin' | null;

//interface DiamondsState {
//  diamonds: number;
//  error: string | null;
//  loading: boolean;
//  tier: Tier;
//}

//const ENDPOINT = '/api/billing/credits';

//type CreditsResponse = {
//  diamonds?: number;
//  error?: string;
//  tier?: Tier;
//};

//const safeParseJson = (text: string): any | null => {
//  if (!text) return null;
//  try {
//   return JSON.parse(text);
// } catch {
//    return null;
// }
//};

//export const useDiamondsBalance = (): DiamondsState => {
//  const [diamonds, setDiamonds] = useState(0);
//  const [tier, setTier] = useState<Tier>(null);
//  const [loading, setLoading] = useState(true);
//  const [error, setError] = useState<string | null>(null);

//  useEffect(() => {
//    let cancelled = false;
//    const controller = new AbortController();

//    const load = async () => {
//      setLoading(true);
//      setError(null);

//     try {
//        const res = await fetch(ENDPOINT, {
//          credentials: 'include',
//          headers: { Accept: 'application/json' },
//          signal: controller.signal,
//        });

// 401 — не авторизован
//        if (res.status === 401) {
//          if (!cancelled) {
//            setTier(null);
//            setDiamonds(0);
//          }
//          return;
//        }

// читаем как текст и парсим сами (чтобы не падало)
//        const text = await res.text();
//        const json = safeParseJson(text) as CreditsResponse | null;

//        if (!json) {
//          console.error('[useDiamondsBalance] non-JSON response', {
//            endpoint: ENDPOINT,
//            preview: text?.slice?.(0, 300),
//           status: res.status,
//         });

//          if (!cancelled) {
//           setTier(null);
//            setDiamonds(0);
//           setError('Server returned invalid response');
//          }
//          return;
//        }

//        if (!res.ok) {
//          console.warn('[useDiamondsBalance] request failed', {
//           endpoint: ENDPOINT,
//            error: json.error,
//           status: res.status,
//         });

//         if (!cancelled) {
//           setTier(json.tier ?? null);
//           setDiamonds(json.diamonds ?? 0);
//           setError(json.error ?? 'Failed to load balance');
//         }
//         return;
//       }

//       if (!cancelled) {
//         setDiamonds(json.diamonds ?? 0);
//         setTier(json.tier ?? null);
//      }
//    } catch (e: any) {
//      if (e?.name !== 'AbortError') {
//        console.error('Failed to load diamond balance', e);
//      }
//       if (!cancelled) setError('Failed to load balance');
//     } finally {
//       if (!cancelled) setLoading(false);
//     }
//   };

//   void load();

//   return () => {
//     cancelled = true;
//     controller.abort();
//   };
// }, []);

// return { diamonds, error, loading, tier };
//};
