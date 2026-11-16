import { useCallback, useEffect, useRef, useState } from 'react';
import { PortalLogin } from './components/PortalLogin';
import { ChatWorkspace } from './components/ChatWorkspace';
import type {
  AdminStatePayload,
  AuthResponse,
  BootstrapResponse,
  ChatMessage,
  ChatUser,
  CustomSmiley,
  GameChallengeState,
  GiftId,
  GiftItem,
  MemberNotification,
  MicReaction,
  MicRequestItem,
  MicSignalPayload,
  MicSlot,
  NickRevealPayload,
  OnlineUserPreview,
  PrivateMessage,
  ReplyReference,
  RolePermissionsMap,
  RolePermissionSet,
  Room,
  RoomQuiz,
  SiteBanner,
  SiteDesignSettings,
  SiteSettings,
  TopStarEntry,
  UserGender,
  UserProfileStats,
  UserRole,
  UserSocialLinks,
  WallPost,
  WSClientEvent,
  WSServerEvent,
  YouCamStyleId,
} from './types/chat';
import { playNotificationChime } from './utils/chatHelpers';

const STORAGE_TOKEN_KEY = 'iraqiachat_session_token';
const STORAGE_ROOM_KEY = 'iraqiachat_room_id';
const STORAGE_THEME_KEY = 'iraqiachat_theme';
const STORAGE_STYLE_KEY = 'iraqiachat_style';
const MAX_ROOM_MESSAGES = 50;

