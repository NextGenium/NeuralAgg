'use client';

import { useSearchParams } from 'next/navigation';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import { NeuralGuideWidget } from '@/app/[variants]/(main)/chat/NeuralGuideWidget';

import { DesktopWorkspace, MobileWorkspace } from './components/WorkspaceLayout';
import TelemetryNotification from './components/features/TelemetryNotification';
import PageTitle from './features/PageTitle';

const ModelFromQueryBanner = memo(() => {
  const searchParams = useSearchParams();
  const model = searchParams.get('model');
  const service = searchParams.get('service');

  if (!model && !service) return null;

  return (
    <Flexbox paddingBlock={8} paddingInline={16}>
      <div className="text-[11px] rounded-lg border px-3 py-2 opacity-80">
        {model && (
          <>
            Вы открыли чат из каталога <b>модели</b>:{' '}
            <code className="font-mono text-[11px]">{model}</code>
            <br />
          </>
        )}
        {service && (
          <>
            Вы открыли чат из каталога <b>сервиса</b>:{' '}
            <code className="font-mono text-[11px]">{service}</code>
            <br />
          </>
        )}
        Выберите нужную модель/пресет в селекторе сверху, если хотите использовать её для этого
        диалога.
      </div>
    </Flexbox>
  );
});

const MobileChatPage = memo(() => {
  return (
    <>
      <PageTitle />
      <ModelFromQueryBanner />
      <NeuralGuideWidget />
      <MobileWorkspace />
      <TelemetryNotification mobile={true} />
    </>
  );
});

const DesktopChatPage = memo(() => {
  return (
    <>
      <PageTitle />
      <ModelFromQueryBanner />
      <NeuralGuideWidget />
      <DesktopWorkspace />
      <TelemetryNotification mobile={false} />
    </>
  );
});

export { DesktopChatPage, MobileChatPage };
