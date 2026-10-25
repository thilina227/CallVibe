export type CallState = 'idle' | 'dialing' | 'ringing' | 'connected' | 'ended';

export interface Contact {
  id: string;
  name: string;
  number: string;
  avatarBg: string;
  initials: string;
}

export interface AppSettings {
  vibrationDurationMs: number; // default 250ms (1/4 second)
  muteMicrophone: boolean; // default true
  muteExtraBufferMs: number; // default 30ms post-vibe buffer
  vibrateOnCallEnd: boolean; // default false
  vibrateIntensity: 'gentle' | 'normal' | 'crisp';
  detectionMode: 'incallservice' | 'telephonymanager';
  autoAnswerDelaySec: number; // for simulator: auto answer in N seconds (or 0 for manual)
  playAudioSim: boolean;
}

export interface TimelineLogEntry {
  id: string;
  timestamp: number;
  offsetMs: number;
  phase: 'DIAL' | 'RING' | 'ANSWER_DETECTED' | 'MIC_MUTE' | 'HAPTIC_START' | 'HAPTIC_END' | 'MIC_UNMUTE' | 'CALL_ACTIVE' | 'CALL_END';
  type: 'telephony' | 'audio' | 'haptic' | 'system';
  message: string;
  details?: string;
  isHighlight?: boolean;
}

export interface AndroidSourceFile {
  name: string;
  path: string;
  language: 'kotlin' | 'xml' | 'groovy';
  description: string;
  content: string;
}
