import React, { useState, useEffect, useRef } from 'react';
import { CallState, Contact, AppSettings } from '../types';
import { MOCK_CONTACTS } from '../data/mockContacts';
import { audioSynth } from '../services/audioSynth';
import { vibrationService } from '../services/vibrationService';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  Delete,
  User,
  ShieldCheck,
  Zap,
  Wifi,
  BatteryMedium,
  Sparkles,
  Signal,
  RotateCcw,
} from 'lucide-react';

interface PhoneSimulatorProps {
  settings: AppSettings;
  callState: CallState;
  setCallState: (state: CallState) => void;
  onLogEvent: (phase: any, type: any, message: string, details?: string, highlight?: boolean) => void;
  isVibratingNow: boolean;
  setIsVibratingNow: (v: boolean) => void;
  isMuteGuardActive: boolean;
  setIsMuteGuardActive: (m: boolean) => void;
}

export const PhoneSimulator: React.FC<PhoneSimulatorProps> = ({
  settings,
  callState,
  setCallState,
  onLogEvent,
  isVibratingNow,
  setIsVibratingNow,
  isMuteGuardActive,
  setIsMuteGuardActive,
}) => {
  const [dialedNumber, setDialedNumber] = useState<string>('');
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [callDurationSec, setCallDurationSec] = useState<number>(0);
  const [isManualMuted, setIsManualMuted] = useState<boolean>(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState<boolean>(false);
  const [autoAnswerCountdown, setAutoAnswerCountdown] = useState<number | null>(null);

  const timerRef = useRef<number | null>(null);
  const autoAnswerTimeoutRef = useRef<number | null>(null);
  const callStartTimeRef = useRef<number>(0);

  // Time display for phone status bar
  const [currentTime, setCurrentTime] = useState<string>('09:41');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Call duration counter
  useEffect(() => {
    if (callState === 'connected') {
      timerRef.current = window.setInterval(() => {
        setCallDurationSec((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  // Clean up audio & timeouts when unmounting
  useEffect(() => {
    return () => {
      audioSynth.stopRingbackTone();
      if (autoAnswerTimeoutRef.current) clearTimeout(autoAnswerTimeoutRef.current);
    };
  }, []);

  const handleKeyPress = (char: string) => {
    if (dialedNumber.length < 16) {
      setDialedNumber((prev) => prev + char);
      if (settings.playAudioSim) {
        audioSynth.playDtmf(char);
      }
    }
  };

  const handleBackspace = () => {
    setDialedNumber((prev) => prev.slice(0, -1));
  };

  const startCall = (targetContact?: Contact) => {
    const contact = targetContact || {
      id: 'custom',
      name: dialedNumber || 'Unknown Number',
      number: dialedNumber || '555-0199',
      avatarBg: 'bg-emerald-600',
      initials: '?',
    };

    setActiveContact(contact);
    setCallState('dialing');
    setCallDurationSec(0);
    setIsManualMuted(false);
    callStartTimeRef.current = Date.now();

    onLogEvent(
      'DIAL',
      'telephony',
      `Outgoing call initiated to ${contact.name}`,
      `State: CALL_STATE_DIALING (${contact.number})`
    );

    // After 1 second, transition to RINGING and play ringback tone
    setTimeout(() => {
      setCallState('ringing');
      if (settings.playAudioSim) {
        audioSynth.startRingbackTone();
      }
      onLogEvent(
        'RING',
        'telephony',
        'Remote exchange ringing',
        'Playing 440Hz+480Hz dual-frequency audible ringback tone'
      );

      // Auto-answer logic if configured
      if (settings.autoAnswerDelaySec > 0) {
        setAutoAnswerCountdown(settings.autoAnswerDelaySec);
        let remaining = settings.autoAnswerDelaySec;
        const countdownInterval = setInterval(() => {
          remaining -= 1;
          setAutoAnswerCountdown(remaining);
          if (remaining <= 0) {
            clearInterval(countdownInterval);
            triggerCallAnswer();
          }
        }, 1000);
        autoAnswerTimeoutRef.current = countdownInterval as unknown as number;
      }
    }, 1200);
  };

  /**
   * The Crucial Call Answer / Connect Event
   * Triggers simultaneous 250ms vibration and microphone mute guard!
   */
  const triggerCallAnswer = () => {
    if (autoAnswerTimeoutRef.current) {
      clearInterval(autoAnswerTimeoutRef.current);
      autoAnswerTimeoutRef.current = null;
    }
    setAutoAnswerCountdown(null);

    // Stop ringback tone instantly
    audioSynth.stopRingbackTone();

    // 1. Answer detected
    onLogEvent(
      'ANSWER_DETECTED',
      'telephony',
      'Remote party picked up call!',
      'State transition: STATE_DIALING/RINGING -> STATE_ACTIVE (OFFHOOK)',
      true
    );

    setCallState('connected');

    const vibrationMs = settings.vibrationDurationMs;
    const shouldMute = settings.muteMicrophone;
    const totalMuteDuration = vibrationMs + (shouldMute ? settings.muteExtraBufferMs : 0);

    // 2. SIMULTANEOUS MICROPHONE MUTE GUARD
    if (shouldMute) {
      setIsMuteGuardActive(true);
      onLogEvent(
        'MIC_MUTE',
        'audio',
        'Microphone Muted Simultaneously',
        `AudioManager.isMicrophoneMute = true (Acoustic protection active for ${totalMuteDuration}ms)`,
        true
      );
    }

    // 3. SIMULTANEOUS 1/4 SECOND VIBRATION (250ms)
    setIsVibratingNow(true);
    onLogEvent(
      'HAPTIC_START',
      'haptic',
      `Hardware Vibration Pulse Started (${vibrationMs}ms)`,
      `VibrationEffect.createOneShot(${vibrationMs}ms, DEFAULT_AMPLITUDE). Distinct 1/4 second tactile alert for caller.`,
      true
    );

    vibrationService.vibrate(vibrationMs, settings.vibrateIntensity);

    // Play subtle audio click / or motor buzz acoustic leak if mute is disabled
    if (settings.playAudioSim) {
      if (!shouldMute) {
        // Without mute guard, receiver hears motor acoustic leak
        audioSynth.playVibrationAcousticLeak(false, vibrationMs);
      } else {
        // With mute guard, caller hears crisp click, receiver hears clean silence
        audioSynth.playHapticClickSound();
      }
    }

    // 4. STOP VIBRATION AT EXACT TIME
    setTimeout(() => {
      setIsVibratingNow(false);
      onLogEvent(
        'HAPTIC_END',
        'haptic',
        `Vibration Completed (${vibrationMs}ms)`,
        'Vibration motor spun down. Caller alerted to answered call.'
      );
    }, vibrationMs);

    // 5. UNMUTE MICROPHONE (Vibration Duration + buffer)
    setTimeout(() => {
      if (shouldMute) {
        setIsMuteGuardActive(false);
        onLogEvent(
          'MIC_UNMUTE',
          'audio',
          'Microphone Automatically Restored (Unmuted)',
          'AudioManager.isMicrophoneMute = false. Call audio clear; user can speak naturally without clicks or delays.',
          true
        );
      }
      onLogEvent(
        'CALL_ACTIVE',
        'telephony',
        'Call in active two-way conversation',
        'User brought phone to ear upon tactile vibration notification.'
      );
    }, totalMuteDuration);
  };

  const endCall = () => {
    if (autoAnswerTimeoutRef.current) {
      clearInterval(autoAnswerTimeoutRef.current);
      autoAnswerTimeoutRef.current = null;
    }
    setAutoAnswerCountdown(null);

    audioSynth.stopRingbackTone();
    if (settings.playAudioSim) {
      audioSynth.playCallEndTone();
    }

    if (settings.vibrateOnCallEnd) {
      vibrationService.vibrate(120, 'gentle');
      onLogEvent(
        'CALL_END',
        'haptic',
        'Call Ended - 120ms gentle vibration',
        'Notified user that call has hung up.'
      );
    } else {
      onLogEvent('CALL_END', 'telephony', 'Call Ended', 'Call disconnected.');
    }

    setIsVibratingNow(false);
    setIsMuteGuardActive(false);
    setCallState('ended');

    setTimeout(() => {
      setCallState('idle');
      setActiveContact(null);
      setCallDurationSec(0);
    }, 1200);
  };

  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center">
      {/* Smartphone Outer Chassis with realistic vibration physical shake animation */}
      <div
        className={`relative w-[340px] h-[690px] bg-slate-950 rounded-[48px] p-3 shadow-2xl border-4 border-slate-700/80 transition-all duration-100 ${
          isVibratingNow ? 'animate-vibrate shadow-amber-500/20 border-amber-500/70' : ''
        }`}
      >
        {/* Hardware buttons on phone edge */}
        <div className="absolute -left-[7px] top-28 w-[3px] h-12 bg-slate-700 rounded-l-sm" />
        <div className="absolute -left-[7px] top-44 w-[3px] h-12 bg-slate-700 rounded-l-sm" />
        <div className="absolute -right-[7px] top-32 w-[3px] h-16 bg-slate-700 rounded-r-sm" />

        {/* Screen Bezel and Display Area */}
        <div className="relative w-full h-full bg-slate-900 rounded-[38px] overflow-hidden flex flex-col justify-between border border-slate-800">
          
          {/* Top Status Bar with Camera Punch Hole & Persistent Guard Icon */}
          <div className="pt-3 px-5 flex items-center justify-between text-xs text-slate-300 z-20 select-none">
            <span className="font-semibold text-[13px]">{currentTime}</span>

            {/* Camera Punch Hole */}
            <div className="w-4 h-4 bg-black rounded-full border border-slate-800 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-slate-900 rounded-full" />
            </div>

            <div className="flex items-center gap-1.5">
              {/* CallVibe Guard persistent status icon */}
              <div
                title="CallVibe Guard Service Active"
                className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400"
              >
                <Zap className="w-2.5 h-2.5" />
              </div>
              <Signal className="w-3.5 h-3.5 text-slate-300" />
              <Wifi className="w-3.5 h-3.5 text-slate-300" />
              <BatteryMedium className="w-4 h-4 text-slate-300" />
            </div>
          </div>

          {/* Persistent Notification Pill inside simulated phone */}
          <div className="px-3 pt-1">
            <div className="bg-slate-800/90 border border-slate-700/60 rounded-xl px-2.5 py-1.5 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-medium text-slate-200">CallVibe Guard</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">1/4s Vibe & Mute ON</span>
            </div>
          </div>

          {/* SCREEN CONTENT: DIALER VS IN-CALL */}
          {callState === 'idle' ? (
            /* DIALER SCREEN */
            <div className="flex-1 flex flex-col justify-between px-4 py-2">
              {/* Dialed Number Display */}
              <div className="h-16 flex items-center justify-between border-b border-slate-800/80 px-2 mt-2">
                <div className="text-2xl font-bold tracking-wider text-white font-mono overflow-x-auto whitespace-nowrap">
                  {dialedNumber || <span className="text-slate-600 font-sans font-normal text-lg">Dial number or tap contact</span>}
                </div>
                {dialedNumber && (
                  <button
                    onClick={handleBackspace}
                    className="p-2 text-slate-400 hover:text-white active:scale-95 transition-transform cursor-pointer"
                  >
                    <Delete className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Quick Contacts Row */}
              <div className="my-2">
                <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1.5 px-1">
                  Speed Dial / Contacts
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {MOCK_CONTACTS.slice(0, 3).map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => startCall(contact)}
                      className="p-2 bg-slate-800/60 hover:bg-slate-800 rounded-xl text-left border border-slate-800 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <div className={`w-7 h-7 rounded-full ${contact.avatarBg} text-white text-[10px] font-bold flex items-center justify-center shrink-0`}>
                        {contact.initials}
                      </div>
                      <div className="truncate text-left">
                        <div className="text-xs font-semibold text-white truncate">{contact.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">Call</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dialpad Matrix */}
              <div className="grid grid-cols-3 gap-2.5 my-1">
                {[
                  { num: '1', letters: '' },
                  { num: '2', letters: 'ABC' },
                  { num: '3', letters: 'DEF' },
                  { num: '4', letters: 'GHI' },
                  { num: '5', letters: 'JKL' },
                  { num: '6', letters: 'MNO' },
                  { num: '7', letters: 'PQRS' },
                  { num: '8', letters: 'TUV' },
                  { num: '9', letters: 'WXYZ' },
                  { num: '*', letters: '' },
                  { num: '0', letters: '+' },
                  { num: '#', letters: '' },
                ].map((item) => (
                  <button
                    key={item.num}
                    onClick={() => handleKeyPress(item.num)}
                    className="h-13 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-slate-600 transition-all flex flex-col items-center justify-center border border-slate-800 cursor-pointer"
                  >
                    <span className="text-xl font-semibold text-white leading-none">{item.num}</span>
                    {item.letters && (
                      <span className="text-[9px] font-medium text-slate-400 tracking-widest mt-0.5">
                        {item.letters}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Call Action Button */}
              <div className="flex justify-center pb-2 pt-1">
                <button
                  onClick={() => startCall()}
                  className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-all cursor-pointer"
                  title="Make call"
                >
                  <Phone className="w-7 h-7" />
                </button>
              </div>
            </div>
          ) : (
            /* IN-CALL SCREEN (DIALING / RINGING / CONNECTED) */
            <div className="flex-1 flex flex-col justify-between px-5 py-3 relative">
              {/* Remote Contact Header */}
              <div className="flex flex-col items-center text-center mt-2">
                <div className="relative mb-3">
                  {/* Avatar with haptic visual ripples when vibrating */}
                  <div className={`w-20 h-20 rounded-full ${activeContact?.avatarBg || 'bg-emerald-600'} text-white font-bold text-2xl flex items-center justify-center shadow-lg`}>
                    {activeContact?.initials || <User className="w-10 h-10" />}
                  </div>

                  {/* Pulsing Haptic Rings during the 250ms connect burst */}
                  {isVibratingNow && (
                    <>
                      <div className="absolute inset-0 rounded-full border-4 border-amber-400 animate-ping opacity-75" />
                      <div className="absolute -inset-3 rounded-full border-2 border-amber-300 animate-pulse opacity-90" />
                    </>
                  )}
                </div>

                <h2 className="text-xl font-bold text-white tracking-tight">{activeContact?.name}</h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{activeContact?.number}</p>

                {/* Status indicator badge */}
                <div className="mt-3">
                  {callState === 'dialing' && (
                    <span className="text-xs font-medium text-amber-400 flex items-center gap-1.5 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      Calling...
                    </span>
                  )}
                  {callState === 'ringing' && (
                    <span className="text-xs font-medium text-cyan-400 flex items-center gap-1.5 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      Ringing... (Waiting for answer)
                    </span>
                  )}
                  {callState === 'connected' && (
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-bold text-emerald-400 font-mono">
                        {formatDuration(callDurationSec)}
                      </span>
                      <span className="text-[10px] text-slate-400">Call Connected</span>
                    </div>
                  )}
                  {callState === 'ended' && (
                    <span className="text-xs font-medium text-rose-400">Call Ended</span>
                  )}
                </div>
              </div>

              {/* SIMULTANEOUS VIBRATION & MUTE GUARD OVERLAY */}
              <div className="my-auto py-2">
                {isVibratingNow && (
                  <div className="bg-amber-950/80 border border-amber-500/80 rounded-2xl p-3 text-center shadow-lg shadow-amber-500/20 animate-pulse">
                    <div className="flex items-center justify-center gap-1.5 text-amber-300 text-xs font-bold">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span>1/4 SECOND HAPTIC PULSE</span>
                    </div>
                    <p className="text-[11px] text-amber-200 mt-0.5">
                      Phone vibrating for 250ms to alert you that the call answered!
                    </p>
                  </div>
                )}

                {isMuteGuardActive && (
                  <div className="mt-2 bg-emerald-950/80 border border-emerald-500/80 rounded-2xl p-2.5 text-center shadow-lg shadow-emerald-500/20">
                    <div className="flex items-center justify-center gap-1.5 text-emerald-300 text-xs font-bold">
                      <MicOff className="w-3.5 h-3.5 text-emerald-400" />
                      <span>MIC MUTED SIMULTANEOUSLY</span>
                    </div>
                    <p className="text-[10px] text-emerald-200 mt-0.5">
                      Suppressed vibration motor rattle from disturbing receiver!
                    </p>
                  </div>
                )}

                {/* If Ringing: Show prominent Simulate Answer Button */}
                {callState === 'ringing' && (
                  <div className="space-y-2 mt-4">
                    <button
                      onClick={triggerCallAnswer}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Zap className="w-4 h-4 text-amber-300" />
                      <span>Receiver Answers Call Now</span>
                    </button>
                    {autoAnswerCountdown !== null && (
                      <div className="text-center text-[11px] text-slate-400 font-mono">
                        Auto-answering in {autoAnswerCountdown}s...
                      </div>
                    )}
                  </div>
                )}

                {/* If Connected and Normal: Audio wave visualizer */}
                {callState === 'connected' && !isVibratingNow && (
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col items-center">
                    <div className="flex items-center gap-1 h-6">
                      {[30, 60, 90, 45, 80, 100, 70, 50, 85, 40, 65, 30].map((h, i) => (
                        <div
                          key={i}
                          className="w-1 bg-emerald-400/80 rounded-full animate-pulse"
                          style={{
                            height: `${h}%`,
                            animationDelay: `${i * 70}ms`,
                            animationDuration: '600ms',
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1">Live Call Audio Clean & Clear</span>
                  </div>
                )}
              </div>

              {/* Call Controls Bar */}
              <div className="space-y-3 pb-4">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setIsManualMuted(!isManualMuted)}
                    className={`h-11 rounded-xl flex flex-col items-center justify-center text-xs transition-colors cursor-pointer ${
                      isManualMuted || isMuteGuardActive
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {isManualMuted || isMuteGuardActive ? (
                      <MicOff className="w-4 h-4 mb-0.5 text-rose-400" />
                    ) : (
                      <Mic className="w-4 h-4 mb-0.5" />
                    )}
                    <span className="text-[9px]">{isMuteGuardActive ? 'Auto-Muted' : isManualMuted ? 'Muted' : 'Mute'}</span>
                  </button>

                  <button
                    onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                    className={`h-11 rounded-xl flex flex-col items-center justify-center text-xs transition-colors cursor-pointer ${
                      isSpeakerOn
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Volume2 className="w-4 h-4 mb-0.5" />
                    <span className="text-[9px]">{isSpeakerOn ? 'Speaker ON' : 'Speaker'}</span>
                  </button>

                  <button
                    onClick={() => {
                      if (callState === 'connected') {
                        triggerCallAnswer(); // Re-trigger test vibe
                      }
                    }}
                    disabled={callState !== 'connected'}
                    className="h-11 rounded-xl bg-slate-800/80 hover:bg-slate-800 disabled:opacity-40 text-slate-300 flex flex-col items-center justify-center text-xs cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4 mb-0.5 text-amber-400" />
                    <span className="text-[9px]">Retrigger Vibe</span>
                  </button>
                </div>

                {/* Big Red Hang Up Button */}
                <div className="flex justify-center pt-1">
                  <button
                    onClick={endCall}
                    className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
                    title="End call"
                  >
                    <PhoneOff className="w-7 h-7" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Android Bottom Navigation Pill Bar */}
          <div className="h-4 flex items-center justify-center pb-2 select-none">
            <div className="w-24 h-1 bg-slate-600 rounded-full" />
          </div>

        </div>
      </div>
    </div>
  );
};
