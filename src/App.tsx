/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import MainArea from './components/MainArea';
import SettingsModal from './components/SettingsModal';
import SetupModal from './components/SetupModal';
import { AppProvider, useAppContext } from './AppContext';

function AppLayout() {
  const { theme, hasSetupCompleted } = useAppContext();
  const [showSettings, setShowSettings] = useState(false);
  
  const bgClass = {
    'modern-dark': 'bg-gradient-to-br from-[#1c181a] via-[#111111] to-[#0a0a0a]',
    'classic-light': 'bg-gradient-to-br from-[#f5f2ed] via-[#e5e1d8] to-[#d1ccc0]',
    'deep-galactic': 'bg-gradient-to-br from-[#0e121d] via-[#05060a] to-[#020202]',
    'muted-earth': 'bg-gradient-to-br from-[#e5e1d8] via-[#d1ccc0] to-[#c4c0b4]',
    'neon-cyber': 'bg-gradient-to-br from-[#1a1a1a] via-[#0a0a0a] to-[#050505]'
  }[theme];

  const textClass = {
    'modern-dark': 'text-zinc-300',
    'classic-light': 'text-zinc-800',
    'deep-galactic': 'text-zinc-300',
    'muted-earth': 'text-zinc-800',
    'neon-cyber': 'text-zinc-300'
  }[theme];

  return (
    <div
      data-theme={theme}
      className={`h-screen w-screen flex flex-col ${bgClass} ${textClass} font-sans overflow-hidden transition-colors duration-300`}
    >
      <TopBar onSettingsClick={() => setShowSettings(true)} />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar onSettingsClick={() => setShowSettings(true)} />
        <MainArea />
      </div>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {!hasSetupCompleted && <SetupModal />}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppLayout />
    </AppProvider>
  );
}
