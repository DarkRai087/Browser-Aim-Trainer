/**
 * App - Main application component
 */

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
      <header className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px', background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <h1 style={{ color: '#fff', fontSize: '1.25rem' }}>Aim Trainer</h1>
        <button 
          className="settings-button" 
          onClick={handleOpenSettings}
          title="Settings"
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', width: '40px', height: '40px', borderRadius: '8px', fontSize: '1.25rem', cursor: 'pointer' }}
        >
          ⚙
        </button>
      </header>

      <main className="app-main" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <GameCanvas />
      </main>

      <SettingsPanel 
        isOpen={isSettingsOpen} 
        onClose={handleCloseSettings} 
      />
    </div>
  );
}

export default App;
