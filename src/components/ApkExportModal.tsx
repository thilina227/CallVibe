import React, { useState } from 'react';
import {
  X,
  Download,
  Terminal,
  Cpu,
  Github,
  Check,
  Copy,
  FolderOpen,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

interface ApkExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportZip: () => void;
  isExporting: boolean;
}

export const ApkExportModal: React.FC<ApkExportModalProps> = ({
  isOpen,
  onClose,
  onExportZip,
  isExporting,
}) => {
  const [activeMethod, setActiveMethod] = useState<'studio' | 'cli' | 'github'>('studio');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
              APK
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">How to Export as an APK</h2>
              <p className="text-xs text-slate-400">Step-by-step guides to generate and install the .apk on your phone</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Method Selector Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 pt-2 gap-2">
          <button
            onClick={() => setActiveMethod('studio')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeMethod === 'studio'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Android Studio (Recommended)</span>
          </button>
          <button
            onClick={() => setActiveMethod('cli')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeMethod === 'cli'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Command Line (CLI)</span>
          </button>
          <button
            onClick={() => setActiveMethod('github')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeMethod === 'github'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Github className="w-4 h-4" />
            <span>Cloud Build (No Setup)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          
          {/* Quick Download Reminder Banner */}
          <div className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-slate-800">
            <div>
              <span className="text-xs font-bold text-white block">First, download the complete project files:</span>
              <span className="text-[11px] text-slate-400">Includes Kotlin sources, Gradle wrappers, manifests, and icons.</span>
            </div>
            <button
              onClick={onExportZip}
              disabled={isExporting}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 shadow-md shadow-emerald-500/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Packaging...' : 'Download Project .zip'}</span>
            </button>
          </div>

          {/* Version Specifications Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Gradle Version</span>
              <span className="font-mono text-emerald-400 font-bold text-sm">8.9</span>
              <span className="text-[10px] text-slate-400 block">(8.7 - 8.11+ supported)</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Android Plugin (AGP)</span>
              <span className="font-mono text-cyan-400 font-bold text-sm">8.6.0</span>
              <span className="text-[10px] text-slate-400 block">(8.5.x - 8.7.x)</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Java JDK</span>
              <span className="font-mono text-amber-400 font-bold text-sm">JDK 17</span>
              <span className="text-[10px] text-slate-400 block">(or JDK 21)</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Android SDK</span>
              <span className="font-mono text-indigo-400 font-bold text-sm">API 35</span>
              <span className="text-[10px] text-slate-400 block">(minSdk 26 Android 8.0)</span>
            </div>
          </div>

          {/* METHOD 1: ANDROID STUDIO */}
          {activeMethod === 'studio' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                
                <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5">
                  <span className="font-bold text-emerald-400 font-mono text-[11px]">STEP 01</span>
                  <h4 className="text-sm font-semibold text-white">Unzip & Open Project</h4>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Unzip <code className="text-slate-300">CallVibeGuard-AndroidProject.zip</code>. In Android Studio, click <strong className="text-slate-200">File &gt; Open</strong> and select the unzipped directory.
                  </p>
                </div>

                <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5">
                  <span className="font-bold text-emerald-400 font-mono text-[11px]">STEP 02</span>
                  <h4 className="text-sm font-semibold text-white">Build the APK</h4>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    In the top menu, click:
                    <br />
                    <span className="text-emerald-300 font-semibold">Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)</span>
                  </p>
                </div>

                <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5">
                  <span className="font-bold text-emerald-400 font-mono text-[11px]">STEP 03</span>
                  <h4 className="text-sm font-semibold text-white">Locate the .apk File</h4>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    When the build completes, click <strong className="text-emerald-400">locate</strong> in the notification popup. The compiled file is at:
                    <br />
                    <code className="text-[10px] text-amber-300 font-mono block mt-1 break-all bg-slate-900 p-1 rounded">
                      app/build/outputs/apk/debug/app-debug.apk
                    </code>
                  </p>
                </div>

                <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5">
                  <span className="font-bold text-emerald-400 font-mono text-[11px]">STEP 04</span>
                  <h4 className="text-sm font-semibold text-white">Install on Phone</h4>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Transfer <code className="text-slate-300">app-debug.apk</code> to your phone via USB or WhatsApp/Telegram/Drive and tap to install, or use ADB:
                    <br />
                    <code className="text-[10px] text-slate-300 font-mono block mt-1 bg-slate-900 p-1 rounded">
                      adb install app-debug.apk
                    </code>
                  </p>
                </div>

              </div>
            </div>
          )}

          {/* METHOD 2: COMMAND LINE (CLI) */}
          {activeMethod === 'cli' && (
            <div className="space-y-4 text-xs">
              <p className="text-slate-400">
                If you have the Android SDK and Java 17+ installed on your computer, you can build the APK in seconds directly from your terminal.
              </p>

              <div className="space-y-3">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-slate-300">On macOS / Linux Terminal:</span>
                    <button
                      onClick={() => copyCommand('./gradlew assembleDebug')}
                      className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      {copiedCmd === './gradlew assembleDebug' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>Copy</span>
                    </button>
                  </div>
                  <pre className="font-mono text-emerald-400 text-xs">./gradlew assembleDebug</pre>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-slate-300">On Windows Command Prompt / PowerShell:</span>
                    <button
                      onClick={() => copyCommand('gradlew.bat assembleDebug')}
                      className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      {copiedCmd === 'gradlew.bat assembleDebug' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>Copy</span>
                    </button>
                  </div>
                  <pre className="font-mono text-emerald-400 text-xs">gradlew.bat assembleDebug</pre>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-slate-300">One-step Install to Connected Device (via ADB):</span>
                    <button
                      onClick={() => copyCommand('./gradlew installDebug')}
                      className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      {copiedCmd === './gradlew installDebug' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>Copy</span>
                    </button>
                  </div>
                  <pre className="font-mono text-emerald-400 text-xs">./gradlew installDebug</pre>
                </div>
              </div>
            </div>
          )}

          {/* METHOD 3: CLOUD GITHUB ACTIONS PIPELINE & RELEASE */}
          {activeMethod === 'github' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-emerald-950/20 border border-emerald-900/40 rounded-xl">
                <span className="text-emerald-300 font-bold block mb-1">
                  Automated GitHub Release & Cloud CI Pipeline
                </span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  We pre-configured <code className="text-slate-300">.github/workflows/release-apk.yml</code> inside the exported ZIP. Pushing a version tag will automatically compile the APK, compute SHA-256 checksums, and publish an official GitHub Release with the installable <code className="text-emerald-300">.apk</code> asset attached!
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-xs">1</span>
                  <div className="flex-1">
                    <span className="font-semibold text-white block">Push Project to GitHub</span>
                    <span className="text-slate-400 text-[11px] block mt-0.5">
                      Create a repository on GitHub, extract the downloaded project ZIP, and push the files.
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-xs">2</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-white">Tag a Release (Automated Trigger)</span>
                      <button
                        onClick={() => copyCommand('git tag v1.0.0 && git push origin v1.0.0')}
                        className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                      >
                        {copiedCmd === 'git tag v1.0.0 && git push origin v1.0.0' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>Copy Tag Command</span>
                      </button>
                    </div>
                    <pre className="font-mono text-emerald-400 text-xs bg-slate-900 p-2 rounded-lg">
                      git tag v1.0.0 && git push origin v1.0.0
                    </pre>
                    <span className="text-[11px] text-slate-400 block mt-1">
                      Or go to GitHub Actions &gt; <strong>Build &amp; Release Android APK</strong> &gt; click <strong>Run workflow</strong> and type your tag name.
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-xs">3</span>
                  <div className="flex-1">
                    <span className="font-semibold text-white block">Download Your APK from GitHub Releases</span>
                    <span className="text-slate-400 text-[11px] block mt-0.5">
                      In ~2 minutes, navigate to the <strong className="text-slate-200">Releases</strong> section of your GitHub repo. You'll see <strong className="text-emerald-400">CallVibe Guard Release v1.0.0</strong> with <code className="text-amber-300">CallVibeGuard-v1.0.0.apk</code> and SHA-256 checksum ready for direct download to any phone!
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Android Permissions Note */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Android Installation & Permission Tips</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-slate-400 text-[11px] leading-relaxed">
              <li>
                <strong className="text-slate-200">Install Unknown Apps:</strong> When opening the APK on your phone for the first time, allow your browser or file manager to "Install Unknown Apps".
              </li>
              <li>
                <strong className="text-slate-200">Phone & Audio Permissions:</strong> On first launch, tap <strong className="text-emerald-400">Grant Permissions</strong> so the app can register the phone call listener and mute the mic during the 1/4 second vibration.
              </li>
              <li>
                <strong className="text-slate-200">Battery Exemption:</strong> On Samsung, Xiaomi, or OnePlus, disable battery optimization for CallVibe Guard so the foreground service remains active in the background.
              </li>
            </ul>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-xs text-slate-500">Output: app/build/outputs/apk/debug/app-debug.apk</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
