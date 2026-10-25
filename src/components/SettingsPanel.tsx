import React from 'react';
import { AppSettings } from '../types';
import {
  Sliders,
  ShieldCheck,
  Zap,
  Volume2,
  VolumeX,
  PhoneOff,
  Radio,
  Clock,
  Sparkles,
} from 'lucide-react';

interface SettingsPanelProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onUpdateSettings,
}) => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Overview Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white tracking-tight">
          Haptic & Call Telephony Preferences
        </h2>
        <p className="text-sm text-slate-400 mt-1 leading-relaxed">
          Fine-tune vibration duration, microphone mute buffers, and telephony detection strategies for your device.
        </p>
      </div>

      {/* Main Settings Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        {/* 1. Vibration Duration Slider */}
        <div className="space-y-2 pb-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Vibration Duration
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Exact duration of the haptic buzz when the remote party answers
              </p>
            </div>
            <div className="text-right">
              <span className="text-base font-bold text-amber-300 font-mono">
                {settings.vibrationDurationMs} ms
              </span>
              <span className="text-xs text-slate-400 block">
                {settings.vibrationDurationMs === 250
                  ? 'Exact 1/4 second'
                  : `${(settings.vibrationDurationMs / 1000).toFixed(2)}s`}
              </span>
            </div>
          </div>

          <input
            type="range"
            min={100}
            max={500}
            step={25}
            value={settings.vibrationDurationMs}
            onChange={(e) => onUpdateSettings({ vibrationDurationMs: Number(e.target.value) })}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
          <div className="flex justify-between text-[11px] text-slate-500 font-mono">
            <span>100ms (Micro)</span>
            <span className="text-amber-400 font-semibold">250ms (1/4 Second Default)</span>
            <span>500ms (Heavy)</span>
          </div>
        </div>

        {/* 2. Microphone Mute Guard */}
        <div className="flex items-start justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <VolumeX className="w-4 h-4 text-emerald-400" />
              Microphone Mute Guard (Acoustic Isolation)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
              Simultaneously silences the device microphone during the vibration pulse so the vibration motor rattle and buzzing hum cannot be picked up and transmitted into the receiver’s earpiece.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={settings.muteMicrophone}
              onChange={(e) => onUpdateSettings({ muteMicrophone: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>

        {/* 3. Safety Mute Post-Vibe Buffer */}
        {settings.muteMicrophone && (
          <div className="space-y-2 pb-6 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Post-Vibration Mute Buffer
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Brief grace period to absorb mechanical motor spin-down vibration before unmuting
                </p>
              </div>
              <span className="text-sm font-bold text-emerald-300 font-mono">
                +{settings.muteExtraBufferMs} ms
              </span>
            </div>

            <input
              type="range"
              min={0}
              max={100}
              step={10}
              value={settings.muteExtraBufferMs}
              onChange={(e) => onUpdateSettings({ muteExtraBufferMs: Number(e.target.value) })}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
            <div className="flex justify-between text-[11px] text-slate-500 font-mono">
              <span>0ms (Immediate)</span>
              <span className="text-emerald-400">30ms (Optimal)</span>
              <span>100ms (Extended)</span>
            </div>
          </div>
        )}

        {/* 4. Haptic Pulse Profile */}
        <div className="space-y-2 pb-6 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            Haptic Intensity Profile
          </h3>
          <p className="text-xs text-slate-400">
            Hardware vibration waveform for linear resonant actuators (LRA / ERM)
          </p>

          <div className="grid grid-cols-3 gap-3 pt-1">
            {(['gentle', 'normal', 'crisp'] as const).map((intensity) => (
              <button
                key={intensity}
                onClick={() => onUpdateSettings({ vibrateIntensity: intensity })}
                className={`p-3 rounded-xl border text-xs font-semibold capitalize transition-all cursor-pointer ${
                  settings.vibrateIntensity === intensity
                    ? 'bg-amber-950/40 border-amber-500 text-amber-300'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {intensity}
              </button>
            ))}
          </div>
        </div>

        {/* 5. Vibrate on Call End */}
        <div className="flex items-start justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <PhoneOff className="w-4 h-4 text-rose-400" />
              Vibrate on Call Termination
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
              Provides a gentle 120ms tactile vibration when the other party hangs up or disconnects.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={settings.vibrateOnCallEnd}
              onChange={(e) => onUpdateSettings({ vibrateOnCallEnd: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>

        {/* 6. Simulator Audio & Auto-Answer Delay */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                Web Audio Synthesizer
              </span>
              <input
                type="checkbox"
                checked={settings.playAudioSim}
                onChange={(e) => onUpdateSettings({ playAudioSim: e.target.checked })}
                className="rounded accent-emerald-400 cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Plays real DTMF dial tones, North American ringback tone, and receiver audio simulation.
            </p>
          </div>

          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                Simulator Auto-Answer
              </span>
              <select
                value={settings.autoAnswerDelaySec}
                onChange={(e) => onUpdateSettings({ autoAnswerDelaySec: Number(e.target.value) })}
                className="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-2 py-1 cursor-pointer"
              >
                <option value={0}>Manual Click Only</option>
                <option value={3}>After 3 Seconds (1 Ring)</option>
                <option value={5}>After 5 Seconds (2 Rings)</option>
              </select>
            </div>
            <p className="text-[11px] text-slate-400">
              Simulates the other party picking up automatically after the specified ringing time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
