'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Flexbox } from 'react-layout-kit';

type Chain = {
  createdAt: string;
  id: string;
  summary: string;
  title: string;
  updatedAt: string;
};

const ChainsPage = () => {
  const [chains, setChains] = useState<Chain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchChains = async () => {
      try {
        const res = await fetch('/api/neural/chains', { method: 'GET' });
        if (!res.ok) {
          throw new Error('Failed to load chains');
        }
        const { chains } = await res.json();
        setChains(chains);
      } catch {
        setError('Ошибка загрузки цепочек');
      } finally {
        setLoading(false);
      }
    };

    fetchChains();
  }, []);

  if (loading) return <div>Загрузка...</div>;
  if (error) return <div>{error}</div>;

  // @ts-ignore
  return (
    <Flexbox direction="vertical" gap={16} padding={16}>
      <h1 className="text-lg font-semibold">Мои цепочки</h1>
      {chains.length === 0 ? (
        <div>У вас нет цепочек</div>
      ) : (
        <div className="space-y-4">
          {chains.map((chain) => (
            <div
              className="p-4 rounded-lg border border-gray-300 cursor-pointer"
              key={chain.id}
              onClick={() => router.push(`/chains/${chain.id}`)}
            >
              <div className="text-md font-semibold">{chain.title}</div>
              <div className="text-sm text-gray-500">{chain.summary}</div>
              <div className="text-xs text-gray-400">
                {new Date(chain.updatedAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </Flexbox>
  );
};

export default ChainsPage;
