'use client';

import { useSearchParams } from 'next/navigation';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import { DesktopWorkspace, MobileWorkspace } from './components/WorkspaceLayout';
import TelemetryNotification from './components/features/TelemetryNotification';
import PageTitle from './features/PageTitle';

const ModelFromQueryBanner = memo(() => {
  const searchParams = useSearchParams();
  const model = searchParams.get('model');

  if (!model) return null;

  return (
    <Flexbox paddingBlock={8} paddingInline={16}>
      <div className="text-[11px] rounded-lg border px-3 py-2 opacity-80">
        Вы открыли чат из каталога модели: <code className="font-mono text-[11px]">{model}</code>
        <br />
        Выберите эту модель в селекторе сверху, если хотите использовать именно её.
      </div>
    </Flexbox>
  );
});

const MobileChatPage = memo(() => {
  return (
    <>
      <PageTitle />
      <ModelFromQueryBanner />
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
      <DesktopWorkspace />
      <TelemetryNotification mobile={false} />
    </>
  );
});

export { DesktopChatPage, MobileChatPage };
