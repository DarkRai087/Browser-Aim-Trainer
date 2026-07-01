import { useState, useCallback } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { SettingsPanel } from './components/SettingsPanel';
import './App.css';

function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleOpenSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  return (
    <div className="app" style={{ width: '100vw', height: '100vh', background: '#1a1a2e' }}>
      <main className="app-main" style={{ flex: 1, position: 'relative', overflow: 'hidden', height: '100%' }}>
        <GameCanvas onOpenSettings={handleOpenSettings} />
      </main>

      <SettingsPanel 
        isOpen={isSettingsOpen} 
        onClose={handleCloseSettings} 
      />
    </div>
  );
}

export default App;
