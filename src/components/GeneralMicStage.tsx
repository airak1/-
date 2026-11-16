import React, { useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Lock,
  Unlock,
  PhoneOff,
  Shield,
  Volume2,
  VolumeX,
  Maximize2,
  X,
  User as UserIcon,
} from 'lucide-react';
import type {
  ChatUser,
  MicReaction,
  MicRequestItem,
  MicSlot,
} from '../types/chat';
import { UserAvatar } from './UserAvatar';

interface VideoFeedProps {
  stream: MediaStream;
  muted?: boolean;
  className?: string;
}

const VideoFeed: React.FC<VideoFeedProps> = ({ stream, muted = false, className = '' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = stream;
    el.play().catch(() => undefined);
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={className}
    />
  );
};

/* Vintage Studio Condenser Microphone + Headphones circular illustration */
const StudioMicEmblem: React.FC<{ idSuffix: number }> = ({ idSuffix }) => {
  const metalId = `micMetal-${idSuffix}`;
  const bronzeId = `micBronze-${idSuffix}`;
  return (
    <svg
      viewBox="0 0 64 64"
      className="w-full h-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={metalId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f5ede4" />
          <stop offset="45%" stopColor="#b0917a" />
          <stop offset="100%" stopColor="#2c1d15" />
        </linearGradient>
        <linearGradient id={bronzeId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#7a543e" />
          <stop offset="50%" stopColor="#3c261b" />
          <stop offset="100%" stopColor="#1b110c" />
        </linearGradient>
      </defs>

      {/* Clean bright circular backdrop */}
      <circle cx="32" cy="32" r="31" fill="#ffffff" />

      {/* Studio Headphones wrapped around lower half */}
      <path
        d="M15 39 C15 26, 49 26, 49 39"
        fill="none"
        stroke="#2a1a12"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M15 39 C15 26, 49 26, 49 39"
        fill="none"
        stroke="#a78772"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Left Earcup */}
      <g transform="rotate(-12 16 45)">
        <rect x="10" y="38" width="11" height="15" rx="5.5" fill={`url(#${bronzeId})`} stroke="#140c08" strokeWidth="1.2" />
        <ellipse cx="14.5" cy="45.5" rx="3" ry="5.5" fill="#9a7d6a" opacity="0.55" />
      </g>
      {/* Right Earcup */}
      <g transform="rotate(14 48 45)">
        <rect x="43" y="38" width="11" height="15" rx="5.5" fill={`url(#${bronzeId})`} stroke="#140c08" strokeWidth="1.2" />
        <ellipse cx="49.5" cy="45.5" rx="3" ry="5.5" fill="#9a7d6a" opacity="0.55" />
      </g>

      {/* Center Stand Shaft & Base */}
      <rect x="29.5" y="42" width="5" height="14" rx="1.5" fill={`url(#${bronzeId})`} />
      <ellipse cx="32" cy="56" rx="11" ry="3.2" fill="#231711" />
      <ellipse cx="32" cy="55.2" rx="9" ry="2" fill="#7a5b48" opacity="0.7" />

      {/* Vintage U-Mount Yoke */}
      <path
        d="M21 24 V32 C21 39, 43 39, 43 32 V24"
        fill="none"
        stroke="#2c1d15"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="20.5" cy="24" r="2.2" fill="#7a5b48" stroke="#1b110c" strokeWidth="0.9" />
      <circle cx="43.5" cy="24" r="2.2" fill="#7a5b48" stroke="#1b110c" strokeWidth="0.9" />

      {/* Pill-shaped Vintage Condenser Capsule */}
      <rect
        x="23.5"
        y="9"
        width="17"
        height="27"
        rx="8.5"
        fill={`url(#${metalId})`}
        stroke="#1b110c"
        strokeWidth="1.6"
      />
      {/* Metallic Rim Band */}
      <rect x="23.5" y="21.5" width="17" height="3.2" fill="#2b1b14" />
      <line x1="24" y1="22.8" x2="40" y2="22.8" stroke="#c8ad98" strokeWidth="0.8" />

      {/* Horizontal Grille Louvers (Upper) */}
      <line x1="26.5" y1="13" x2="37.5" y2="13" stroke="#24160f" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="25.5" y1="16" x2="38.5" y2="16" stroke="#24160f" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="25.5" y1="19" x2="38.5" y2="19" stroke="#24160f" strokeWidth="1.5" strokeLinecap="round" />

      {/* Horizontal Grille Louvers (Lower) */}
      <line x1="25.5" y1="27" x2="38.5" y2="27" stroke="#24160f" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="26" y1="30" x2="38" y2="30" stroke="#24160f" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="27.5" y1="33" x2="36.5" y2="33" stroke="#24160f" strokeWidth="1.5" strokeLinecap="round" />

      {/* Subtle specular highlight on mic */}
      <path d="M27.5 11.5 V33.5" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" opacity="0.45" />
    </svg>
  );
};

