import React from 'react';
import { Smartphone, Download, HelpCircle } from 'lucide-react';

interface TopNavProps {
  activeTab: 'simulator' | 'tester' | 'code' | 'settings';
  setActiveTab: (tab: 'simulator' | 'tester' | 'code' | 'settings') => void;
  onExportZip: () => void;
  onOpenApkGuide: () => void;
  isExporting: boolean;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  setActiveTab,
  onExportZip,
  onOpenApkGuide,
  isExporting,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
          <Smartphone className="w-5 h-5" />
        </div>
        <a href="#simulator" onClick={() => setActiveTab('simulator')} className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 hover:text-emerald-400 transition-colors">
          CallVibe Guard
        </a>
      </div>

      {/* Zone 2: 4 clean single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
        <button
          onClick={() => setActiveTab('simulator')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'simulator' ? 'text-emerald-400 border-b-2 border-emerald-400 pb-0.5' : ''
          }`}
        >
          Call Simulator
        </button>
        <button
          onClick={() => setActiveTab('tester')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'tester' ? 'text-emerald-400 border-b-2 border-emerald-400 pb-0.5' : ''
          }`}
        >
          Haptic & Mute Lab
        </button>
        <button
          onClick={() => setActiveTab('code')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'code' ? 'text-emerald-400 border-b-2 border-emerald-400 pb-0.5' : ''
          }`}
        >
          Android Kotlin Code
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'settings' ? 'text-emerald-400 border-b-2 border-emerald-400 pb-0.5' : ''
          }`}
        >
          Preferences
        </button>
      </nav>

      {/* Zone 3: Actions */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onOpenApkGuide}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 active:scale-[0.98] rounded-lg border border-slate-700 transition-all whitespace-nowrap shrink-0 cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>Export APK Guide</span>
        </button>
        <button
          onClick={onExportZip}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:scale-[0.98] rounded-lg transition-all shadow-md shadow-emerald-500/20 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isExporting ? 'Packaging...' : 'Download Project (.zip)'}</span>
        </button>
      </div>
    </header>
  );
};
