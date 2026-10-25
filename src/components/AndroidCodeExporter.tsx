import React, { useState } from 'react';
import { ANDROID_FILES } from '../data/androidSourceCode';
import { AndroidSourceFile } from '../types';
import {
  FileCode,
  Download,
  Copy,
  Check,
  FolderGit2,
  Terminal,
  ExternalLink,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';

interface AndroidCodeExporterProps {
  onExportZip: () => void;
  onOpenApkGuide: () => void;
  isExporting: boolean;
}

export const AndroidCodeExporter: React.FC<AndroidCodeExporterProps> = ({
  onExportZip,
  onOpenApkGuide,
  isExporting,
}) => {
  const [selectedFile, setSelectedFile] = useState<AndroidSourceFile>(ANDROID_FILES[1]); // CallAudioVibrateController.kt by default
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header and Download CTA */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Ready for Android Studio & APK Export
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Production Android Kotlin Codebase
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Full source code with <code className="text-slate-300">InCallService</code>, persistent <code className="text-slate-300">ForegroundService</code>, <code className="text-slate-300">AudioManager</code> muting hooks, and modern Jetpack Compose UI.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenApkGuide}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-white font-semibold text-sm border border-slate-700 transition-all cursor-pointer whitespace-nowrap"
          >
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>How to Export APK</span>
          </button>
          <button
            onClick={onExportZip}
            disabled={isExporting}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Creating ZIP...' : 'Download Project (.zip)'}</span>
          </button>
        </div>
      </div>

      {/* Code Browser Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: File Tree */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col">
          <div className="flex items-center gap-2 pb-3 mb-2 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <FolderGit2 className="w-4 h-4 text-emerald-400" />
            <span>Project Explorer (8 files)</span>
          </div>

          <div className="space-y-1 overflow-y-auto max-h-[560px]">
            {ANDROID_FILES.map((file) => {
              const isSelected = selectedFile.name === file.name;
              return (
                <button
                  key={file.name}
                  onClick={() => {
                    setSelectedFile(file);
                    setCopied(false);
                  }}
                  className={`w-full text-left p-3 rounded-xl text-xs transition-all flex flex-col gap-1 cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800 text-white border border-emerald-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold font-mono text-[13px]">{file.name}</span>
                    <span className="text-[10px] text-slate-400 uppercase font-mono px-1.5 py-0.5 rounded bg-slate-950/80">
                      {file.language}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 truncate">{file.path}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Code Viewer */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col">
          {/* File Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white font-mono">{selectedFile.name}</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{selectedFile.description}</p>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs text-slate-200 border border-slate-700 transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy File</span>
                </>
              )}
            </button>
          </div>

          {/* Code Body */}
          <div className="flex-1 bg-slate-950 rounded-xl p-4 overflow-x-auto border border-slate-800/80 font-mono text-xs text-slate-300 leading-relaxed max-h-[500px]">
            <pre>
              <code>{selectedFile.content}</code>
            </pre>
          </div>
        </div>
      </div>

      {/* Build & Installation Guide for Android Devices */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <h3 className="text-base font-bold text-white">How to Run on Real Android Devices (Android 10 - 15)</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300 mt-4">
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
            <span className="font-bold text-white block mb-1">1. Open in Android Studio</span>
            <p className="text-slate-400 leading-relaxed">
              Unpack the exported <code className="text-slate-300">CallVibeGuard.zip</code>, open Android Studio, select <strong className="text-slate-200">Open</strong>, and allow Gradle to sync dependencies.
            </p>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
            <span className="font-bold text-white block mb-1">2. Grant Runtime Permissions</span>
            <p className="text-slate-400 leading-relaxed">
              On launch, the Jetpack Compose UI requests <code className="text-emerald-400">READ_PHONE_STATE</code> and <code className="text-emerald-400">MODIFY_AUDIO_SETTINGS</code> to enable instantaneous vibration and mic mute.
            </p>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
            <span className="font-bold text-white block mb-1">3. Battery Optimization Exemption</span>
            <p className="text-slate-400 leading-relaxed">
              For continuous background listening on Xiaomi, Samsung, or OnePlus, tap "Disable Battery Optimization" so the OS keeps the Foreground Service alive.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