interface GeneralMicStageProps {
  self: ChatUser;
  mics: MicSlot[];
  micRequests: MicRequestItem[];
  speakingUsers: Record<string, boolean>;
  reactions: MicReaction[];
  onlineUsers: ChatUser[];
  localLevel: number;
  isLocalSpeaking: boolean;
  isDeafened: boolean;
  localVideoStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  isVoiceRoom?: boolean;
  roomName?: string;
  roomCreatorId?: string;
  onToggleDeafen: () => void;
  onJoinMic: (slotIndex: number) => void;
  onLeaveMic: () => void;
  onToggleSelfMute: () => void;
  onToggleCam: () => void;
  onToggleMicRequest: () => void;
  onModAction: (
    slotIndex: number,
    action: 'kick' | 'mute' | 'unmute' | 'lock' | 'unlock'
  ) => void;
  onGrantRequest: (targetUserId: string) => void;
  onReact: (emoji: string) => void;
  onOpenUserProfile: (user: ChatUser) => void;
}

const VU_SEGMENTS = 8;

export const GeneralMicStage: React.FC<GeneralMicStageProps> = ({
  self,
  mics,
  speakingUsers,
  onlineUsers,
  localLevel,
  isLocalSpeaking,
  isDeafened,
  localVideoStream,
  remoteStreams,
  isVoiceRoom = false,
  roomName,
  roomCreatorId,
  onToggleDeafen,
  onJoinMic,
  onLeaveMic,
  onToggleSelfMute,
  onToggleCam,
  onModAction,
  onOpenUserProfile,
}) => {
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [staffLockMode, setStaffLockMode] = useState(false);
  const [expandedCamUserId, setExpandedCamUserId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const hasOccupiedMic = mics.some((m) => Boolean(m.userId));
  useEffect(() => {
    if (!hasOccupiedMic) return;
    setNowMs(Date.now());
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [hasOccupiedMic]);

  const formatTimer = (totalSec: number) => {
    const safe = Math.max(0, Math.floor(totalSec));
    const mins = Math.floor(safe / 60);
    const secs = safe % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const isStaff = self.role === 'admin' || self.role === 'moderator';
  const canManageMicsHere = isStaff || Boolean(roomCreatorId && roomCreatorId === self.id);
  const mySlot = mics.find((m) => m.userId === self.id) || null;
  const occupiedSlots = mics.filter((m) => Boolean(m.userId));
  const maxMicDurationSec = isVoiceRoom ? 1800 : 300;
  const selectedSlot =
    selectedSlotIndex !== null ? mics.find((m) => m.slotIndex === selectedSlotIndex) || null : null;

  const expandedCamSlot = expandedCamUserId
    ? mics.find((m) => m.userId === expandedCamUserId && m.hasCam)
    : null;
  const expandedCamStream =
    expandedCamSlot?.userId === self.id
      ? localVideoStream
      : expandedCamSlot?.userId
      ? remoteStreams[expandedCamSlot.userId] || null
      : null;

  return (
    <section
      aria-label="منصة المايكات الصوتية"
      className="relative shrink-0 select-none border-b border-zinc-800 bg-gradient-to-l from-[#1e2631] via-[#26303d] to-[#1d242e] overflow-hidden"
    >
      {/* Subtle festive sparkle / star dots on right side matching screenshot */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-36 sm:w-56 opacity-55"
        style={{
          backgroundImage:
            'radial-gradient(circle at 82% 24%, rgba(125,180,220,0.45) 1.5px, transparent 2px), radial-gradient(circle at 90% 62%, rgba(155,205,235,0.35) 2px, transparent 2.5px), radial-gradient(circle at 70% 72%, rgba(130,175,215,0.4) 1.5px, transparent 2px), radial-gradient(circle at 58% 28%, rgba(160,200,235,0.3) 1.5px, transparent 2px), radial-gradient(circle at 95% 32%, rgba(140,185,220,0.45) 1px, transparent 1.5px)',
        }}
      />

      {/* Custom Voice Room Header Banner */}
      {isVoiceRoom && (
        <div className="relative z-10 px-2.5 sm:px-3.5 py-1.5 bg-zinc-950/65 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs bg-emerald-600/90 text-white text-[11px] font-bold shrink-0">
              <Mic className="w-3 h-3" />
              <span>غرفة صوتية</span>
            </span>
            {roomName && (
              <span className="font-bold text-white truncate">{roomName}</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-zinc-300 shrink-0">
            <span className="inline-flex items-center gap-1 font-mono-tabular">
              <Mic className="w-3 h-3 text-emerald-400" />
              <span>{occupiedSlots.length} / {mics.length} متحدث</span>
            </span>
            {!mySlot && (
              <button
                type="button"
                onClick={() => {
                  const free = mics.find((m) => !m.userId && (!m.isLocked || canManageMicsHere));
                  if (free) onJoinMic(free.slotIndex);
                }}
                disabled={!mics.some((m) => !m.userId && (!m.isLocked || canManageMicsHere))}
                className="px-2 py-0.5 rounded-xs bg-[#44a948] hover:bg-[#3a963e] disabled:opacity-45 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer active:scale-95"
              >
                <Mic className="w-3 h-3" />
                <span>انضم للتحدث</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Single-Row Circular Mic Bar (LTR order: Speaker Circle on Left + Circular Mic Medallions) */}
      <div
        dir="ltr"
        className="relative z-10 px-1.5 sm:px-3 py-1 flex items-center justify-between gap-1 sm:gap-2"
      >
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5">
          {/* Far-Left Circular Speaker / Deafen Toggle */}
          <button
            type="button"
            onClick={onToggleDeafen}
            title={isDeafened ? 'تشغيل صوت المتحدثين' : 'كتم صوت المتحدثين'}
            aria-label={isDeafened ? 'تشغيل صوت المتحدثين' : 'كتم صوت المتحدثين'}
            className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-transform active:scale-95 ${
              isDeafened
                ? 'bg-[#2a2f39] border-[3px] border-zinc-500 text-zinc-400 shadow-inner'
                : 'bg-[#333c4a] border-[3px] border-[#c41c1c] text-[#d62222] shadow-md hover:brightness-110'
            }`}
          >
            {isDeafened ? (
              <VolumeX className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.4]" />
            ) : (
              <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.4]" />
            )}
          </button>

          {/* Circular Mic Medallions */}
          {mics.map((slot) => {
            const isOccupied = Boolean(slot.userId);
            const isMe = slot.userId === self.id;
            const isSpeaking =
              Boolean(slot.userId) &&
              !slot.isMuted &&
              (isMe ? isLocalSpeaking : Boolean(speakingUsers[slot.userId!]));
            const onlineMatch = slot.userId
              ? onlineUsers.find((u) => u.id === slot.userId)
              : undefined;
            const activeCamStream =
              slot.hasCam && slot.userId
                ? isMe
                  ? localVideoStream
                  : remoteStreams[slot.userId] || null
                : null;

            return (
              <div key={slot.slotIndex} className="relative flex flex-col items-center shrink-0">
                <button
                  type="button"
                  disabled={!isOccupied && slot.isLocked && !canManageMicsHere}
                  onClick={() => {
                    if (staffLockMode && canManageMicsHere && !isOccupied) {
                      onModAction(slot.slotIndex, slot.isLocked ? 'unlock' : 'lock');
                      return;
                    }
                    if (!isOccupied) {
                      onJoinMic(slot.slotIndex);
                      return;
                    }
                    if (activeCamStream && slot.userId && !isMe && !canManageMicsHere) {
                      setExpandedCamUserId(slot.userId);
                      return;
                    }
                    if (isMe) {
                      onToggleSelfMute();
                      return;
                    }
                    if (canManageMicsHere) {
                      setSelectedSlotIndex((cur) =>
                        cur === slot.slotIndex ? null : slot.slotIndex
                      );
                    } else if (onlineMatch) {
                      onOpenUserProfile(onlineMatch);
                    }
                  }}
                  title={
                    isOccupied
                      ? `${slot.username}${slot.isMuted ? ' (مكتوم)' : ' (على المايك)'}`
                      : slot.isLocked
                      ? canManageMicsHere
                        ? 'مايك مقفل (انقر لفتحه في وضع القفل)'
                        : 'مايك مقفل'
                      : `صعود على المايك #${slot.slotIndex + 1}`
                  }
                  aria-label={
                    isOccupied
                      ? `المايك ${slot.slotIndex + 1}: ${slot.username}`
                      : slot.isLocked
                      ? `المايك ${slot.slotIndex + 1} مقفل`
                      : `صعود على المايك ${slot.slotIndex + 1}`
                  }
                  className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden flex items-center justify-center shrink-0 transition-transform active:scale-95 ${
                    isOccupied
                      ? isSpeaking
                        ? 'ring-[3px] ring-[#44a948] border-2 border-zinc-900 bg-zinc-900 cursor-pointer shadow-md'
                        : slot.isMuted
                        ? 'ring-2 ring-red-500 border-2 border-zinc-900 bg-zinc-900 cursor-pointer shadow-md'
                        : 'ring-2 ring-white/90 border-2 border-zinc-900 bg-zinc-900 cursor-pointer shadow-md'
                      : slot.isLocked
                      ? 'bg-zinc-800 border-2 border-zinc-500 ring-1 ring-white/25 text-zinc-400 cursor-pointer disabled:opacity-65 disabled:cursor-not-allowed'
                      : 'bg-white border-2 border-zinc-800 ring-2 ring-white/90 shadow-md hover:scale-[1.04] cursor-pointer'
                  }`}
                >
                  {isOccupied ? (
                    activeCamStream ? (
                      <VideoFeed
                        stream={activeCamStream}
                        muted={isMe}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserAvatar
                        avatarUrl={onlineMatch?.avatarUrl || slot.avatarUrl}
                        username={slot.username || '?'}
                        size="md"
                        className="!w-full !h-full !rounded-full !border-0"
                      />
                    )
                  ) : slot.isLocked ? (
                    <Lock className="w-4 h-4 text-zinc-300" />
                  ) : (
                    <StudioMicEmblem idSuffix={slot.slotIndex} />
                  )}

                  {/* Always show microphone status icon badge on every speaker */}
                  {isOccupied && (
                    <span
                      className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border border-white text-white flex items-center justify-center shadow ${
                        slot.isMuted
                          ? 'bg-red-600'
                          : isSpeaking
                          ? 'bg-[#44a948] animate-pulse'
                          : 'bg-sky-600'
                      }`}
                    >
                      {slot.isMuted ? (
                        <MicOff className="w-2.5 h-2.5" />
                      ) : (
                        <Mic className="w-2.5 h-2.5" />
                      )}
                    </span>
                  )}
                </button>

                {/* Compact Name Label + Mic Icon beneath every speaker circle */}
                {isOccupied && (
                  <span
                    className="-mt-1.5 relative z-10 px-1.5 py-[1px] rounded-full bg-zinc-950/95 border border-white/25 text-[9px] font-bold text-white max-w-[62px] leading-tight inline-flex items-center gap-0.5"
                    style={slot.nameColor ? { color: slot.nameColor } : undefined}
                  >
                    {slot.isMuted ? (
                      <MicOff className="w-2.5 h-2.5 text-red-400 shrink-0" />
                    ) : (
                      <Mic
                        className={`w-2.5 h-2.5 shrink-0 ${
                          isSpeaking ? 'text-emerald-400' : 'text-sky-300'
                        }`}
                      />
                    )}
                    <span className="truncate">{slot.username}</span>
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Discreet Lock-Mode Toggle on far right of mic bar (Staff or Custom Voice Room Creator) */}
        {canManageMicsHere && (
          <button
            type="button"
            onClick={() => {
              setStaffLockMode((v) => !v);
              setSelectedSlotIndex(null);
            }}
            title={staffLockMode ? 'إلغاء وضع قفل المايكات' : 'قفل/فتح المايكات الفارغة'}
            aria-label="إدارة قفل المايكات"
            className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 cursor-pointer transition-all active:scale-95 ${
              staffLockMode
                ? 'bg-amber-500 border-amber-300 text-zinc-950'
                : 'bg-black/35 border-white/20 text-zinc-300 hover:text-white'
            }`}
          >
            {staffLockMode ? <Lock className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Active Speakers Chip Strip inside Custom Voice Rooms (each speaker clearly displays a microphone icon) */}
      {isVoiceRoom && occupiedSlots.length > 0 && (
        <div className="relative z-10 px-2.5 sm:px-3.5 py-1.5 bg-zinc-950/50 border-t border-white/10 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-zinc-400 font-bold shrink-0">المتحدثون:</span>
          {occupiedSlots.map((slot) => {
            const isMe = slot.userId === self.id;
            const isSpeaking =
              !slot.isMuted && (isMe ? isLocalSpeaking : Boolean(speakingUsers[slot.userId!]));
            const onlineMatch = onlineUsers.find((u) => u.id === slot.userId);
            return (
              <button
                key={`spk-${slot.slotIndex}`}
                type="button"
                onClick={() => {
                  if (isMe) {
                    onToggleSelfMute();
                  } else if (canManageMicsHere) {
                    setSelectedSlotIndex(slot.slotIndex);
                  } else if (onlineMatch) {
                    onOpenUserProfile(onlineMatch);
                  }
                }}
                className={`px-2 py-0.5 rounded-xs border flex items-center gap-1 cursor-pointer transition-colors ${
                  slot.isMuted
                    ? 'bg-red-950/50 border-red-500/40 text-red-200'
                    : isSpeaking
                    ? 'bg-emerald-950/70 border-emerald-400/70 text-emerald-200'
                    : 'bg-zinc-900/90 border-white/15 text-stone-100 hover:border-white/35'
                }`}
              >
                {slot.isMuted ? (
                  <MicOff className="w-3 h-3 text-red-400 shrink-0" />
                ) : (
                  <Mic
                    className={`w-3 h-3 shrink-0 ${
                      isSpeaking ? 'text-emerald-400 animate-pulse' : 'text-sky-400'
                    }`}
                  />
                )}
                <span className="font-bold truncate max-w-[95px]" style={slot.nameColor ? { color: slot.nameColor } : undefined}>
                  {slot.username}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Staff Lock Mode Hint Strip */}
      {canManageMicsHere && staffLockMode && (
        <div className="relative z-10 px-3 py-1 bg-zinc-950/85 border-t border-zinc-800 flex items-center justify-between text-[11px] text-amber-300">
          <span>انقر على أي مايك فارغ لقفله أو فتحه</span>
          <button
            type="button"
            onClick={() => setStaffLockMode(false)}
            className="text-stone-300 hover:text-white font-bold cursor-pointer"
          >
            تم
          </button>
        </div>
      )}

      {/* Selected Occupied Mic Quick Actions (Staff or Room Creator) */}
      {canManageMicsHere && selectedSlot && selectedSlot.userId && selectedSlot.userId !== self.id && (
        <div className="relative z-10 px-2.5 py-1.5 bg-zinc-950/90 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs text-white">
          <span className="font-bold truncate">
            مايك {selectedSlot.slotIndex + 1}: {selectedSlot.username}
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(() => {
              const targetUser = onlineUsers.find((u) => u.id === selectedSlot.userId);
              return targetUser ? (
                <button
                  type="button"
                  onClick={() => {
                    onOpenUserProfile(targetUser);
                    setSelectedSlotIndex(null);
                  }}
                  className="px-2 py-1 rounded-xs bg-zinc-800 hover:bg-zinc-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <UserIcon className="w-3 h-3" />
                  <span>الملف</span>
                </button>
              ) : null;
            })()}
            {selectedSlot.hasCam && selectedSlot.userId && (
              <button
                type="button"
                onClick={() => {
                  setExpandedCamUserId(selectedSlot.userId);
                  setSelectedSlotIndex(null);
                }}
                className="px-2 py-1 rounded-xs bg-sky-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Maximize2 className="w-3 h-3" />
                <span>الكاميرا</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onModAction(selectedSlot.slotIndex, selectedSlot.isMuted ? 'unmute' : 'mute');
                setSelectedSlotIndex(null);
              }}
              className="px-2 py-1 rounded-xs bg-amber-600 text-white text-[11px] font-bold cursor-pointer"
            >
              {selectedSlot.isMuted ? 'فتح المايك' : 'كتم المايك'}
            </button>
            <button
              type="button"
              onClick={() => {
                onModAction(selectedSlot.slotIndex, 'kick');
                setSelectedSlotIndex(null);
              }}
              className="px-2 py-1 rounded-xs bg-red-600 text-white text-[11px] font-bold cursor-pointer"
            >
              إنزال
            </button>
            <button
              type="button"
              onClick={() => {
                onModAction(selectedSlot.slotIndex, 'lock');
                setSelectedSlotIndex(null);
              }}
              className="px-2 py-1 rounded-xs bg-zinc-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <Unlock className="w-3 h-3" />
              <span>قفل</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedSlotIndex(null)}
              aria-label="إغلاق"
              className="p-1 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Active Speaker Self Controls Bar (shown only when user is on a mic) */}
      {mySlot && (
        <div className="relative z-10 px-2 sm:px-3 py-1.5 bg-zinc-950/90 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={onToggleSelfMute}
              className={`h-9 sm:h-7 px-3 sm:px-2.5 rounded-xs text-xs sm:text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 whitespace-nowrap ${
                mySlot.isMuted
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-[#44a948] hover:bg-[#3a963e] text-white'
              }`}
            >
              {mySlot.isMuted ? (
                <>
                  <MicOff className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                  <span>مكتوم (فتح)</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                  <span>المايك مفتوح</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onToggleCam}
              className={`h-9 sm:h-7 px-3 sm:px-2.5 rounded-xs text-xs sm:text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 whitespace-nowrap ${
                mySlot.hasCam
                  ? 'bg-[var(--ych-primary)] text-white'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-stone-200'
              }`}
            >
              {mySlot.hasCam ? (
                <>
                  <Video className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                  <span>إيقاف الكاميرا</span>
                </>
              ) : (
                <>
                  <VideoOff className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                  <span>كاميرا</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onLeaveMic}
              className="h-9 sm:h-7 px-3 sm:px-2.5 rounded-xs bg-zinc-800 hover:bg-red-600 text-stone-200 hover:text-white text-xs sm:text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 whitespace-nowrap"
            >
              <PhoneOff className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
              <span>نزول</span>
            </button>
          </div>

          {/* 8-Segment LED Voice Level VU Meter + 5-Min Mic Timer */}
          <div className="flex items-center gap-1.5">
            {mySlot.joinedAt && (
              <span
                className={`px-2 h-7 rounded-xs border text-[11px] font-mono font-bold flex items-center gap-1 tabular-nums ${
                  self.role !== 'admin' && Math.max(0, maxMicDurationSec - Math.floor((nowMs - mySlot.joinedAt) / 1000)) <= 30
                    ? 'bg-amber-950/70 border-amber-500/70 text-amber-300'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-200'
                }`}
                title={
                  self.role === 'admin'
                    ? 'مدة التحدث على المايك'
                    : isVoiceRoom
                    ? 'الوقت المتبقي على المايك (30 دقيقة)'
                    : 'الوقت المتبقي على المايك (5 دقائق)'
                }
              >
                {self.role === 'admin'
                  ? formatTimer(Math.floor((nowMs - mySlot.joinedAt) / 1000))
                  : `${formatTimer(Math.max(0, maxMicDurationSec - Math.floor((nowMs - mySlot.joinedAt) / 1000)))} / ${
                      isVoiceRoom ? '30:00' : '05:00'
                    }`}
              </span>
            )}
            <div
              className="flex items-center gap-1 px-2 h-7 rounded-xs bg-zinc-900 border border-zinc-700"
              title="مؤشر مستوى الصوت"
            >
              <div className="flex items-center gap-0.5">
                {Array.from({ length: VU_SEGMENTS }).map((_, i) => {
                  const threshold = ((i + 1) / VU_SEGMENTS) * 100;
                  const lit = !mySlot.isMuted && localLevel >= threshold - 8;
                  const segColor =
                    i >= 6 ? 'bg-red-500' : i >= 4 ? 'bg-amber-500' : 'bg-[#44a948]';
                  return (
                    <span
                      key={i}
                      className={`w-1.5 h-2.5 rounded-[1px] transition-colors ${
                        lit ? segColor : 'bg-zinc-700'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Live Camera Modal */}
      {expandedCamSlot && expandedCamStream && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/75 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-md overflow-hidden shadow-2xl">
            <div
              className="px-3.5 py-2.5 text-white flex items-center justify-between"
              style={{ backgroundColor: 'var(--ych-primary)' }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Video className="w-4 h-4 shrink-0" />
                <span className="font-bold text-sm truncate">
                  بث الكاميرا — {expandedCamSlot.username}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setExpandedCamUserId(null)}
                aria-label="إغلاق الكاميرا"
                className="p-1 rounded-xs bg-black/25 hover:bg-black/45 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-black aspect-video w-full">
              <VideoFeed
                stream={expandedCamStream}
                muted={expandedCamSlot.userId === self.id}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
