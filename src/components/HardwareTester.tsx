import React, { useState } from 'react';
import { AppSettings } from '../types';
import { vibrationService } from '../services/vibrationService';
import { audioSynth } from '../services/audioSynth';
import {
  Smartphone,
  VolumeX,
  Volume2,
  Play,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  Sliders,
  Sparkles,
  Cpu,
  Layers,
} from 'lucide-react';

interface HardwareTesterProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
}

export const HardwareTester: React.FC<HardwareTesterProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const [isVibrating, setIsVibrating] = useState<boolean>(false);
  const [isPlayingWithoutMute, setIsPlayingWithoutMute] = useState<boolean>(false);
  const [isPlayingWithMute, setIsPlayingWithMute] = useState<boolean>(false);

  const testPhysicalVibration = () => {
    setIsVibrating(true);
    vibrationService.vibrate(settings.vibrationDurationMs, settings.vibrateIntensity);
    if (settings.playAudioSim) {
      audioSynth.playHapticClickSound();
    }
    setTimeout(() => {
      setIsVibrating(false);
    }, settings.vibrationDurationMs);
  };

  const testWithoutMuteGuard = () => {
    setIsPlayingWithoutMute(true);
    // Plays the motor acoustic buzz leak that the other party would hear if mic is NOT muted!
    audioSynth.playVibrationAcousticLeak(false, settings.vibrationDurationMs);
    setTimeout(() => {
      setIsPlayingWithoutMute(false);
    }, settings.vibrationDurationMs + 200);
  };

  const testWithMuteGuard = () => {
    setIsPlayingWithMute(true);
    // Plays with mute guard active: pristine silence for the receiver!
    audioSynth.playVibrationAcousticLeak(true, settings.vibrationDurationMs);
    setTimeout(() => {
      setIsPlayingWithMute(false);
    }, settings.vibrationDurationMs + 200);
  };

  const isWebVibeSupported = vibrationService.isSupported();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Overview Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white tracking-tight">
          Haptic & Acoustic Isolation Lab
        </h2>
        <p className="text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
          Experience and benchmark the 1/4 second (250ms) vibration timing and hear the acoustic difference
          when simultaneous microphone muting is applied to protect the receiver from motor buzzing.
        </p>
      </div>

      {/* Grid: Physical Haptic Test & Acoustic Leak Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: Direct 1/4s Vibration Trigger */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="w-4 h-4" />
                Haptic Engine
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {isWebVibeSupported ? 'Hardware API Ready' : 'Desktop Preview'}
              </span>
            </div>

            <h3 className="text-lg font-bold text-white">Direct 250ms Vibration Test</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Triggers the exact 1/4 second tactile pulse. On Android devices or mobile browsers supporting the Web Vibration API, your physical phone will vibrate right now.
            </p>

            <div className="my-5 p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Target Duration:</span>
                <span className="font-mono text-amber-300 font-bold">{settings.vibrationDurationMs} ms (1/4 second)</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Pattern Mode:</span>
                <span className="capitalize text-slate-300 font-medium">{settings.vibrateIntensity} Single-Shot</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Android API:</span>
                <span className="font-mono text-slate-400 text-[11px]">VibrationEffect.createOneShot()</span>
              </div>
            </div>
          </div>

          <button
            onClick={testPhysicalVibration}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isVibrating
                ? 'bg-amber-500 text-slate-950 scale-[0.98]'
                : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-500/20 active:scale-[0.98]'
            }`}
          >
            <Smartphone className={`w-4 h-4 ${isVibrating ? 'animate-bounce' : ''}`} />
            <span>{isVibrating ? 'Vibrating (250ms)...' : 'Trigger 1/4s Vibration Pulse'}</span>
          </button>
        </div>

        {/* Card 2: Acoustic Comparison (What the Receiver Hears) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <VolumeX className="w-4 h-4" />
                Acoustic Guard Comparison
              </span>
              <span className="text-xs text-slate-400 font-mono">Receiver Audio Feed</span>
            </div>

            <h3 className="text-lg font-bold text-white">Receiver Ear Simulation</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Compare what the other party hears when you answer with standard vibration versus CallVibe Guard's simultaneous mic mute.
            </p>

            <div className="space-y-3 my-5">
              {/* Option A: Without Guard */}
              <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-300">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Without Mute Guard</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Motor buzz leaks into mic (annoying crackle for receiver)
                  </p>
                </div>
                <button
                  onClick={testWithoutMuteGuard}
                  disabled={isPlayingWithoutMute}
                  className="px-3 py-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 text-xs font-medium border border-rose-500/30 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{isPlayingWithoutMute ? 'Buzzing...' : 'Listen'}</span>
                </button>
              </div>

              {/* Option B: With CallVibe Guard */}
              <div className="p-3 bg-emerald-950/30 border border-emerald-900/50 rounded-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>With CallVibe Mute Guard</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Mic muted simultaneously (pristine silence, zero disturbance)
                  </p>
                </div>
                <button
                  onClick={testWithMuteGuard}
                  disabled={isPlayingWithMute}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium border border-emerald-400/40 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-sm shadow-emerald-500/20"
                >
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>{isPlayingWithMute ? 'Silenced' : 'Listen'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Simultaneous mute activates at T+0ms and releases after 280ms.</span>
          </div>
        </div>
      </div>

      {/* Synchronization Architecture Diagram */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-base font-bold text-white mb-2">Simultaneous Execution Pipeline</h3>
        <p className="text-xs text-slate-400 mb-6">
          How CallVibe Guard achieves concurrent zero-latency vibration and acoustic protection in Android OS
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
            <div className="text-xs font-mono text-cyan-400 font-semibold mb-1">01. T+0 ms</div>
            <div className="text-sm font-bold text-white mb-1">Telephony Trigger</div>
            <p className="text-xs text-slate-400">
              <code className="text-slate-300">InCallService.Callback</code> fires <code className="text-emerald-400">STATE_ACTIVE</code> when receiver lifts receiver.
            </p>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-emerald-900/40">
            <div className="text-xs font-mono text-emerald-400 font-semibold mb-1">02. T+0 ms (Parallel)</div>
            <div className="text-sm font-bold text-white mb-1">Mic Mute Guard</div>
            <p className="text-xs text-slate-400">
              <code className="text-slate-300">audioManager.isMicrophoneMute = true</code> blocks incoming acoustic audio instantaneously.
            </p>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-amber-900/40">
            <div className="text-xs font-mono text-amber-400 font-semibold mb-1">03. T+0 ms (Parallel)</div>
            <div className="text-sm font-bold text-white mb-1">1/4s Vibration Pulse</div>
            <p className="text-xs text-slate-400">
              <code className="text-slate-300">vibrator.vibrate(250ms)</code> delivers crisp haptic cue to caller's hand or pocket.
            </p>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
            <div className="text-xs font-mono text-indigo-400 font-semibold mb-1">04. T+280 ms</div>
            <div className="text-sm font-bold text-white mb-1">Seamless Unmute</div>
            <p className="text-xs text-slate-400">
              <code className="text-slate-300">audioManager.isMicrophoneMute = false</code> restores conversation audio automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
