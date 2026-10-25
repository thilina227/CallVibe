import React from 'react';
import { TimelineLogEntry } from '../types';
import { CheckCircle2, VolumeX, Smartphone, PhoneCall, Zap, Clock, ShieldCheck, Trash2 } from 'lucide-react';

interface TimelineLoggerProps {
  logs: TimelineLogEntry[];
  onClearLogs: () => void;
  isMuteGuardActive: boolean;
  isVibratingNow: boolean;
}

export const TimelineLogger: React.FC<TimelineLoggerProps> = ({
  logs,
  onClearLogs,
  isMuteGuardActive,
  isVibratingNow,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col h-full">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-base font-semibold text-white">Call Telephony & Acoustic Timeline</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time microsecond-level synchronization of haptic answer pulse & mic mute guard
          </p>
        </div>
        <div className="flex items-center gap-2">
          {logs.length > 0 && (
            <button
              onClick={onClearLogs}
              className="text-xs text-slate-400 hover:text-rose-400 px-2.5 py-1.5 rounded-lg border border-slate-800 hover:border-rose-900/50 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Clear event logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Status Indicators */}
      <div className="grid grid-cols-2 gap-3 my-4">
        <div
          className={`p-3 rounded-xl border transition-all ${
            isVibratingNow
              ? 'bg-amber-950/40 border-amber-500/50 shadow-lg shadow-amber-500/10'
              : 'bg-slate-950/60 border-slate-800/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Vibration Motor</span>
            <Smartphone className={`w-4 h-4 ${isVibratingNow ? 'text-amber-400 animate-bounce' : 'text-slate-600'}`} />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`text-sm font-bold ${isVibratingNow ? 'text-amber-300' : 'text-slate-500'}`}>
              {isVibratingNow ? 'Vibrating (1/4s pulse)' : 'Idle'}
            </span>
            {isVibratingNow && (
              <span className="text-[11px] font-mono text-amber-400/80">250ms</span>
            )}
          </div>
        </div>

        <div
          className={`p-3 rounded-xl border transition-all ${
            isMuteGuardActive
              ? 'bg-emerald-950/40 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
              : 'bg-slate-950/60 border-slate-800/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Microphone Guard</span>
            <VolumeX className={`w-4 h-4 ${isMuteGuardActive ? 'text-emerald-400' : 'text-slate-600'}`} />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`text-sm font-bold ${isMuteGuardActive ? 'text-emerald-300' : 'text-slate-500'}`}>
              {isMuteGuardActive ? 'Muted (Buzz Suppressed)' : 'Active (Unmuted)'}
            </span>
          </div>
        </div>
      </div>

      {/* Event Stream */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[260px] max-h-[380px]">
        {logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Clock className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm font-medium text-slate-400">No events logged yet</p>
            <p className="text-xs text-slate-500 max-w-xs mt-1">
              Place a test call on the simulated phone to observe the simultaneous 250ms vibration pulse and microphone acoustic mute in action.
            </p>
          </div>
        ) : (
          logs.map((log) => {
            const isAnswerOrHaptic = log.phase === 'ANSWER_DETECTED' || log.phase === 'HAPTIC_START' || log.phase === 'MIC_MUTE';
            return (
              <div
                key={log.id}
                className={`p-3 rounded-xl border text-xs transition-colors ${
                  log.isHighlight
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                    : isAnswerOrHaptic
                    ? 'bg-slate-800/80 border-slate-700/80 text-slate-200'
                    : 'bg-slate-950/40 border-slate-800/60 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {log.phase === 'MIC_MUTE' ? (
                      <VolumeX className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : log.phase === 'HAPTIC_START' ? (
                      <Smartphone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    ) : log.phase === 'ANSWER_DETECTED' ? (
                      <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    )}
                    <span className="font-semibold text-white">{log.message}</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400 tabular-nums shrink-0">
                    +{log.offsetMs}ms
                  </span>
                </div>
                {log.details && (
                  <p className="mt-1 text-[11px] text-slate-400 pl-5.5 leading-relaxed">
                    {log.details}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Acoustic Isolation Guarantee note */}
      <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>
          Acoustic Guarantee: Receiver earpiece hears zero motor buzz while caller receives instantaneous haptic notification.
        </span>
      </div>
    </div>
  );
};
