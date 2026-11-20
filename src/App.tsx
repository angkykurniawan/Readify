import { useEffect } from 'react';
import { AISettingsModal } from './components/hud/AISettingsModal';
import { AdminDrawer } from './components/hud/AdminDrawer';
import { BookDrawer } from './components/hud/BookDrawer';
import { BookReaderModal } from './components/hud/BookReaderModal';
import { BottomZoneBar } from './components/hud/BottomZoneBar';
import { CatalogDrawer } from './components/hud/CatalogDrawer';
import { LoansDrawer } from './components/hud/LoansDrawer';
import { LoginModal } from './components/hud/LoginModal';
import { MobileWalkPad } from './components/hud/MobileWalkPad';
import { OnlineUsersDrawer } from './components/hud/OnlineUsersDrawer';
import { ToastOverlay } from './components/hud/ToastOverlay';
import { TopBar } from './components/hud/TopBar';
import { LibraryScene } from './components/scene/LibraryScene';
import { logoutBeacon, subscribeRealtime } from './services/api';
import { useLibraryStore } from './store/useLibraryStore';

export function App() {
  const isReady = useLibraryStore((s) => s.isReady);
  const currentUser = useLibraryStore((s) => s.currentUser);
  const sessionToken = useLibraryStore((s) => s.sessionToken);
  const initApp = useLibraryStore((s) => s.initApp);
  const pollSync = useLibraryStore((s) => s.pollSync);
  const pruneFinishedAnims = useLibraryStore((s) => s.pruneFinishedAnims);

  useEffect(() => {
    initApp();
  }, [initApp]);

  useEffect(() => {
    if (!sessionToken) return;

    const syncInterval = setInterval(() => {
      pollSync();
    }, 2000);

    const animInterval = setInterval(() => {
      pruneFinishedAnims();
    }, 500);

    const unsubRealtime = subscribeRealtime(() => {
      pollSync();
    });

    const handleUnload = () => {
      logoutBeacon(sessionToken);
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(syncInterval);
      clearInterval(animInterval);
      unsubRealtime();
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [sessionToken, pollSync, pruneFinishedAnims]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#eef1f5]">
      <LibraryScene />

      {isReady && !currentUser && <LoginModal />}

      {currentUser && (
        <>
          <TopBar />
          <BottomZoneBar />
          <MobileWalkPad />
          <BookDrawer />
          <LoansDrawer />
          <CatalogDrawer />
          <AdminDrawer />
          <AISettingsModal />
          <OnlineUsersDrawer />
          <BookReaderModal />
        </>
      )}

      <ToastOverlay />
    </main>
  );
}

export default App;
