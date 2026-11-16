import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatUser, MicSignalPayload, MicSlot } from '../types/chat';

interface UseVoiceMicsOptions {
  selfId: string;
  currentRoomId: string;
  isVoiceEnabled: boolean;
  mics: MicSlot[];
  onlineUsers: ChatUser[];
  soundEnabled: boolean;
  isDeafened: boolean;
  onSendSignal: (targetUserId: string, signal: MicSignalPayload) => void;
  onSendSpeaking: (isSpeaking: boolean) => void;
  onLeaveMic: () => void;
  onToggleCam: () => void;
  onMicError: (message: string) => void;
  onRegisterSignalHandler: (handler: (fromUserId: string, signal: MicSignalPayload) => void) => void;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function useVoiceMics({
  selfId,
  currentRoomId,
  isVoiceEnabled,
  mics,
  onlineUsers,
  soundEnabled,
  isDeafened,
  onSendSignal,
  onSendSpeaking,
  onLeaveMic,
  onToggleCam,
  onMicError,
  onRegisterSignalHandler,
}: UseVoiceMicsOptions) {
  const [localLevel, setLocalLevel] = useState(0);
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);
  const [streamReady, setStreamReady] = useState(false);
  const [localVideoStream, setLocalVideoStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});

  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const remoteAudiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const meterTimerRef = useRef<number | null>(null);
  const lastSpeakingRef = useRef<boolean>(false);

  const myMicSlot = mics.find((m) => m.userId === selfId) || null;
  const isOnMic = isVoiceEnabled && Boolean(myMicSlot);
  const isSelfMuted = Boolean(myMicSlot?.isMuted);
  const isCamOn = Boolean(myMicSlot?.hasCam) && isOnMic;

  const onSendSignalRef = useRef(onSendSignal);
  onSendSignalRef.current = onSendSignal;
  const onSendSpeakingRef = useRef(onSendSpeaking);
  onSendSpeakingRef.current = onSendSpeaking;
  const onLeaveMicRef = useRef(onLeaveMic);
  onLeaveMicRef.current = onLeaveMic;
  const onToggleCamRef = useRef(onToggleCam);
  onToggleCamRef.current = onToggleCam;
  const onMicErrorRef = useRef(onMicError);
  onMicErrorRef.current = onMicError;
  const isDeafenedRef = useRef(isDeafened);
  isDeafenedRef.current = isDeafened;
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  const closePeer = useCallback((peerId: string) => {
    const pc = peersRef.current.get(peerId);
    if (pc) {
      try {
        pc.ontrack = null;
        pc.onicecandidate = null;
        pc.onconnectionstatechange = null;
        pc.close();
      } catch {
        // Ignore cleanup error
      }
      peersRef.current.delete(peerId);
    }
    pendingCandidatesRef.current.delete(peerId);
    const audioEl = remoteAudiosRef.current.get(peerId);
    if (audioEl) {
      audioEl.pause();
      audioEl.srcObject = null;
      remoteAudiosRef.current.delete(peerId);
    }
    setRemoteStreams((prev) => {
      if (!prev[peerId]) return prev;
      const next = { ...prev };
      delete next[peerId];
      return next;
    });
  }, []);

  const closeAllPeers = useCallback(() => {
    for (const peerId of Array.from(peersRef.current.keys())) {
      closePeer(peerId);
    }
  }, [closePeer]);

  const stopLocalVideo = useCallback(() => {
    if (localVideoStreamRef.current) {
      localVideoStreamRef.current.getTracks().forEach((t) => t.stop());
      localVideoStreamRef.current = null;
    }
    setLocalVideoStream(null);
  }, []);

  const stopLocalCapture = useCallback(() => {
    if (meterTimerRef.current) {
      window.clearInterval(meterTimerRef.current);
      meterTimerRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    stopLocalVideo();
    if (lastSpeakingRef.current) {
      lastSpeakingRef.current = false;
      onSendSpeakingRef.current(false);
    }
    setLocalLevel(0);
    setIsLocalSpeaking(false);
    setStreamReady(false);
  }, [stopLocalVideo]);

  const attachLocalTracksToPeer = useCallback((pc: RTCPeerConnection) => {
    const senders = pc.getSenders();
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        if (!senders.some((s) => s.track?.id === track.id)) {
          pc.addTrack(track, localStreamRef.current!);
        }
      });
    }
    if (localVideoStreamRef.current) {
      localVideoStreamRef.current.getVideoTracks().forEach((track) => {
        if (!senders.some((s) => s.track?.id === track.id)) {
          pc.addTrack(track, localVideoStreamRef.current!);
        }
      });
    }
  }, []);

  const ensurePeerConnection = useCallback(
    (peerId: string): RTCPeerConnection => {
      const existing = peersRef.current.get(peerId);
      if (existing) return existing;

      const pc = new RTCPeerConnection(RTC_CONFIG);
      peersRef.current.set(peerId, pc);
      attachLocalTracksToPeer(pc);

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          onSendSignalRef.current(peerId, { candidate: e.candidate.toJSON() });
        }
      };

      pc.ontrack = (e) => {
        const stream = e.streams[0] || new MediaStream([e.track]);
        if (e.track.kind === 'audio') {
          let audioEl = remoteAudiosRef.current.get(peerId);
          if (!audioEl) {
            audioEl = new Audio();
            audioEl.autoplay = true;
            audioEl.setAttribute('playsinline', 'true');
            remoteAudiosRef.current.set(peerId, audioEl);
          }
          audioEl.srcObject = stream;
          audioEl.muted = isDeafenedRef.current || !soundEnabledRef.current;
          audioEl.play().catch(() => undefined);
        }
        if (e.track.kind === 'video') {
          setRemoteStreams((prev) => ({
            ...prev,
            [peerId]: new MediaStream([e.track]),
          }));
          e.track.onended = () => {
            setRemoteStreams((prev) => {
              if (!prev[peerId]) return prev;
              const next = { ...prev };
              delete next[peerId];
              return next;
            });
          };
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          closePeer(peerId);
        }
      };

      return pc;
    },
    [attachLocalTracksToPeer, closePeer]
  );

  // Keep remote audio muted state synced
  useEffect(() => {
    const shouldMute = isDeafened || !soundEnabled;
    for (const audioEl of remoteAudiosRef.current.values()) {
      audioEl.muted = shouldMute;
      if (!shouldMute && audioEl.paused && audioEl.srcObject) {
        audioEl.play().catch(() => undefined);
      }
    }
  }, [isDeafened, soundEnabled]);

  // Keep local microphone track enabled synced with self mute state
  useEffect(() => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !isSelfMuted;
    });
    if (isSelfMuted && lastSpeakingRef.current) {
      lastSpeakingRef.current = false;
      setIsLocalSpeaking(false);
      setLocalLevel(0);
      onSendSpeakingRef.current(false);
    }
  }, [isSelfMuted]);

  // Acquire or release local microphone when joining/leaving mic slot
  useEffect(() => {
    if (!isOnMic) {
      stopLocalCapture();
      return;
    }

    let cancelled = false;

    const startCapture = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        onMicErrorRef.current('المتصفح لا يدعم الوصول إلى الميكروفون الصوتي.');
        onLeaveMicRef.current();
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;
        stream.getAudioTracks().forEach((track) => {
          track.enabled = !isSelfMuted;
        });
        setStreamReady(true);

        for (const pc of peersRef.current.values()) {
          attachLocalTracksToPeer(pc);
        }

        const AudioContextCtor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextCtor) {
          const ctx = new AudioContextCtor();
          audioContextRef.current = ctx;
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          const buffer = new Uint8Array(analyser.frequencyBinCount);

          let silentFrames = 0;
          meterTimerRef.current = window.setInterval(() => {
            if (!localStreamRef.current) return;
            const trackEnabled = localStreamRef.current.getAudioTracks().some((t) => t.enabled);
            if (!trackEnabled) {
              setLocalLevel(0);
              if (lastSpeakingRef.current) {
                lastSpeakingRef.current = false;
                setIsLocalSpeaking(false);
                onSendSpeakingRef.current(false);
              }
              return;
            }
            analyser.getByteTimeDomainData(buffer);
            let sumSquares = 0;
            for (let i = 0; i < buffer.length; i++) {
              const norm = (buffer[i] - 128) / 128;
              sumSquares += norm * norm;
            }
            const rms = Math.sqrt(sumSquares / buffer.length);
            const scaled = Math.min(100, Math.round(rms * 320));
            setLocalLevel(scaled);

            const activeNow = scaled >= 12;
            if (activeNow) {
              silentFrames = 0;
              if (!lastSpeakingRef.current) {
                lastSpeakingRef.current = true;
                setIsLocalSpeaking(true);
                onSendSpeakingRef.current(true);
              }
            } else {
              silentFrames += 1;
              if (lastSpeakingRef.current && silentFrames >= 4) {
                lastSpeakingRef.current = false;
                setIsLocalSpeaking(false);
                onSendSpeakingRef.current(false);
              }
            }
          }, 120);
        }
      } catch {
        if (!cancelled) {
          onMicErrorRef.current(
            'تعذر فتح الميكروفون. يرجى السماح بصلاحية الميكروفون من إعدادات المتصفح.'
          );
          onLeaveMicRef.current();
        }
      }
    };

    startCapture();

    return () => {
      cancelled = true;
      stopLocalCapture();
    };
  }, [isOnMic, stopLocalCapture, attachLocalTracksToPeer]);

  // Acquire or stop camera video track when toggling Cam on mic
  useEffect(() => {
    if (!isCamOn || !streamReady) {
      if (localVideoStreamRef.current) {
        for (const [peerId, pc] of peersRef.current.entries()) {
          const videoSenders = pc.getSenders().filter((s) => s.track?.kind === 'video');
          if (videoSenders.length > 0) {
            videoSenders.forEach((s) => pc.removeTrack(s));
            if (pc.signalingState === 'stable') {
              pc.createOffer()
                .then((offer) => pc.setLocalDescription(offer))
                .then(() => {
                  if (pc.localDescription) {
                    onSendSignalRef.current(peerId, { sdp: pc.localDescription });
                  }
                })
                .catch(() => undefined);
            }
          }
        }
        stopLocalVideo();
      }
      return;
    }

    let cancelled = false;
    const startCamera = async () => {
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' },
        });
        if (cancelled) {
          videoStream.getTracks().forEach((t) => t.stop());
          return;
        }
        localVideoStreamRef.current = videoStream;
        setLocalVideoStream(videoStream);

        for (const [peerId, pc] of peersRef.current.entries()) {
          attachLocalTracksToPeer(pc);
          if (pc.signalingState === 'stable') {
            pc.createOffer()
              .then((offer) => pc.setLocalDescription(offer))
              .then(() => {
                if (pc.localDescription) {
                  onSendSignalRef.current(peerId, { sdp: pc.localDescription });
                }
              })
              .catch(() => undefined);
          }
        }
      } catch {
        if (!cancelled) {
          onMicErrorRef.current('تعذر تشغيل الكاميرا. تأكد من منح صلاحية الكاميرا في المتصفح.');
          onToggleCamRef.current();
        }
      }
    };

    startCamera();
    return () => {
      cancelled = true;
    };
  }, [isCamOn, streamReady, attachLocalTracksToPeer, stopLocalVideo]);

  // Clear remote video stream if remote user turned off hasCam in mic slot state
  useEffect(() => {
    const camActiveUserIds = new Set(
      mics.filter((m) => m.userId && m.hasCam).map((m) => m.userId as string)
    );
    setRemoteStreams((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const uid of Object.keys(next)) {
        if (!camActiveUserIds.has(uid)) {
          delete next[uid];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [mics]);

  // Handle incoming WebRTC signaling (with polite-peer glare rollback)
  useEffect(() => {
    const handleSignal = async (fromUserId: string, signal: MicSignalPayload) => {
      if (!isVoiceEnabled || fromUserId === selfId) return;

      try {
        const pc = ensurePeerConnection(fromUserId);

        if (signal.sdp) {
          const desc = new RTCSessionDescription(signal.sdp);
          if (desc.type === 'offer') {
            if (pc.signalingState !== 'stable') {
              const isPolite = selfId > fromUserId;
              if (!isPolite) return;
              await pc.setLocalDescription({ type: 'rollback' });
            }
            await pc.setRemoteDescription(desc);
            attachLocalTracksToPeer(pc);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            onSendSignalRef.current(fromUserId, { sdp: pc.localDescription! });
          } else if (desc.type === 'answer') {
            if (pc.signalingState === 'have-local-offer') {
              await pc.setRemoteDescription(desc);
            }
          }

          const queued = pendingCandidatesRef.current.get(fromUserId) || [];
          pendingCandidatesRef.current.delete(fromUserId);
          for (const cand of queued) {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          }
        }

        if (signal.candidate) {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } else {
            const list = pendingCandidatesRef.current.get(fromUserId) || [];
            list.push(signal.candidate);
            pendingCandidatesRef.current.set(fromUserId, list);
          }
        }
      } catch {
        // Ignore transient signaling race
      }
    };

    onRegisterSignalHandler(handleSignal);
  }, [isVoiceEnabled, selfId, ensurePeerConnection, attachLocalTracksToPeer, onRegisterSignalHandler]);

  // Reset peers cleanly when switching between rooms
  useEffect(() => {
    closeAllPeers();
  }, [currentRoomId, closeAllPeers]);

  // Manage WebRTC offers when in a voice-enabled room
  useEffect(() => {
    if (!isVoiceEnabled) {
      closeAllPeers();
      return;
    }

    const activeMicUserIds = new Set(mics.map((m) => m.userId).filter(Boolean) as string[]);
    const roomUserIds = new Set(onlineUsers.map((u) => u.id));

    for (const peerId of Array.from(peersRef.current.keys())) {
      const peerStillInRoom = roomUserIds.has(peerId);
      const eitherOnMic = isOnMic || activeMicUserIds.has(peerId);
      if (!peerStillInRoom || !eitherOnMic) {
        closePeer(peerId);
      }
    }

    if (!isOnMic || !streamReady || !localStreamRef.current) return;

    for (const user of onlineUsers) {
      if (user.id === selfId) continue;
      const otherIsSpeaker = activeMicUserIds.has(user.id);
      if (otherIsSpeaker && selfId > user.id) continue;

      if (!peersRef.current.has(user.id)) {
        const pc = ensurePeerConnection(user.id);
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            if (pc.localDescription) {
              onSendSignalRef.current(user.id, { sdp: pc.localDescription });
            }
          })
          .catch(() => {
            closePeer(user.id);
          });
      }
    }
  }, [isVoiceEnabled, isOnMic, streamReady, mics, onlineUsers, selfId, ensurePeerConnection, closePeer, closeAllPeers]);

  useEffect(() => {
    return () => {
      stopLocalCapture();
      closeAllPeers();
    };
  }, [stopLocalCapture, closeAllPeers]);

  return {
    localLevel,
    isLocalSpeaking,
    isOnMic,
    isSelfMuted,
    localVideoStream,
    remoteStreams,
  };
}
