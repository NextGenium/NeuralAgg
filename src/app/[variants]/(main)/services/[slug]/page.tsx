'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Flexbox } from 'react-layout-kit';

import type { NeuralServiceDto } from '../index';

const ServiceDetailPage = () => {
  const params = useParams();
  const slug = params?.slug as string | undefined;

  const [service, setService] = useState<NeuralServiceDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;

    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/neural/services/${encodeURIComponent(slug)}`, {
          signal: controller.signal,
        });

        if (res.status === 404) {
          setNotFound(true);
          setService(null);
          return;
        }

        const json = await res.json();
        setService(json);
      } catch (e) {
        if (!(e instanceof DOMException && e.name === 'AbortError')) {
          console.error('Failed to load service detail', e);
        }
      } finally {
        setLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, [slug]);

  if (loading && !service) {
    return (
      <Flexbox align="center" height="100%" justify="center" padding={16}>
        <div className="text-sm opacity-70">Загружаем сервис…</div>
      </Flexbox>
    );
  }

  if (notFound) {
    return (
      <Flexbox align="center" height="100%" justify="center" padding={16}>
        <div className="text-sm opacity-70">Сервис не найден.</div>
      </Flexbox>
    );
  }

  if (!service) {
    return null;
  }

  return (
    <Flexbox gap={12} height="100%" padding={16}>
      {/* eslint-disable-next-line react/button-has-type */}
      <button className="text-xs opacity-70 hover:underline w-fit" onClick={() => history.back()}>
        ← Назад
      </button>

      <Flexbox gap={8}>
        <div className="flex items-center gap-3">
          {service.iconUrl && (
            <img
              alt={service.name}
              className="w-10 h-10 rounded-md object-cover"
              src={service.iconUrl}
            />
          )}
          <div>
            <div className="text-lg font-semibold">{service.name}</div>
            {service.source && (
              <div className="text-[11px] opacity-70">Источник: {service.source}</div>
            )}
          </div>
        </div>

        {service.shortDesc && (
          <div className="text-sm opacity-80 max-w-2xl">{service.shortDesc}</div>
        )}

        {service.tags && service.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {service.tags.map((t) => (
              <span className="px-2 py-1 rounded-full border text-[11px] opacity-80" key={t.slug}>
                {t.name}
              </span>
            ))}
          </div>
        )}
      </Flexbox>

      <Flexbox gap={8}>
        <div className="text-sm font-medium">Действия</div>
        <div className="flex gap-2 flex-wrap">
          {service.url && (
            // eslint-disable-next-line react/button-has-type
            <button
              className="rounded-lg border px-3 py-1 text-xs"
              onClick={() => {
                window.open(service.url!, '_blank', 'noopener,noreferrer');
              }}
            >
              Открыть сайт сервиса
            </button>
          )}
          {/* eslint-disable-next-line react/button-has-type */}
          <button
            className="rounded-lg border px-3 py-1 text-xs"
            onClick={() => {
              const url = new URL('/chat', window.location.origin);
              url.searchParams.set('service', service.slug);
              window.location.href = url.toString();
            }}
          >
            Обсудить в чате
          </button>
        </div>
      </Flexbox>
    </Flexbox>
  );
};

export default ServiceDetailPage;
