/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CallState, AppSettings, TimelineLogEntry } from './types';
import { TopNav } from './components/TopNav';
import { PhoneSimulator } from './components/PhoneSimulator';
import { TimelineLogger } from './components/TimelineLogger';
import { HardwareTester } from './components/HardwareTester';
import { AndroidCodeExporter } from './components/AndroidCodeExporter';
import { SettingsPanel } from './components/SettingsPanel';
import { ApkExportModal } from './components/ApkExportModal';
import { exportAndroidProjectZip } from './services/zipExporter';
import {
  Zap,
  VolumeX,
  PhoneCall,
  ShieldCheck,
  CheckCircle2,
  Download,
  Info,
  Radio,
  Sliders,
  Layers,
  HelpCircle,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'tester' | 'code' | 'settings'>('simulator');
  const [callState, setCallState] = useState<CallState>('idle');
  const [isVibratingNow, setIsVibratingNow] = useState<boolean>(false);
  const [isMuteGuardActive, setIsMuteGuardActive] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isApkModalOpen, setIsApkModalOpen] = useState<boolean>(false);

  // Default settings
  const [settings, setSettings] = useState<AppSettings>({
    vibrationDurationMs: 250, // Exactly 1/4 second as requested
    muteMicrophone: true, // Mute microphone simultaneously during vibration
    muteExtraBufferMs: 30, // Anti-rattle 30ms buffer
    vibrateOnCallEnd: false,
    vibrateIntensity: 'normal',
    detectionMode: 'incallservice',
    autoAnswerDelaySec: 0, // Manual button by default
    playAudioSim: true,
  });

  // Timeline Logs
  const [logs, setLogs] = useState<TimelineLogEntry[]>([]);
  const baseTimestampRef = React.useRef<number>(Date.now());

  const handleLogEvent = (
    phase: TimelineLogEntry['phase'],
    type: TimelineLogEntry['type'],
    message: string,
    details?: string,
    isHighlight?: boolean
  ) => {
    if (phase === 'DIAL') {
      baseTimestampRef.current = Date.now();
    }
    const offset = Math.max(0, Date.now() - baseTimestampRef.current);
    const newEntry: TimelineLogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      offsetMs: offset,
      phase,
      type,
      message,
      details,
      isHighlight,
    };
    setLogs((prev) => [newEntry, ...prev]);
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const handleExportZip = async () => {
    try {
      setIsExporting(true);
      await exportAndroidProjectZip();
    } catch (err) {
      console.error('Failed to export Android project zip:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Bar Contract (3 zones, single-line text links) */}
      <TopNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onExportZip={handleExportZip}
        onOpenApkGuide={() => setIsApkModalOpen(true)}
        isExporting={isExporting}
      />

      {/* APK Export Modal */}
      <ApkExportModal
        isOpen={isApkModalOpen}
        onClose={() => setIsApkModalOpen(false)}
        onExportZip={handleExportZip}
        isExporting={isExporting}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8">
        {/* TAB 1: CALL SIMULATOR */}
        {activeTab === 'simulator' && (
          <div className="space-y-6">
            {/* Value Proposition Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                    Simultaneous Vibration & Acoustic Mute Architecture
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="text-xs text-slate-400 font-mono">1/4 Second Haptic Trigger</span>
                </div>
                <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                  Android Call Connect Vibration & Mute Controller
                </h1>
                <p className="text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
                  Never keep the phone glued to your ear listening to endless ringing tones. As soon as the other party answers, your phone delivers a crisp <strong className="text-amber-300">1/4 second (250ms) vibration</strong> while <strong className="text-emerald-300">simultaneously muting the microphone</strong> so no motor buzzing reaches the receiver.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={() => setIsApkModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-xs font-semibold text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>How to Export APK</span>
                </button>
                <button
                  onClick={() => setActiveTab('code')}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-xs font-bold text-slate-950 shadow-md shadow-emerald-500/20 transition-all cursor-pointer whitespace-nowrap"
                >
                  View Kotlin Code
                </button>
              </div>
            </div>

            {/* Split Grid: Interactive Phone Simulator (Left) + Timeline & Problem-Solution (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Phone Column */}
              <div className="lg:col-span-5 flex flex-col items-center">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Live Interactive Android Phone
                </div>
                <PhoneSimulator
                  settings={settings}
                  callState={callState}
                  setCallState={setCallState}
                  onLogEvent={handleLogEvent}
                  isVibratingNow={isVibratingNow}
                  setIsVibratingNow={setIsVibratingNow}
                  isMuteGuardActive={isMuteGuardActive}
                  setIsMuteGuardActive={setIsMuteGuardActive}
                />
              </div>

              {/* Timeline & Explanatory Inspector Column */}
              <div className="lg:col-span-7 space-y-6">
                {/* Real-time Timeline Logger */}
                <TimelineLogger
                  logs={logs}
                  onClearLogs={handleClearLogs}
                  isMuteGuardActive={isMuteGuardActive}
                  isVibratingNow={isVibratingNow}
                />

                {/* The 3 Core Pillars Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h3 className="text-base font-bold text-white mb-4">
                    How CallVibe Solves The Call Waiting Dilemma
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-2.5">
                        <Zap className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-bold text-white mb-1">1/4 Second Vibration</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Accurately calibrated 250ms pulse gives an unmistakable tactile alert the moment the call connects.
                      </p>
                    </div>

                    <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2.5">
                        <VolumeX className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-bold text-white mb-1">Simultaneous Mute Guard</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Immediately mutes mic during vibration. Blocks vibration motor acoustic resonance from reaching receiver.
                      </p>
                    </div>

                    <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-2.5">
                        <PhoneCall className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-bold text-white mb-1">Zero Ear Fatigue</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Hold phone in hand or lap while waiting. Bring to ear only after the vibration cue confirms pickup.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Simulation Action Helper */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/30 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white">Ready to test?</span>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {callState === 'idle'
                        ? 'Tap any contact or dial a number on the phone screen to initiate an outgoing call.'
                        : callState === 'ringing'
                        ? 'Tap "Receiver Answers Call Now" on the phone screen to trigger the synchronized vibration and mute guard!'
                        : 'Call is currently connected. You can test re-triggering or end the call.'}
                    </p>
                  </div>
                  {callState === 'ringing' && (
                    <button
                      onClick={() => {
                        // Triggers the connected state on the phone
                        const el = document.querySelector('[data-simulate-answer="true"]') as HTMLButtonElement | null;
                        if (el) el.click();
                      }}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg transition-all shrink-0 cursor-pointer shadow-md shadow-emerald-500/20"
                    >
                      Answer Call
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: HAPTIC & MUTE LAB */}
        {activeTab === 'tester' && (
          <HardwareTester settings={settings} onUpdateSettings={handleUpdateSettings} />
        )}

        {/* TAB 3: ANDROID KOTLIN CODEBASE & EXPORT */}
        {activeTab === 'code' && (
          <AndroidCodeExporter
            onExportZip={handleExportZip}
            onOpenApkGuide={() => setIsApkModalOpen(true)}
            isExporting={isExporting}
          />
        )}

        {/* TAB 4: PREFERENCES & SETTINGS */}
        {activeTab === 'settings' && (
          <SettingsPanel settings={settings} onUpdateSettings={handleUpdateSettings} />
        )}
      </main>

      {/* Clean, Anti-Slop Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-5 px-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">CallVibe Guard</span>
            <span>·</span>
            <span>Android Call Connect Haptic & Mute Controller</span>
          </div>
          <div className="text-slate-500 text-[11px]">
            Compatible with Android 10, 11, 12, 13, 14, and 15 (API 26–35)
          </div>
        </div>
      </footer>
    </div>
  );
}
