import { useEffect, useState } from 'react';
import { AdminLoginView } from './components/AdminLoginView';
import { AiSeoGeoStudio } from './components/AiSeoGeoStudio';
import { ArticleReaderModal } from './components/ArticleReaderModal';
import { BookmarksDrawer } from './components/BookmarksDrawer';
import { BureauWorldMap } from './components/BureauWorldMap';
import { CustomPageView } from './components/CustomPageView';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { NewsGridSections } from './components/NewsGridSections';
import { NewsroomDashboard } from './components/NewsroomDashboard';
import { OfflineIndicator } from './components/PWAControls';
import { ThreeDNewsGlobe } from './components/ThreeDNewsGlobe';
import { UtilityRibbon } from './components/UtilityRibbon';
import { NewspaperProvider, useNewspaper } from './contexts/NewspaperContext';

function ToastNotifications() {
  const { toastQueue } = useNewspaper();
  if (toastQueue.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm w-full px-4 sm:px-0 pointer-events-none">
      {toastQueue.map((item) => (
        <div
          key={item.id}
          className="pointer-events-auto bg-neutral-900 dark:bg-neutral-800 text-white border border-neutral-700 rounded-md p-3.5 shadow-xl text-xs"
        >
          <div className="font-bold text-amber-300">{item.title}</div>
          <div className="text-neutral-200 mt-0.5 leading-snug">{item.message}</div>
        </div>
      ))}
    </div>
  );
}

function VisualEditFloatBar() {
  const { visualEditMode, setVisualEditMode, setActiveView, isStaffAuthenticated } = useNewspaper();
  if (!isStaffAuthenticated || !visualEditMode) return null;

  return (
    <div className="fixed bottom-4 left-4 z-40 bg-neutral-900 text-white border border-[#E1262D] rounded-md px-4 py-2.5 shadow-xl flex items-center gap-3 text-xs">
      <span className="font-bold text-amber-300">Visual Edit Mode Active</span>
      <button
        type="button"
        onClick={() => setActiveView('newsroom')}
        className="px-2.5 py-1 bg-[#E1262D] text-white font-bold rounded cursor-pointer"
      >
        Open CMS Customizer
      </button>
      <button
        type="button"
        onClick={() => setVisualEditMode(false)}
        className="text-neutral-300 hover:text-white underline cursor-pointer"
      >
        Exit
      </button>
    </div>
  );
}

function NewspaperShell() {
  const { activeView, isStaffAuthenticated } = useNewspaper();

  const renderMainView = () => {
    if (activeView === 'admin_login') return <AdminLoginView />;
    if (activeView === 'page') return <CustomPageView />;
    if (isStaffAuthenticated) {
      if (activeView === 'newsroom') return <NewsroomDashboard />;
      if (activeView === 'map') return <BureauWorldMap />;
      if (activeView === 'globe') return <ThreeDNewsGlobe />;
      if (activeView === 'seo') return <AiSeoGeoStudio />;
    }
    return <NewsGridSections />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF7] dark:bg-[#0B0F17] text-neutral-900 dark:text-neutral-100 transition-colors">
      <Header />
      <UtilityRibbon />

      <main className="flex-1">{renderMainView()}</main>

      <Footer />
      <ArticleReaderModal />
      <BookmarksDrawer />
      <ToastNotifications />
      <VisualEditFloatBar />
      <OfflineIndicator />
    </div>
  );
}

export default function App() {
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  useEffect(() => {
    const onQuotaExceeded = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  return (
    <NewspaperProvider>
      {mapsQuotaExceeded && (
        <div
          role="alert"
          className="sticky top-0 z-50 bg-amber-100 border-b border-amber-400 text-amber-950 px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2"
        >
          <span>
            <strong>Google Maps Platform free demo quota reached or key rejected.</strong> Provide your
            own Google Cloud billing-enabled Maps API key to continue interactive map coverage.{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noreferrer"
              className="underline font-semibold"
            >
              Quota Troubleshooting Guide
            </a>
          </span>
          <button
            type="button"
            onClick={() => setMapsQuotaExceeded(false)}
            className="font-bold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}
      <NewspaperShell />
    </NewspaperProvider>
  );
}
