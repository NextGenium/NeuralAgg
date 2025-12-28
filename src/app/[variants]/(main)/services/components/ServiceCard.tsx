'use client';

import type { FC } from 'react';

export type ServiceTag = { name: string; slug: string };

export type Service = {
  iconUrl?: string | null;
  id: string;
  name: string;
  shortDesc?: string | null;
  slug: string;
  source?: string | null;
  tags?: ServiceTag[];
  url?: string | null;
};

interface Props {
  isFavorite: boolean;
  onOpenChat?: () => void;
  onOpenDetails?: () => void;
  onOpenSite?: () => void;
  onToggleFavorite: () => void;
  service: Service;
}

export const ServiceCard: FC<Props> = ({
  service,
  isFavorite,
  onToggleFavorite,
  onOpenSite,
  onOpenChat,
  onOpenDetails,
}) => {
  return (
    <div
      className="
        group flex flex-col rounded-2xl border px-4 py-3 text-xs
        transition-shadow transition-transform hover:shadow-sm hover:-translate-y-[1px]
        bg-[rgba(255,255,255,0.02)]
      "
    >
      {/* header */}
      <div className="flex items-start gap-3 mb-2">
        {service.iconUrl && (
          <img
            alt={service.name}
            className="w-8 h-8 rounded-xl object-cover"
            src={service.iconUrl}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate text-sm">{service.name}</div>
              {service.source && (
                <div className="text-[10px] opacity-60 mt-0.5">Источник: {service.source}</div>
              )}
            </div>

            <button
              aria-label={isFavorite ? 'Убрать из избранного' : 'В избранное'}
              className="
                ml-auto text-lg leading-none
                hover:scale-110 transition-transform
              "
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              type="button"
            >
              {isFavorite ? '★' : '☆'}
            </button>
          </div>

          {service.shortDesc && (
            <div className="opacity-70 text-[11px] mt-1 line-clamp-3">{service.shortDesc}</div>
          )}
        </div>
      </div>

      {/* tags */}
      {service.tags && service.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {service.tags.map((t) => (
            <span
              className="
                px-2 py-0.5 rounded-full border text-[10px]
                bg-[rgba(0,0,0,0.02)] group-hover:bg-[rgba(0,0,0,0.05)]
              "
              key={t.slug}
            >
              {t.name}
            </span>
          ))}
        </div>
      )}

      {/* actions */}
      <div className="mt-auto flex gap-2 pt-2 border-t border-dashed">
        {onOpenDetails && (
          // eslint-disable-next-line react/button-has-type
          <button
            className="rounded-lg border px-3 py-1 text-[11px] flex-1"
            onClick={onOpenDetails}
          >
            Подробнее
          </button>
        )}
        {onOpenSite && service.url && (
          // eslint-disable-next-line react/button-has-type
          <button className="rounded-lg border px-3 py-1 text-[11px] flex-1" onClick={onOpenSite}>
            Открыть сайт
          </button>
        )}
        {onOpenChat && (
          // eslint-disable-next-line react/button-has-type
          <button className="rounded-lg border px-3 py-1 text-[11px] flex-1" onClick={onOpenChat}>
            Обсудить в чате
          </button>
        )}
      </div>
    </div>
  );
};
