'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Flexbox } from 'react-layout-kit';

type ChainStep = {
  createdAt: string;
  id: string;
  index: number;
  models: string[];
  prompt: string;
  results: {
    error?: string;
    model: string;
    ok: boolean;
    output?: string;
  }[];
};

type ChainDetail = {
  steps: ChainStep[];
  summary: string;
  title: string;
};

const ChainDetailPage = () => {
  const { id } = useParams();
  const [chain, setChain] = useState<ChainDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useRouter();
  useEffect(() => {
    const fetchChainDetails = async () => {
      try {
        const res = await fetch(`/api/neural/chains/${id}`, { method: 'GET' });
        if (res.status === 401) {
          // eslint-disable-next-line unicorn/no-await-expression-member
          const guest = (await import('../lib/guestChains')).GuestChains.get(String(id));
          setChain(guest as any);
          return;
        }
        if (!res.ok) {
          throw new Error('Failed to load chain');
        }
        const { chain } = await res.json();
        setChain(chain);
      } catch {
        setError('Ошибка загрузки цепочки');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchChainDetails();
    }
  }, [id]);

  if (loading) return <div>Загрузка...</div>;
  if (error) return <div>{error}</div>;

  if (!chain) return <div>Цепочка не найдена</div>;

  return (
    <Flexbox direction="vertical" gap={16} padding={16}>
      <h1 className="text-lg font-semibold">{chain.title}</h1>
      <p className="text-sm text-gray-600">{chain.summary}</p>
      <div className="space-y-4">
        {chain.steps.map((step) => (
          <div className="border-b border-gray-300 pb-4" key={step.id}>
            <div className="text-md font-semibold">Шаг {step.index}</div>
            <div className="text-xs text-gray-500">{step.prompt}</div>
            <div className="mt-2">
              {step.results.map((result, index) => (
                <div className="flex flex-col mt-2" key={index}>
                  <div className="flex items-center justify-between">
                    <span>{result.model}</span>
                    <span className={result.ok ? 'text-green-500' : 'text-red-500'}>
                      {result.ok ? 'OK' : 'Ошибка'}
                    </span>
                  </div>
                  <pre className="text-xs text-gray-800">{result.output || result.error}</pre>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Flexbox>
  );
};

export default ChainDetailPage;