export default function App() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_THEME_KEY);
    return saved === 'dark';
  });

  const [selectedStyle, setSelectedStyle] = useState<YouCamStyleId | null>(() => {
    const saved = localStorage.getItem(STORAGE_STYLE_KEY);
    if (
      saved === 'classic' ||
      saved === 'royal-blue' ||
      saved === 'gold-baghdad' ||
      saved === 'rose-pink' ||
      saved === 'emerald'
    ) {
      return saved;
    }
    return null;
  });

  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  // Bootstrap state for login portal
  const [portalRooms, setPortalRooms] = useState<Room[]>([]);
  const [portalTotalOnline, setPortalTotalOnline] = useState(0);
  const [portalOnlineUsers, setPortalOnlineUsers] = useState<OnlineUserPreview[]>([]);
  const [portalWallPosts, setPortalWallPosts] = useState<WallPost[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | undefined>(undefined);
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  // Authenticated workspace state
  const [token, setToken] = useState<string | null>(null);
  const [self, setSelf] = useState<ChatUser | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string>('general');
  const [isInSpace, setIsInSpace] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<ChatUser[]>([]);
  const [wallPosts, setWallPosts] = useState<WallPost[]>([]);
  const [privateMessages, setPrivateMessages] = useState<PrivateMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [unreadPmByUser, setUnreadPmByUser] = useState<Record<string, number>>({});
  const [activePmPartnerId, setActivePmPartnerId] = useState<string | null>(null);
  const activePmPartnerRef = useRef<string | null>(null);
  activePmPartnerRef.current = activePmPartnerId;

  // Admin state
  const [adminState, setAdminState] = useState<AdminStatePayload | null>(null);
  const [nickRevealResult, setNickRevealResult] = useState<NickRevealPayload | null>(null);
  const [adminAnnouncement, setAdminAnnouncement] = useState<{
    text: string;
    by: string;
    timestamp: number;
  } | null>(null);
  const [royalBanner, setRoyalBanner] = useState<{
    user: ChatUser;
    roomId: string;
    roomName: string;
    royalEntryText?: string;
    timestamp: number;
  } | null>(null);
  const royalBannerTimerRef = useRef<number | null>(null);

  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'reconnecting'>('connecting');
  const [noticeBanner, setNoticeBanner] = useState<{ text: string; tone: 'error' | 'info' } | null>(null);
  const [passwordFeedback, setPasswordFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [userStatsMap, setUserStatsMap] = useState<Record<string, UserProfileStats>>({});
  const [activeChallenge, setActiveChallenge] = useState<GameChallengeState | null>(null);
  const [incomingChallenge, setIncomingChallenge] = useState<GameChallengeState | null>(null);
  const [notifications, setNotifications] = useState<MemberNotification[]>([]);
  const [activeAlertPopup, setActiveAlertPopup] = useState<{
    kind?: 'alert' | 'like';
    badgeNumber?: number;
    fromUserId: string;
    fromUsername: string;
    fromNameColor?: string;
    fromAvatarUrl?: string;
    message: string;
    timestamp: number;
  } | null>(null);

  const [mics, setMics] = useState<MicSlot[]>([]);
  const [micRequests, setMicRequests] = useState<MicRequestItem[]>([]);
  const [speakingUsers, setSpeakingUsers] = useState<Record<string, boolean>>({});
  const [micReactions, setMicReactions] = useState<MicReaction[]>([]);
  const [topStars, setTopStars] = useState<TopStarEntry[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<RoomQuiz | null>(null);
  const [roomPasswordPrompt, setRoomPasswordPrompt] = useState<{
    roomId: string;
    roomName: string;
    error?: string;
  } | null>(null);
  const micSignalHandlerRef = useRef<((fromUserId: string, signal: MicSignalPayload) => void) | null>(null);
  const botMicAudioHandlerRef = useRef<
    ((payload: {
      roomId: string;
      userId: string;
      username: string;
      gender?: UserGender;
      mimeType: string;
      audioBase64: string;
      durationMs?: number;
      spokenText?: string;
    }) => void) | null
  >(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const selfIdRef = useRef<string | null>(null);
  selfIdRef.current = self?.id || null;
  const selfUsernameRef = useRef<string | null>(null);
  selfUsernameRef.current = self?.username || null;
  const currentRoomIdRef = useRef<string>(currentRoomId);
  currentRoomIdRef.current = currentRoomId;
  const isInSpaceRef = useRef<boolean>(isInSpace);
  isInSpaceRef.current = isInSpace;

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem(STORAGE_THEME_KEY, 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem(STORAGE_THEME_KEY, 'light');
    }
  }, [isDark]);

  // Prevent mobile iOS/Android keyboard open/close viewport zoom & stuck panning
  useEffect(() => {
    const VIEWPORT_LOCK =
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content';

    const enforceViewportMeta = () => {
      const meta = document.querySelector('meta[name="viewport"]');
      if (meta) {
        meta.setAttribute('content', VIEWPORT_LOCK);
      }
    };

    const syncAppHeight = () => {
      const vv = window.visualViewport;
      const measured = vv ? Math.round(vv.height) : window.innerHeight;
      if (measured > 140) {
        document.documentElement.style.setProperty('--app-height', `${measured}px`);
      }
      if (selfIdRef.current && (window.scrollX !== 0 || window.scrollY !== 0 || (vv && vv.offsetTop !== 0))) {
        window.scrollTo(0, 0);
      }
    };

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        const inputEl = target as HTMLInputElement;
        if (!['checkbox', 'radio', 'range', 'color', 'file'].includes(inputEl.type)) {
          const computedSize = parseFloat(window.getComputedStyle(target).fontSize || '16');
          if (computedSize < 16) {
            target.style.fontSize = '16px';
          }
        }
        enforceViewportMeta();
        window.setTimeout(syncAppHeight, 80);
        window.setTimeout(syncAppHeight, 280);
      }
    };

    const handleFocusOut = () => {
      enforceViewportMeta();
      const resetPosition = () => {
        enforceViewportMeta();
        if (selfIdRef.current || window.scrollX !== 0) {
          window.scrollTo(0, 0);
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
        }
        syncAppHeight();
      };
      resetPosition();
      window.setTimeout(resetPosition, 60);
      window.setTimeout(resetPosition, 260);
    };

    const handleGesture = (e: Event) => {
      e.preventDefault();
    };

    syncAppHeight();
    window.visualViewport?.addEventListener('resize', syncAppHeight);
    window.visualViewport?.addEventListener('scroll', syncAppHeight);
    window.addEventListener('resize', syncAppHeight);
    document.addEventListener('focusin', handleFocusIn, true);
    document.addEventListener('focusout', handleFocusOut, true);
    document.addEventListener('gesturestart', handleGesture, { passive: false });
    document.addEventListener('gesturechange', handleGesture, { passive: false });

    return () => {
      window.visualViewport?.removeEventListener('resize', syncAppHeight);
      window.visualViewport?.removeEventListener('scroll', syncAppHeight);
      window.removeEventListener('resize', syncAppHeight);
      document.removeEventListener('focusin', handleFocusIn, true);
      document.removeEventListener('focusout', handleFocusOut, true);
      document.removeEventListener('gesturestart', handleGesture);
      document.removeEventListener('gesturechange', handleGesture);
    };
  }, []);

  // Fetch initial rooms & try restoring saved session
  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const res = await fetch('/api/bootstrap');
        if (res.ok) {
          const data: BootstrapResponse = await res.json();
          if (active) {
            setPortalRooms(data.rooms);
            setPortalTotalOnline(data.totalOnline);
            setPortalOnlineUsers(data.onlinePreview || []);
            setPortalWallPosts(data.wallPreview || []);
            setSiteSettings(data.settings);
          }
        }
      } catch {
        // Ignore bootstrap transient failure
      }

      const savedToken = localStorage.getItem(STORAGE_TOKEN_KEY);
      const savedRoom = localStorage.getItem(STORAGE_ROOM_KEY) || 'general';
      if (savedToken) {
        try {
          const sessionRes = await fetch('/api/auth/session', {
            headers: { Authorization: `Bearer ${savedToken}` },
          });
          if (sessionRes.ok) {
            const authData: AuthResponse = await sessionRes.json();
            if (active) {
              setToken(authData.token);
              setSelf(authData.user);
              setCurrentRoomId(savedRoom);
            }
          } else {
            localStorage.removeItem(STORAGE_TOKEN_KEY);
          }
        } catch {
          localStorage.removeItem(STORAGE_TOKEN_KEY);
        }
      }

      if (active) {
        setIsRestoringSession(false);
      }
    };

    init();
    return () => {
      active = false;
    };
  }, []);

  const refreshBootstrap = useCallback(async () => {
    try {
      const res = await fetch('/api/bootstrap');
      if (res.ok) {
        const data: BootstrapResponse = await res.json();
        setPortalRooms(data.rooms);
        setPortalTotalOnline(data.totalOnline);
        setPortalOnlineUsers(data.onlinePreview || []);
        setPortalWallPosts(data.wallPreview || []);
        setSiteSettings(data.settings);
      }
    } catch {
      // Ignore
    }
  }, []);

  // Poll portal room counts while on login screen
  useEffect(() => {
    if (token) return;
    const timer = window.setInterval(refreshBootstrap, 8000);
    return () => window.clearInterval(timer);
  }, [token, refreshBootstrap]);

  const sendWs = useCallback((event: WSClientEvent) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(event));
    }
  }, []);

  // WebSocket lifecycle when authenticated
  useEffect(() => {
    if (!token) return;

    let intentionallyClosed = false;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionState('connected');
        const roomToJoin = localStorage.getItem(STORAGE_ROOM_KEY) || currentRoomIdRef.current || 'general';
        ws.send(
          JSON.stringify({
            type: 'auth:hello',
            token,
            roomId: roomToJoin,
          } satisfies WSClientEvent)
        );
      };

      ws.onmessage = (e) => {
        let msg: WSServerEvent;
        try {
          msg = JSON.parse(e.data);
        } catch {
          return;
        }

        switch (msg.type) {
          case 'init:state':
            setSelf(msg.self);
            setRooms(msg.rooms);
            setCurrentRoomId(msg.currentRoomId === 'space' ? 'general' : msg.currentRoomId);
            setIsInSpace(false);
            setMessages(msg.messages.slice(-MAX_ROOM_MESSAGES));
            setOnlineUsers(msg.onlineUsers);
            setWallPosts(msg.wallPosts);
            setPrivateMessages(msg.privateMessages);
            setNotifications(msg.notifications || []);
            setSiteSettings(msg.settings);
            setMics(msg.mics || []);
            setMicRequests(msg.micRequests || []);
            setTopStars(msg.topStars || []);
            setActiveQuiz(msg.activeQuiz || null);
            setRoomPasswordPrompt(null);
            setSpeakingUsers({});
            setMicReactions([]);
            setTypingUsers({});
            ws.send(
              JSON.stringify({
                type: 'user:viewProfile',
                targetUserId: msg.self.id,
              } satisfies WSClientEvent)
            );
            break;

          case 'rooms:update':
            setRooms(msg.rooms);
            break;

          case 'room:joined':
            setCurrentRoomId(msg.roomId);
            isInSpaceRef.current = false;
            setIsInSpace(false);
            localStorage.setItem(STORAGE_ROOM_KEY, msg.roomId);
            setRoomPasswordPrompt(null);
            setMessages(msg.messages.slice(-MAX_ROOM_MESSAGES));
            setOnlineUsers(msg.onlineUsers);
            setMics(msg.mics || []);
            setMicRequests(msg.micRequests || []);
            setActiveQuiz(msg.activeQuiz || null);
            setSpeakingUsers({});
            setMicReactions([]);
            setTypingUsers({});
            setRoyalBanner((prev) => (prev && prev.roomId !== msg.roomId ? null : prev));
            break;

          case 'space:state':
            if (msg.roomId === currentRoomIdRef.current) {
              const nextSpaceState = Boolean(msg.isInSpace);
              isInSpaceRef.current = nextSpaceState;
              setIsInSpace(nextSpaceState);
              if (nextSpaceState) {
                setTypingUsers({});
              }
            }
            break;

          case 'room:mediaUpdated':
            setRooms((prev) =>
              prev.map((r) => (r.id === msg.roomId ? { ...r, media: msg.media } : r))
            );
            break;

          case 'room:quizUpdated':
            if (msg.roomId === currentRoomIdRef.current) {
              setActiveQuiz(msg.quiz);
            }
            break;

          case 'room:passwordRequired':
            setRoomPasswordPrompt({
              roomId: msg.roomId,
              roomName: msg.roomName,
              error: msg.error,
            });
            break;

          case 'leaderboard:update':
            setTopStars(msg.stars);
            break;

          case 'room:cleared':
            setMessages((prev) =>
              prev[0]?.roomId === msg.roomId || msg.roomId === currentRoomIdRef.current
                ? msg.messages.slice(-MAX_ROOM_MESSAGES)
                : prev
            );
            break;

          case 'users:update':
            setOnlineUsers(msg.onlineUsers);
            break;

          case 'mics:update':
            if (msg.roomId === currentRoomIdRef.current) {
              setMics(msg.mics);
              setMicRequests(msg.micRequests);
            }
            break;

          case 'mic:speaking':
            if (msg.roomId === currentRoomIdRef.current) {
              setSpeakingUsers((prev) => ({
                ...prev,
                [msg.userId]: msg.isSpeaking,
              }));
            }
            break;

          case 'mic:signal':
            micSignalHandlerRef.current?.(msg.fromUserId, msg.signal);
            break;

          case 'mic:botAudio':
            botMicAudioHandlerRef.current?.(msg);
            break;

          case 'mic:reaction':
            if (msg.roomId === currentRoomIdRef.current) {
              setMicReactions((prev) => [...prev.slice(-8), msg.reaction]);
              window.setTimeout(() => {
                setMicReactions((prev) => prev.filter((r) => r.id !== msg.reaction.id));
              }, 4500);
            }
            break;

          case 'chat:message':
            if (isInSpaceRef.current) break;
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.message.id)) return prev;
              const next = [...prev, msg.message];
              return next.length > MAX_ROOM_MESSAGES ? next.slice(-MAX_ROOM_MESSAGES) : next;
            });
            if (
              soundEnabledRef.current &&
              msg.message.type === 'chat' &&
              msg.message.userId !== selfIdRef.current &&
              selfUsernameRef.current &&
              msg.message.text.includes(`@${selfUsernameRef.current}`)
            ) {
              playNotificationChime();
            }
            break;

          case 'chat:deleted':
            if (isInSpaceRef.current) break;
            setMessages((prev) => prev.filter((m) => m.id !== msg.messageId));
            break;

          case 'chat:typing':
            if (isInSpaceRef.current) break;
            setTypingUsers((prev) => {
              const next = { ...prev };
              if (msg.isTyping) {
                next[msg.userId] = msg.username;
              } else {
                delete next[msg.userId];
              }
              return next;
            });
            break;

          case 'pm:message':
            setPrivateMessages((prev) => {
              if (prev.some((m) => m.id === msg.message.id)) return prev;
              return [...prev, msg.message];
            });
            if (msg.message.fromUserId !== selfIdRef.current) {
              if (soundEnabledRef.current) {
                playNotificationChime();
              }
              if (activePmPartnerRef.current !== msg.message.fromUserId) {
                setUnreadPmByUser((prev) => ({
                  ...prev,
                  [msg.message.fromUserId]: (prev[msg.message.fromUserId] || 0) + 1,
                }));
              }
            }
            break;

          case 'wall:created':
            setWallPosts((prev) => {
              if (prev.some((p) => p.id === msg.post.id)) return prev;
              return [msg.post, ...prev];
            });
            break;

          case 'wall:updated':
            setWallPosts((prev) => prev.map((p) => (p.id === msg.post.id ? msg.post : p)));
            break;

          case 'wall:deleted':
            setWallPosts((prev) => prev.filter((p) => p.id !== msg.postId));
            break;

          case 'wall:cleared':
            setWallPosts([]);
            break;

          case 'profile:updated':
            if (msg.user.id === selfIdRef.current) {
              setSelf(msg.user);
            }
            setOnlineUsers((prev) =>
              prev.map((u) => (u.id === msg.user.id ? { ...u, ...msg.user } : u))
            );
            setMessages((prev) =>
              prev.map((m) =>
                m.userId === msg.user.id
                  ? {
                      ...m,
                      username: msg.user.username,
                      nameColor: msg.user.nameColor,
                      avatarUrl: msg.user.avatarUrl,
                      userRole: msg.user.role,
                    }
                  : m
              )
            );
            setWallPosts((prev) =>
              prev.map((p) => ({
                ...p,
                ...(p.userId === msg.user.id
                  ? {
                      username: msg.user.username,
                      nameColor: msg.user.nameColor,
                      avatarUrl: msg.user.avatarUrl,
                      userRole: msg.user.role,
                    }
                  : {}),
                comments: p.comments.map((c) =>
                  c.userId === msg.user.id
                    ? { ...c, username: msg.user.username, nameColor: msg.user.nameColor }
                    : c
                ),
              }))
            );
            setPrivateMessages((prev) =>
              prev.map((pm) => ({
                ...pm,
                ...(pm.fromUserId === msg.user.id
                  ? {
                      fromUsername: msg.user.username,
                      fromNameColor: msg.user.nameColor,
                      fromAvatarUrl: msg.user.avatarUrl,
                    }
                  : {}),
                ...(pm.toUserId === msg.user.id ? { toUsername: msg.user.username } : {}),
              }))
            );
            setMics((prev) =>
              prev.map((slot) =>
                slot.userId === msg.user.id
                  ? {
                      ...slot,
                      username: msg.user.username,
                      nameColor: msg.user.nameColor,
                      avatarUrl: msg.user.avatarUrl,
                      userRole: msg.user.role,
                    }
                  : slot
              )
            );
            setMicRequests((prev) =>
              prev.map((reqItem) =>
                reqItem.userId === msg.user.id
                  ? {
                      ...reqItem,
                      username: msg.user.username,
                      nameColor: msg.user.nameColor,
                      avatarUrl: msg.user.avatarUrl,
                    }
                  : reqItem
              )
            );
            break;

          case 'account:passwordResult':
            setPasswordFeedback({ ok: msg.ok, message: msg.message });
            break;

          case 'user:profileStats':
            setUserStatsMap((prev) => ({ ...prev, [msg.stats.userId]: msg.stats }));
            setOnlineUsers((prev) =>
              prev.map((u) =>
                u.id === msg.stats.userId ? { ...u, likesCount: msg.stats.likesCount } : u
              )
            );
            if (msg.stats.userId === selfIdRef.current) {
              setSelf((prev) => (prev ? { ...prev, likesCount: msg.stats.likesCount } : prev));
            }
            break;

          case 'user:alerted':
            setActiveAlertPopup({
              kind: msg.kind,
              badgeNumber: msg.badgeNumber,
              fromUserId: msg.fromUserId,
              fromUsername: msg.fromUsername,
              fromNameColor: msg.fromNameColor,
              fromAvatarUrl: msg.fromAvatarUrl,
              message: msg.message,
              timestamp: msg.timestamp,
            });
            if (soundEnabledRef.current) {
              playNotificationChime();
            }
            break;

          case 'notification:new':
            setNotifications((prev) => {
              if (prev.some((n) => n.id === msg.notification.id)) return prev;
              return [msg.notification, ...prev].slice(0, 40);
            });
            if (soundEnabledRef.current && msg.notification.kind !== 'alert') {
              playNotificationChime();
            }
            break;

          case 'notifications:synced':
            setNotifications(msg.notifications);
            break;

          case 'game:challenged':
            if (msg.challenge.challengerId === selfIdRef.current) {
              setActiveChallenge(msg.challenge);
            } else {
              setIncomingChallenge(msg.challenge);
              if (soundEnabledRef.current) {
                playNotificationChime();
              }
            }
            break;

          case 'game:updated':
            setIncomingChallenge((prev) => (prev?.id === msg.challenge.id ? null : prev));
            setActiveChallenge(msg.challenge);
            break;

          case 'game:declined':
            setActiveChallenge((prev) => (prev?.id === msg.challengeId ? null : prev));
            setNoticeBanner({ text: `رفض ${msg.byUsername} دعوة التحدي.`, tone: 'info' });
            break;

          case 'settings:updated':
            setSiteSettings(msg.settings);
            break;

          case 'admin:state':
            setAdminState(msg.data);
            break;

          case 'admin:nicksResult':
            setNickRevealResult(msg.data);
            break;

          case 'admin:announcement':
            setAdminAnnouncement({
              text: msg.text,
              by: msg.by,
              timestamp: msg.timestamp,
            });
            if (soundEnabledRef.current) {
              playNotificationChime();
            }
            break;

          case 'royal:entry':
            setRoyalBanner({
              user: msg.user,
              roomId: msg.roomId,
              roomName: msg.roomName,
              royalEntryText: msg.royalEntryText,
              timestamp: msg.timestamp,
            });
            if (royalBannerTimerRef.current) {
              window.clearTimeout(royalBannerTimerRef.current);
            }
            royalBannerTimerRef.current = window.setTimeout(() => {
              setRoyalBanner((prev) =>
                prev && prev.timestamp === msg.timestamp ? null : prev
              );
            }, 6500);
            if (soundEnabledRef.current) {
              playNotificationChime();
            }
            break;

          case 'mod:notice':
            if (msg.kicked) {
              intentionallyClosed = true;
              localStorage.removeItem(STORAGE_TOKEN_KEY);
              setToken(null);
              setSelf(null);
              setAdminState(null);
              setNickRevealResult(null);
              setAdminAnnouncement(null);
              setRoyalBanner(null);
              setNotifications([]);
              setActiveAlertPopup(null);
              setMics([]);
              setMicRequests([]);
              setSpeakingUsers({});
              setMicReactions([]);
              setTopStars([]);
              setActiveQuiz(null);
              setRoomPasswordPrompt(null);
              setNoticeBanner({ text: msg.message, tone: 'error' });
            } else {
              setNoticeBanner({ text: msg.message, tone: 'info' });
            }
            break;

          case 'error:notice':
            setNoticeBanner({ text: msg.message, tone: 'error' });
            break;
        }
      };

      ws.onclose = () => {
        if (intentionallyClosed) return;
        setConnectionState('reconnecting');
        reconnectTimerRef.current = window.setTimeout(connect, 2000);
      };
    };

    setConnectionState('connecting');
    connect();

    return () => {
      intentionallyClosed = true;
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [token]);

  const handleAuthenticated = (auth: AuthResponse, initialRoomId: string) => {
    localStorage.setItem(STORAGE_TOKEN_KEY, auth.token);
    localStorage.setItem(STORAGE_ROOM_KEY, initialRoomId);
    setCurrentRoomId(initialRoomId);
    setSelf(auth.user);
    setToken(auth.token);
    setNoticeBanner(null);
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.setItem(STORAGE_ROOM_KEY, 'general');
    wsRef.current?.close();
    setToken(null);
    setSelf(null);
    setMessages([]);
    setOnlineUsers([]);
    setPrivateMessages([]);
    setUnreadPmByUser({});
    setActivePmPartnerId(null);
    setAdminState(null);
    setNickRevealResult(null);
    setAdminAnnouncement(null);
    setRoyalBanner(null);
    setNotifications([]);
    setActiveAlertPopup(null);
    setMics([]);
    setMicRequests([]);
    setSpeakingUsers({});
    setMicReactions([]);
    setTopStars([]);
    setActiveQuiz(null);
    setRoomPasswordPrompt(null);
  };

  const handleSelectPmPartner = (userId: string) => {
    setActivePmPartnerId(userId || null);
    if (!userId) return;
    setUnreadPmByUser((prev) => {
      if (!prev[userId]) return prev;
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  };

  const fetchAdminState = useCallback(() => {
    sendWs({ type: 'admin:fetchState' });
  }, [sendWs]);

  const registerMicSignalHandler = useCallback(
    (handler: (fromUserId: string, signal: MicSignalPayload) => void) => {
      micSignalHandlerRef.current = handler;
    },
    []
  );

  const registerBotMicAudioHandler = useCallback(
    (
      handler: (payload: {
        roomId: string;
        userId: string;
        username: string;
        gender?: UserGender;
        mimeType: string;
        audioBase64: string;
        durationMs?: number;
        spokenText?: string;
      }) => void
    ) => {
      botMicAudioHandlerRef.current = handler;
    },
    []
  );

  const handleNoticeError = useCallback((message: string) => {
    setNoticeBanner({ text: message, tone: 'error' });
  }, []);

  if (isRestoringSession) {
    return (
      <div
        key="restoring"
        className="min-h-screen flex items-center justify-center bg-stone-100 dark:bg-zinc-950 text-stone-600 dark:text-stone-300 text-sm"
      >
        <span>جاري تحميل الديوان...</span>
      </div>
    );
  }

  if (!token || !self) {
    return (
      <PortalLogin
        key="portal-login"
        rooms={portalRooms}
        totalOnline={portalTotalOnline}
        onlinePreview={portalOnlineUsers}
        wallPreview={portalWallPosts}
        siteSettings={siteSettings}
        isDark={isDark}
        onToggleTheme={() => setIsDark((d) => !d)}
        onRefresh={refreshBootstrap}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  return (
    <ChatWorkspace
      key="chat-workspace"
      self={self}
      token={token}
      rooms={rooms}
      currentRoomId={currentRoomId}
      messages={messages}
      onlineUsers={onlineUsers}
      wallPosts={wallPosts}
      topStars={topStars}
      privateMessages={privateMessages}
      typingUsers={typingUsers}
      connectionState={connectionState}
      noticeBanner={noticeBanner}
      roomPasswordPrompt={roomPasswordPrompt}
      isDark={isDark}
      soundEnabled={soundEnabled}
      selectedStyle={selectedStyle || siteSettings?.defaultStyle || 'classic'}
      activeQuiz={activeQuiz}
      unreadPmByUser={unreadPmByUser}
      activePmPartnerId={activePmPartnerId}
      onToggleTheme={() => setIsDark((d) => !d)}
      onToggleSound={() => setSoundEnabled((s) => !s)}
      onChangeStyle={(style) => {
        setSelectedStyle(style);
        localStorage.setItem(STORAGE_STYLE_KEY, style);
      }}
      onClearNotice={() => setNoticeBanner(null)}
      onDismissRoomPasswordPrompt={() => setRoomPasswordPrompt(null)}
      onJoinRoom={(roomId, password) => sendWs({ type: 'room:join', roomId, password })}
      isInSpace={isInSpace}
      onExitToSpace={() => sendWs({ type: 'room:exitToSpace' })}
      onResumeFromSpace={() => sendWs({ type: 'room:resumeFromSpace' })}
      onReportPresenceIdle={(isIdle: boolean) => sendWs({ type: 'presence:status', isIdle })}
      onCreateRoom={(payload) => sendWs({ type: 'room:create', ...payload })}
      onUpdateTopic={(roomId, topic) => sendWs({ type: 'room:updateTopic', roomId, topic })}
      onUpdateRoomImage={(roomId, imageUrl) => sendWs({ type: 'room:updateImage', roomId, imageUrl })}
      onSetRoomMedia={(roomId, url, title) => sendWs({ type: 'room:setMedia', roomId, url, title })}
      onClearRoomMedia={(roomId) => sendWs({ type: 'room:clearMedia', roomId })}
      onStartRoomQuiz={(roomId, question, answer, rewardLikes) =>
        sendWs({ type: 'room:startQuiz', roomId, question, answer, rewardLikes })
      }
      onStopRoomQuiz={(roomId) => sendWs({ type: 'room:stopQuiz', roomId })}
      onSendDedication={(roomId, text, toUsername) =>
        sendWs({ type: 'chat:dedicate', roomId, text, toUsername })
      }
      onSendMessage={(payload: {
        roomId: string;
        text: string;
        textColor: string;
        isBold: boolean;
        fontSize: 'sm' | 'md' | 'lg';
        replyTo?: ReplyReference;
        imageUrl?: string;
        audioUrl?: string;
        audioDuration?: number;
      }) => sendWs({ type: 'chat:send', ...payload })}
      mics={mics}
      micRequests={micRequests}
      speakingUsers={speakingUsers}
      micReactions={micReactions}
      onJoinMic={(slotIndex) => sendWs({ type: 'mic:join', slotIndex })}
      onLeaveMic={() => sendWs({ type: 'mic:leave' })}
      onToggleMicMute={() => sendWs({ type: 'mic:toggleMute' })}
      onToggleMicCam={() => sendWs({ type: 'mic:toggleCam' })}
      onToggleMicRequest={() => sendWs({ type: 'mic:request' })}
      onMicModAction={(slotIndex, action) => sendWs({ type: 'mic:modAction', slotIndex, action })}
      onGrantMicRequest={(targetUserId) => sendWs({ type: 'mic:grantRequest', targetUserId })}
      onSendMicSignal={(targetUserId, signal) => sendWs({ type: 'mic:signal', targetUserId, signal })}
      onSendMicSpeaking={(isSpeaking) => sendWs({ type: 'mic:speaking', isSpeaking })}
      onSendMicReaction={(emoji) => sendWs({ type: 'mic:react', emoji })}
      onRegisterMicSignalHandler={registerMicSignalHandler}
      onRegisterBotMicAudioHandler={registerBotMicAudioHandler}
      onMicError={handleNoticeError}
      onDeleteMessage={(roomId, messageId) => sendWs({ type: 'chat:delete', roomId, messageId })}
      onTyping={(roomId, isTyping) => sendWs({ type: 'chat:typing', roomId, isTyping })}
      onSendPm={(toUserId, text, textColor, imageUrl) =>
        sendWs({ type: 'pm:send', toUserId, text, textColor, imageUrl })
      }
      onSelectPmPartner={handleSelectPmPartner}
      onCreateWallPost={(content, imageUrl, extras) =>
        sendWs({
          type: 'wall:post',
          content,
          imageUrl,
          youtubeUrl: extras?.youtubeUrl,
          audioUrl: extras?.audioUrl,
          audioDuration: extras?.audioDuration,
        })
      }
      onLikeWallPost={(postId) => sendWs({ type: 'wall:like', postId })}
      onCommentWallPost={(postId, text) => sendWs({ type: 'wall:comment', postId, text })}
      onDeleteWallPost={(postId) => sendWs({ type: 'wall:delete', postId })}
      onUpdateProfile={(payload: {
        username?: string;
        nameColor: string;
        textColor?: string;
        bgColor?: string;
        statusColor?: string;
        statusIcon?: string;
        pmDisabled?: boolean;
        socialLinks?: UserSocialLinks;
        statusText: string;
        bio: string;
        avatarSymbol: string;
        avatarUrl: string;
        coverUrl?: string;
        gender: UserGender;
      }) => sendWs({ type: 'profile:update', ...payload })}
      onSetStatusIcon={(statusIcon: string, statusText?: string) =>
        sendWs({ type: 'user:setStatusIcon', statusIcon, statusText })
      }
      passwordFeedback={passwordFeedback}
      onChangePassword={(currentPassword, newPassword) =>
        sendWs({ type: 'account:changePassword', currentPassword, newPassword })
      }
      onClearPasswordFeedback={() => setPasswordFeedback(null)}
      userStatsMap={userStatsMap}
      activeChallenge={activeChallenge}
      incomingChallenge={incomingChallenge}
      notifications={notifications}
      activeAlertPopup={activeAlertPopup}
      onDismissAlertPopup={() => setActiveAlertPopup(null)}
      onMarkNotificationsRead={() => sendWs({ type: 'notifications:markRead' })}
      onClearNotifications={() => sendWs({ type: 'notifications:clear' })}
      onViewUserProfile={(targetUserId) => sendWs({ type: 'user:viewProfile', targetUserId })}
      onToggleLikeUser={(targetUserId) => sendWs({ type: 'user:like', targetUserId })}
      onSendGift={(targetUserId: string, giftId: GiftId) =>
        sendWs({ type: 'user:sendGift', targetUserId, giftId })
      }
      onClearGiftIcon={(targetUserId: string) =>
        sendWs({ type: 'user:clearGiftIcon', targetUserId })
      }
      onAlertUser={(targetUserId, message) => sendWs({ type: 'user:alert', targetUserId, message })}
      onChallengeUser={(targetUserId, gameType) =>
        sendWs({ type: 'game:challenge', targetUserId, gameType })
      }
      onRespondChallenge={(challengeId, accept) => {
        sendWs({ type: 'game:respond', challengeId, accept });
        if (!accept) setIncomingChallenge(null);
      }}
      onXoMove={(challengeId, cellIndex) => sendWs({ type: 'game:xoMove', challengeId, cellIndex })}
      onLudoRoll={(challengeId) => sendWs({ type: 'game:ludoRoll', challengeId })}
      onCloseChallenge={() => setActiveChallenge(null)}
      onModAction={(targetUserId, action) => sendWs({ type: 'mod:action', targetUserId, action })}
      siteSettings={siteSettings}
      adminState={adminState}
      nickRevealResult={nickRevealResult}
      onClearNickRevealResult={() => setNickRevealResult(null)}
      onAdminRevealNicks={(targetUserId: string) =>
        sendWs({ type: 'admin:revealNicks', targetUserId })
      }
      onAdminClearNickHistory={() => sendWs({ type: 'admin:clearNickHistory' })}
      adminAnnouncement={adminAnnouncement}
      royalBanner={royalBanner}
      onDismissRoyalBanner={() => setRoyalBanner(null)}
      onDismissAnnouncement={() => setAdminAnnouncement(null)}
      onFetchAdminState={fetchAdminState}
      onUpdateSiteSettings={(settings) => sendWs({ type: 'admin:updateSettings', settings })}
      onAdminUpdateDesign={(design: SiteDesignSettings, defaultStyle?: YouCamStyleId) =>
        sendWs({ type: 'admin:updateDesign', design, defaultStyle })
      }
      onAdminUpdateGifts={(gifts: GiftItem[]) =>
        sendWs({ type: 'admin:updateGifts', gifts })
      }
      onAdminUpdateSmileys={(smileys: CustomSmiley[]) =>
        sendWs({ type: 'admin:updateSmileys', smileys })
      }
      onAdminUpdateBanners={(banners: SiteBanner[]) =>
        sendWs({ type: 'admin:updateBanners', banners })
      }
      onAdminToggleGhost={(enabled: boolean) =>
        sendWs({ type: 'admin:toggleGhost', enabled })
      }
      onAdminUpdateRolePermissions={(rolePermissions: RolePermissionsMap) =>
        sendWs({ type: 'admin:updateRolePermissions', rolePermissions })
      }
      onAdminSetUserPermissions={(targetUserId: string, permissions: Partial<RolePermissionSet>) =>
        sendWs({ type: 'admin:setUserPermissions', targetUserId, permissions })
      }
      onAdminSetUserLikes={(targetUserId: string, likesCount: number) =>
        sendWs({ type: 'admin:setUserLikes', targetUserId, likesCount })
      }
      onAdminEditUser={(
        targetUserId: string,
        payload: {
          username?: string;
          nameColor?: string;
          statusText?: string;
          gender?: UserGender;
          removeAvatar?: boolean;
          removeCover?: boolean;
        }
      ) => sendWs({ type: 'admin:editUser', targetUserId, ...payload })}
      onAdminSetRoyalEntry={(
        targetUserId: string,
        enabled: boolean,
        royalEntryText?: string,
        announceNow?: boolean
      ) =>
        sendWs({
          type: 'admin:setRoyalEntry',
          targetUserId,
          enabled,
          royalEntryText,
          announceNow,
        })
      }
      onAdminBulkRoyalEntry={(
        target: 'allOnline' | 'vipAndMods' | 'allRegistered' | 'revokeAll',
        royalEntryText?: string
      ) => sendWs({ type: 'admin:bulkRoyalEntry', target, royalEntryText })}
      onAdminBulkMicAction={(action: 'lockAll' | 'unlockAll' | 'kickAll' | 'muteAll' | 'unmuteAll') =>
        sendWs({ type: 'admin:bulkMicAction', action })
      }
      onAdminBroadcast={(text) => sendWs({ type: 'admin:broadcast', text })}
      onAdminSetRole={(targetUserId, role: UserRole) =>
        sendWs({ type: 'admin:setRole', targetUserId, role })
      }
      onAdminBanUser={(username, reason, targetUserId) =>
        sendWs({ type: 'admin:ban', username, reason, targetUserId })
      }
      onAdminUnbanUser={(banId) => sendWs({ type: 'admin:unban', banId })}
      onAdminDeleteAccount={(targetUserId) =>
        sendWs({ type: 'admin:deleteAccount', targetUserId })
      }
      onAdminMoveUserRoom={(targetUserId, roomId) =>
        sendWs({ type: 'admin:moveUserRoom', targetUserId, roomId })
      }
      onAdminUpdateRoom={(roomId, name, description, topic, password, imageUrl) =>
        sendWs({ type: 'admin:updateRoom', roomId, name, description, topic, password, imageUrl })
      }
      onAdminDeleteRoom={(roomId) => sendWs({ type: 'admin:deleteRoom', roomId })}
      onAdminClearRoom={(roomId) => sendWs({ type: 'admin:clearRoom', roomId })}
      onAdminClearAllRooms={() => sendWs({ type: 'admin:clearAllRooms' })}
      onAdminClearWall={() => sendWs({ type: 'admin:clearWall' })}
      onAdminClearAuditLogs={() => sendWs({ type: 'admin:clearAuditLogs' })}
      onAdminAddBannedWord={(word) => sendWs({ type: 'admin:addBannedWord', word })}
      onAdminRemoveBannedWord={(word) => sendWs({ type: 'admin:removeBannedWord', word })}
      onAdminSpawnTestMember={() => sendWs({ type: 'admin:spawnTestMember' })}
      onAdminSetDemoTalkControl={(targetUserId: string, enabled: boolean) =>
        sendWs({ type: 'admin:setDemoTalkControl', targetUserId, enabled })
      }
      onAdminDemoDirectAction={(
        targetUserId: string,
        action: 'sayRoom' | 'micJoin' | 'micLeave' | 'micSpeak' | 'setGender',
        payload?: { text?: string; slotIndex?: number; gender?: UserGender }
      ) =>
        sendWs({
          type: 'admin:demoDirectAction',
          targetUserId,
          action,
          ...payload,
        })
      }
      onLogout={handleLogout}
    />
  );
}
