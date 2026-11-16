import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Users,
  DoorOpen,
  MessageSquare,
  MessageCircle,
  Mail,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  LogOut,
  Search,
  Send,
  Smile,
  ImagePlus,
  Reply,
  Trash2,
  Plus,
  Edit3,
  Check,
  X,
  ArrowDown,
  Palette,
  Bold,
  Shield,
  Megaphone,
  Settings,
  User as UserIcon,
  ArrowRight,
  Trophy,
  Bell,
  Mic,
  MicOff,
  Square,
  Lock,
  Paintbrush,
  Radio,
  Sparkles,
  HelpCircle,
  ChevronUp,
  ChevronDown,
  Ghost,
  Share2,
  Star,
  UserPlus,
  Heart,
  Youtube,
  Maximize2,
  Minimize2,
  Crown,
  Music,
  ZoomIn,
  LogIn,
  ArrowLeftRight,
  UserX,
  Ban,
} from 'lucide-react';
import type {
  AdminStatePayload,
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
  YouCamStyleId,
  YouTubeSearchResult,
} from '../types/chat';
import {
  DEFAULT_DESIGN_SETTINGS,
  EMOJI_GROUPS,
  QUIZ_PRESETS,
  STATUS_ICON_PRESETS,
  TEXT_COLORS,
  extractYouTubeFromText,
  formatCompactMetric,
  formatCompactMinutes,
  formatStatusIcon,
  getDesignCssVars,
  getRoleLabel,
  getStatusIconLabel,
  hasUserPermission,
  readImageFileWithGifSupport,
  resolveEffectiveTheme,
  sanitizeExternalImageUrl,
} from '../utils/chatHelpers';
import { ProfileModal } from './ProfileModal';
import { UserProfileModal } from './UserProfileModal';
import { CreateRoomModal } from './CreateRoomModal';
import { SocialWall } from './SocialWall';
import { PrivateMessagesPanel } from './PrivateMessagesPanel';
import { FloatingPrivateChat } from './FloatingPrivateChat';
import { UserAvatar } from './UserAvatar';
import { AdminDashboard } from './AdminDashboard';
import {
  SettingsDrawer,
  type ChatFontScale,
  type VoiceServerOption,
} from './SettingsDrawer';
import { GamesModal } from './GamesModal';
import { ChallengeGameModal } from './ChallengeGameModal';
import { NotificationsModal } from './NotificationsModal';
import { AlertPopupModal } from './AlertPopupModal';
import { GeneralMicStage } from './GeneralMicStage';
import { DoodleModal } from './DoodleModal';
import { ImageLightboxModal, type LightboxImagePayload } from './ImageLightboxModal';
import { YouTubeSongSearchModal } from './YouTubeSongSearchModal';
import { RoomImagePicker, RoomThumbnail } from './RoomImagePicker';
import { BannerStrip, RichSmileyText } from './RichSmileyText';
import { useVoiceMics } from '../hooks/useVoiceMics';

type WorkspaceTab = 'chat' | 'pm' | 'admin';

interface ChatWorkspaceProps {
  self: ChatUser;
  token: string;
  rooms: Room[];
  currentRoomId: string;
  messages: ChatMessage[];
  onlineUsers: ChatUser[];
  wallPosts: WallPost[];
  topStars: TopStarEntry[];
  privateMessages: PrivateMessage[];
  typingUsers: Record<string, string>;
  connectionState: 'connecting' | 'connected' | 'reconnecting';
  noticeBanner: { text: string; tone: 'error' | 'info' } | null;
  roomPasswordPrompt: { roomId: string; roomName: string; error?: string } | null;
  isDark: boolean;
  soundEnabled: boolean;
  selectedStyle: YouCamStyleId;
  activeQuiz: RoomQuiz | null;
  unreadPmByUser: Record<string, number>;
  activePmPartnerId: string | null;
  onToggleTheme: () => void;
  onToggleSound: () => void;
  onChangeStyle: (style: YouCamStyleId) => void;
  onClearNotice: () => void;
  onDismissRoomPasswordPrompt: () => void;
  onJoinRoom: (roomId: string, password?: string) => void;
  isInSpace: boolean;
  onExitToSpace: () => void;
  onResumeFromSpace: () => void;
  onReportPresenceIdle: (isIdle: boolean) => void;
  onCreateRoom: (payload: { name: string; description: string; topic: string; password?: string; imageUrl?: string }) => void;
  onUpdateTopic: (roomId: string, topic: string) => void;
  onUpdateRoomImage: (roomId: string, imageUrl?: string) => void;
  onSetRoomMedia: (roomId: string, url: string, title?: string) => void;
  onClearRoomMedia: (roomId: string) => void;
  onStartRoomQuiz: (roomId: string, question: string, answer: string, rewardLikes?: number) => void;
  onStopRoomQuiz: (roomId: string) => void;
  onSendDedication: (roomId: string, text: string, toUsername?: string) => void;
  onSendMessage: (payload: {
    roomId: string;
    text: string;
    textColor: string;
    isBold: boolean;
    fontSize: 'sm' | 'md' | 'lg';
    replyTo?: ReplyReference;
    imageUrl?: string;
    audioUrl?: string;
    audioDuration?: number;
  }) => void;
  mics: MicSlot[];
  micRequests: MicRequestItem[];
  speakingUsers: Record<string, boolean>;
  micReactions: MicReaction[];
  onJoinMic: (slotIndex: number) => void;
  onLeaveMic: () => void;
  onToggleMicMute: () => void;
  onToggleMicCam: () => void;
  onToggleMicRequest: () => void;
  onMicModAction: (
    slotIndex: number,
    action: 'kick' | 'mute' | 'unmute' | 'lock' | 'unlock'
  ) => void;
  onGrantMicRequest: (targetUserId: string) => void;
  onSendMicSignal: (targetUserId: string, signal: MicSignalPayload) => void;
  onSendMicSpeaking: (isSpeaking: boolean) => void;
  onSendMicReaction: (emoji: string) => void;
  onRegisterMicSignalHandler: (
    handler: (fromUserId: string, signal: MicSignalPayload) => void
  ) => void;
  onRegisterBotMicAudioHandler?: (
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
  ) => void;
  onMicError: (message: string) => void;
  onDeleteMessage: (roomId: string, messageId: string) => void;
  onTyping: (roomId: string, isTyping: boolean) => void;
  onSendPm: (toUserId: string, text: string, textColor: string, imageUrl?: string) => void;
  onSelectPmPartner: (userId: string) => void;
  onCreateWallPost: (
    content: string,
    imageUrl?: string,
    extras?: { youtubeUrl?: string; audioUrl?: string; audioDuration?: number }
  ) => void;
  onLikeWallPost: (postId: string) => void;
  onCommentWallPost: (postId: string, text: string) => void;
  onDeleteWallPost: (postId: string) => void;
  onUpdateProfile: (payload: {
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
  }) => void;
  onSetStatusIcon: (statusIcon: string, statusText?: string) => void;
  passwordFeedback: { ok: boolean; message: string } | null;
  onChangePassword: (currentPassword: string, newPassword: string) => void;
  onClearPasswordFeedback: () => void;
  userStatsMap: Record<string, UserProfileStats>;
  activeChallenge: GameChallengeState | null;
  incomingChallenge: GameChallengeState | null;
  notifications: MemberNotification[];
  activeAlertPopup: {
    kind?: 'alert' | 'like';
    badgeNumber?: number;
    fromUserId: string;
    fromUsername: string;
    fromNameColor?: string;
    fromAvatarUrl?: string;
    message: string;
    timestamp: number;
  } | null;
  onDismissAlertPopup: () => void;
  onMarkNotificationsRead: () => void;
  onClearNotifications: () => void;
  onViewUserProfile: (targetUserId: string) => void;
  onToggleLikeUser: (targetUserId: string) => void;
  onSendGift: (targetUserId: string, giftId: GiftId) => void;
  onClearGiftIcon?: (targetUserId: string) => void;
  onAlertUser: (targetUserId: string, message?: string) => void;
  onChallengeUser: (targetUserId: string, gameType: 'xo' | 'ludo') => void;
  onRespondChallenge: (challengeId: string, accept: boolean) => void;
  onXoMove: (challengeId: string, cellIndex: number) => void;
  onLudoRoll: (challengeId: string) => void;
  onCloseChallenge: () => void;
  onModAction: (
    targetUserId: string,
    action: 'mute' | 'unmute' | 'kick' | 'promote' | 'demote'
  ) => void;
  siteSettings?: SiteSettings;
  adminState: AdminStatePayload | null;
  nickRevealResult?: NickRevealPayload | null;
  onClearNickRevealResult?: () => void;
  onAdminRevealNicks?: (targetUserId: string) => void;
  onAdminClearNickHistory?: () => void;
  adminAnnouncement: { text: string; by: string; timestamp: number } | null;
  royalBanner: {
    user: ChatUser;
    roomId: string;
    roomName: string;
    royalEntryText?: string;
    timestamp: number;
  } | null;
  onDismissRoyalBanner: () => void;
  onDismissAnnouncement: () => void;
  onFetchAdminState: () => void;
  onUpdateSiteSettings: (settings: SiteSettings) => void;
  onAdminUpdateDesign: (design: SiteDesignSettings, defaultStyle?: YouCamStyleId) => void;
  onAdminUpdateGifts?: (gifts: GiftItem[]) => void;
  onAdminUpdateSmileys?: (smileys: CustomSmiley[]) => void;
  onAdminUpdateBanners?: (banners: SiteBanner[]) => void;
  onAdminToggleGhost: (enabled: boolean) => void;
  onAdminUpdateRolePermissions: (rolePermissions: RolePermissionsMap) => void;
  onAdminSetUserPermissions: (targetUserId: string, permissions: Partial<RolePermissionSet>) => void;
  onAdminSetUserLikes: (targetUserId: string, likesCount: number) => void;
  onAdminEditUser: (
    targetUserId: string,
    payload: {
      username?: string;
      nameColor?: string;
      statusText?: string;
      gender?: UserGender;
      removeAvatar?: boolean;
      removeCover?: boolean;
    }
  ) => void;
  onAdminSetRoyalEntry?: (
    targetUserId: string,
    enabled: boolean,
    royalEntryText?: string,
    announceNow?: boolean
  ) => void;
  onAdminBulkRoyalEntry?: (
    target: 'allOnline' | 'vipAndMods' | 'allRegistered' | 'revokeAll',
    royalEntryText?: string
  ) => void;
  onAdminBulkMicAction: (action: 'lockAll' | 'unlockAll' | 'kickAll' | 'muteAll' | 'unmuteAll') => void;
  onAdminBroadcast: (text: string) => void;
  onAdminSetRole: (targetUserId: string, role: UserRole) => void;
  onAdminBanUser: (username: string, reason: string, targetUserId?: string) => void;
  onAdminUnbanUser: (banId: string) => void;
  onAdminDeleteAccount: (targetUserId: string) => void;
  onAdminMoveUserRoom: (targetUserId: string, roomId: string) => void;
  onAdminUpdateRoom: (
    roomId: string,
    name: string,
    description: string,
    topic: string,
    password?: string,
    imageUrl?: string
  ) => void;
  onAdminDeleteRoom: (roomId: string) => void;
  onAdminClearRoom: (roomId: string) => void;
  onAdminClearAllRooms: () => void;
  onAdminClearWall: () => void;
  onAdminClearAuditLogs: () => void;
  onAdminAddBannedWord: (word: string) => void;
  onAdminRemoveBannedWord: (word: string) => void;
  onAdminSpawnTestMember?: () => void;
  onAdminSetDemoTalkControl?: (targetUserId: string, enabled: boolean) => void;
  onAdminDemoDirectAction?: (
    targetUserId: string,
    action: 'sayRoom' | 'micJoin' | 'micLeave' | 'micSpeak' | 'setGender',
    payload?: { text?: string; slotIndex?: number; gender?: UserGender }
  ) => void;
  onLogout: () => void;
}

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({
  self,
  token,
  rooms,
  currentRoomId,
  messages,
  onlineUsers,
  wallPosts,
  topStars,
  privateMessages,
  typingUsers,
  connectionState,
  noticeBanner,
  roomPasswordPrompt,
  isDark,
  soundEnabled,
  selectedStyle,
  activeQuiz,
  unreadPmByUser,
  activePmPartnerId,
  onToggleTheme,
  onToggleSound,
  onChangeStyle,
  onClearNotice,
  onDismissRoomPasswordPrompt,
  onJoinRoom,
  onReportPresenceIdle,
  onCreateRoom,
  onUpdateTopic,
  onUpdateRoomImage,
  onSetRoomMedia,
  onClearRoomMedia,
  onStartRoomQuiz,
  onStopRoomQuiz,
  onSendDedication,
  onSendMessage,
  mics,
  micRequests,
  speakingUsers,
  micReactions,
  onJoinMic,
  onLeaveMic,
  onToggleMicMute,
  onToggleMicCam,
  onToggleMicRequest,
  onMicModAction,
  onGrantMicRequest,
  onSendMicSignal,
  onSendMicSpeaking,
  onSendMicReaction,
  onRegisterMicSignalHandler,
  onMicError,
  onDeleteMessage,
  onTyping,
  onSendPm,
  onSelectPmPartner,
  onCreateWallPost,
  onLikeWallPost,
  onCommentWallPost,
  onDeleteWallPost,
  onUpdateProfile,
  onSetStatusIcon,
  passwordFeedback,
  onChangePassword,
  onClearPasswordFeedback,
  userStatsMap,
  activeChallenge,
  incomingChallenge,
  notifications,
  activeAlertPopup,
  onDismissAlertPopup,
  onMarkNotificationsRead,
  onClearNotifications,
  onViewUserProfile,
  onToggleLikeUser,
  onSendGift,
  onClearGiftIcon,
  onAlertUser,
  onChallengeUser,
  onRespondChallenge,
  onXoMove,
  onLudoRoll,
  onCloseChallenge,
  onModAction,
  siteSettings,
  adminState,
  nickRevealResult,
  onClearNickRevealResult,
  onAdminRevealNicks,
  onAdminClearNickHistory,
  adminAnnouncement,
  royalBanner,
  onDismissRoyalBanner,
  onDismissAnnouncement,
  onFetchAdminState,
  onUpdateSiteSettings,
  onAdminUpdateDesign,
  onAdminUpdateGifts,
  onAdminUpdateSmileys,
  onAdminUpdateBanners,
  onAdminToggleGhost,
  onAdminUpdateRolePermissions,
  onAdminSetUserPermissions,
  onAdminSetUserLikes,
  onAdminEditUser,
  onAdminSetRoyalEntry,
  onAdminBulkRoyalEntry,
  onAdminBulkMicAction,
  onAdminBroadcast,
  onAdminSetRole,
  onAdminBanUser,
  onAdminUnbanUser,
  onAdminDeleteAccount,
  onAdminMoveUserRoom,
  onAdminUpdateRoom,
  onAdminDeleteRoom,
  onAdminClearRoom,
  onAdminClearAllRooms,
  onAdminClearWall,
  onAdminClearAuditLogs,
  onAdminAddBannedWord,
  onAdminRemoveBannedWord,
  onAdminSpawnTestMember,
  onAdminSetDemoTalkControl,
  onAdminDemoDirectAction,
  onRegisterBotMicAudioHandler,
  isInSpace,
  onExitToSpace,
  onResumeFromSpace,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('chat');
  const [userSearch, setUserSearch] = useState('');
  const [ignoredUserIds, setIgnoredUserIds] = useState<string[]>([]);
  const [selectedUserModal, setSelectedUserModal] = useState<ChatUser | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [createRoomInitialVoiceMode, setCreateRoomInitialVoiceMode] = useState(false);
  const [showGamesModal, setShowGamesModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [mobileDrawer, setMobileDrawer] = useState<'none' | 'users' | 'rooms' | 'pm' | 'wall' | 'settings'>('none');
  const [pmExpanded, setPmExpanded] = useState(false);
  const [hasOpenedWall, setHasOpenedWall] = useState(false);
  const drawerTouchRef = useRef<{ x: number; y: number } | null>(null);
  const [showQuickStatusPicker, setShowQuickStatusPicker] = useState(false);
  const [customQuickIcon, setCustomQuickIcon] = useState(self.statusIcon || '');
  const [syncStatusLabelWithIcon, setSyncStatusLabelWithIcon] = useState(true);

  useEffect(() => {
    if (mobileDrawer === 'wall') {
      setHasOpenedWall(true);
    }
  }, [mobileDrawer]);

  const handleDrawerTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (t) {
      drawerTouchRef.current = { x: t.clientX, y: t.clientY };
    }
  };

  const handleDrawerTouchEnd = (side: 'right' | 'left', e: React.TouchEvent) => {
    const start = drawerTouchRef.current;
    drawerTouchRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.35) {
      if ((side === 'right' && dx > 0) || (side === 'left' && dx < 0)) {
        setMobileDrawer('none');
      }
    }
  };

  useEffect(() => {
    setCustomQuickIcon(self.statusIcon || '');
  }, [self.statusIcon]);

  // Settings preferences
  const [fontScale, setFontScale] = useState<ChatFontScale>(() => {
    const saved = Number(localStorage.getItem('iraqiachat_font_scale'));
    return saved === 85 || saved === 115 || saved === 130 || saved === 150 ? saved : 100;
  });
  const [voiceServer, setVoiceServer] = useState<VoiceServerOption>(() => {
    const saved = localStorage.getItem('iraqiachat_voice_server');
    return saved === 'fast' || saved === 'backup' ? saved : 'primary';
  });
  const [hideJoinNotices, setHideJoinNotices] = useState(false);
  const [clearedBeforeTs, setClearedBeforeTs] = useState(0);

  // YouCam Host interactive features (Doodle, Dedication, Room Media, Room Quiz)
  const [showDoodleModal, setShowDoodleModal] = useState(false);
  const [showDedicationModal, setShowDedicationModal] = useState(false);
  const [dedicationTo, setDedicationTo] = useState('');
  const [dedicationText, setDedicationText] = useState('');
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [mediaTitleInput, setMediaTitleInput] = useState('');
  const [mediaCollapsed, setMediaCollapsed] = useState(false);
  const [youtubeSearchMode, setYoutubeSearchMode] = useState<'chat' | 'roomMedia' | null>(null);
  const [expandedChatYoutubeIds, setExpandedChatYoutubeIds] = useState<Record<string, boolean>>({});
  const [showRoomImageModal, setShowRoomImageModal] = useState(false);
  const [roomImageDraft, setRoomImageDraft] = useState('');
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizQuestionInput, setQuizQuestionInput] = useState(QUIZ_PRESETS[0].question);
  const [quizAnswerInput, setQuizAnswerInput] = useState(QUIZ_PRESETS[0].answer);
  const [quizRewardInput, setQuizRewardInput] = useState(QUIZ_PRESETS[0].rewardLikes);

  // Composer state
  const [draft, setDraft] = useState('');
  const [textColor, setTextColor] = useState(self.textColor || '');
  const [isBold, setIsBold] = useState(false);
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [replyTo, setReplyTo] = useState<ReplyReference | undefined>(undefined);
  const [pendingImage, setPendingImage] = useState<string | undefined>(undefined);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFormatTray, setShowFormatTray] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<LightboxImagePayload | null>(null);

  // Voice stage & voice note state
  const [isDeafened, setIsDeafened] = useState(false);
  const [isRecordingNote, setIsRecordingNote] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [pendingAudio, setPendingAudio] = useState<{ url: string; duration: number } | undefined>(
    undefined
  );
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const recordDurationRef = useRef<number>(0);

  const [roomPasswordInput, setRoomPasswordInput] = useState('');
  const [chatBgError, setChatBgError] = useState(false);

  const design = useMemo(
    () => siteSettings?.design || DEFAULT_DESIGN_SETTINGS,
    [siteSettings?.design]
  );

  useEffect(() => {
    setChatBgError(false);
  }, [design.chatBgUrl]);

  useEffect(() => {
    setRoomPasswordInput('');
  }, [roomPasswordPrompt?.roomId]);

  const currentRoom = useMemo(
    () => rooms.find((r) => r.id === currentRoomId) || rooms[0],
    [rooms, currentRoomId]
  );
  const isVoiceEnabled = currentRoomId === 'general' || Boolean(currentRoom?.isVoiceRoom);
  const customVoiceRooms = useMemo(() => rooms.filter((r) => Boolean(r.isVoiceRoom)), [rooms]);

  useEffect(() => {
    if (isInSpace) {
      setShowFormatTray(false);
      setShowEmojiPicker(false);
    }
  }, [isInSpace]);

  const openCreateVoiceRoomModal = () => {
    setCreateRoomInitialVoiceMode(true);
    setShowCreateRoomModal(true);
    setMobileDrawer('none');
  };

  const { localLevel, isLocalSpeaking, localVideoStream, remoteStreams } = useVoiceMics({
    selfId: self.id,
    currentRoomId,
    isVoiceEnabled,
    mics,
    onlineUsers,
    soundEnabled,
    isDeafened,
    onSendSignal: onSendMicSignal,
    onSendSpeaking: onSendMicSpeaking,
    onLeaveMic,
    onToggleCam: onToggleMicCam,
    onMicError,
    onRegisterSignalHandler: onRegisterMicSignalHandler,
  });

  // Queued playback for demo member mic TTS voice
  const botAudioQueueRef = useRef<{ mimeType: string; audioBase64: string; spokenText?: string; gender?: UserGender }[]>([]);
  const activeBotAudioRef = useRef<HTMLAudioElement | null>(null);
  const botAudioPlayingRef = useRef(false);
  const isDeafenedRef = useRef(isDeafened);
  isDeafenedRef.current = isDeafened;
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;
  const workspaceRoomIdRef = useRef(currentRoomId);
  workspaceRoomIdRef.current = currentRoomId;

  useEffect(() => {
    if (isDeafened || !soundEnabled || !isVoiceEnabled) {
      botAudioQueueRef.current = [];
      if (activeBotAudioRef.current) {
        activeBotAudioRef.current.pause();
        activeBotAudioRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      botAudioPlayingRef.current = false;
    }
  }, [isDeafened, soundEnabled, isVoiceEnabled]);

  useEffect(() => {
    if (!onRegisterBotMicAudioHandler) return;
    const playNext = () => {
      if (botAudioPlayingRef.current) return;
      if (isDeafenedRef.current || !soundEnabledRef.current || workspaceRoomIdRef.current !== 'general') {
        botAudioQueueRef.current = [];
        return;
      }
      const next = botAudioQueueRef.current.shift();
      if (!next) return;
      botAudioPlayingRef.current = true;
      const done = () => {
        botAudioPlayingRef.current = false;
        playNext();
      };

      if (next.audioBase64) {
        const audio = new Audio(`data:${next.mimeType};base64,${next.audioBase64}`);
        activeBotAudioRef.current = audio;
        const finishAudio = () => {
          if (activeBotAudioRef.current === audio) {
            activeBotAudioRef.current = null;
          }
          done();
        };
        audio.onended = finishAudio;
        audio.onerror = finishAudio;
        audio.play().catch(finishAudio);
        return;
      }

      if (next.spokenText && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          const utterance = new SpeechSynthesisUtterance(next.spokenText);
          utterance.lang = 'ar-IQ';
          const isMale = next.gender === 'male';
          utterance.pitch = isMale ? 0.85 : 1.25;
          utterance.rate = isMale ? 0.96 : 0.94;
          const voices = window.speechSynthesis.getVoices();
          const arVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('ar'));
          const femaleRegex = /(female|woman|girl|zeina|laila|salma|amina|hoda|rana|sara|zira|maryam)/i;
          const maleRegex = /(male|man|boy|maged|tarik|naayf|hamed|shakir|bassel|jamal)/i;
          const matchedVoice = isMale
            ? arVoices.find((v) => maleRegex.test(v.name)) || arVoices.find((v) => !femaleRegex.test(v.name)) || arVoices[0]
            : arVoices.find((v) => femaleRegex.test(v.name)) || arVoices[0];
          if (matchedVoice) utterance.voice = matchedVoice;
          utterance.onend = done;
          utterance.onerror = done;
          window.speechSynthesis.speak(utterance);
          return;
        } catch {
          // fallback cleanly
        }
      }
      done();
    };

    onRegisterBotMicAudioHandler((payload) => {
      if (payload.roomId !== workspaceRoomIdRef.current) return;
      if (isDeafenedRef.current || !soundEnabledRef.current) return;
      botAudioQueueRef.current.push({
        mimeType: payload.mimeType || 'audio/wav',
        audioBase64: payload.audioBase64 || '',
        spokenText: payload.spokenText,
        gender: payload.gender,
      });
      if (botAudioQueueRef.current.length > 5) {
        botAudioQueueRef.current = botAudioQueueRef.current.slice(-5);
      }
      playNext();
    });

    return () => {
      botAudioQueueRef.current = [];
      if (activeBotAudioRef.current) {
        activeBotAudioRef.current.pause();
        activeBotAudioRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      botAudioPlayingRef.current = false;
    };
  }, [onRegisterBotMicAudioHandler]);

  useEffect(() => {
    setTextColor(self.textColor || '');
  }, [self.textColor]);

  useEffect(() => {
    if (selectedUserModal?.id) {
      onViewUserProfile(selectedUserModal.id);
    }
  }, [selectedUserModal?.id, onViewUserProfile]);

  // Public chat active/idle presence reporting (private chat interactions intentionally excluded)
  const lastPublicActivityRef = useRef<number>(Date.now());
  const lastPresencePingRef = useRef<number>(Date.now());
  const lastReportedIdleRef = useRef<boolean>(false);
  const onReportPresenceIdleRef = useRef(onReportPresenceIdle);
  onReportPresenceIdleRef.current = onReportPresenceIdle;

  const markPublicUiActive = useCallback(() => {
    if (isInSpace || activeTab !== 'chat') return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    const now = Date.now();
    lastPublicActivityRef.current = now;
    if (lastReportedIdleRef.current) {
      lastReportedIdleRef.current = false;
      lastPresencePingRef.current = now;
      onReportPresenceIdleRef.current(false);
    } else if (now - lastPresencePingRef.current >= 40_000) {
      lastPresencePingRef.current = now;
      onReportPresenceIdleRef.current(false);
    }
  }, [isInSpace, activeTab]);

  useEffect(() => {
    if (isInSpace) {
      lastReportedIdleRef.current = true;
      onReportPresenceIdleRef.current(true);
    } else {
      const now = Date.now();
      lastPublicActivityRef.current = now;
      lastPresencePingRef.current = now;
      lastReportedIdleRef.current = false;
      onReportPresenceIdleRef.current(false);
    }
  }, [isInSpace, currentRoomId]);

  useEffect(() => {
    let hiddenTimer: number | null = null;
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (hiddenTimer) window.clearTimeout(hiddenTimer);
        hiddenTimer = window.setTimeout(() => {
          if (document.visibilityState === 'hidden' && !lastReportedIdleRef.current) {
            lastReportedIdleRef.current = true;
            onReportPresenceIdleRef.current(true);
          }
        }, 25_000);
      } else {
        if (hiddenTimer) {
          window.clearTimeout(hiddenTimer);
          hiddenTimer = null;
        }
        if (!isInSpace && activeTab === 'chat' && mobileDrawer !== 'pm') {
          markPublicUiActive();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const idleInterval = window.setInterval(() => {
      const now = Date.now();
      if (!isInSpace && !lastReportedIdleRef.current && now - lastPublicActivityRef.current >= 90_000) {
        lastReportedIdleRef.current = true;
        onReportPresenceIdleRef.current(true);
      } else if (
        !isInSpace &&
        !lastReportedIdleRef.current &&
        now - lastPublicActivityRef.current < 35_000 &&
        now - lastPresencePingRef.current >= 40_000
      ) {
        lastPresencePingRef.current = now;
        onReportPresenceIdleRef.current(false);
      }
    }, 15_000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (hiddenTimer) window.clearTimeout(hiddenTimer);
      window.clearInterval(idleInterval);
    };
  }, [isInSpace, activeTab, mobileDrawer, markPublicUiActive]);

  const handleChangeFontScale = (scale: ChatFontScale) => {
    setFontScale(scale);
    localStorage.setItem('iraqiachat_font_scale', String(scale));
  };

  const handleChangeVoiceServer = (srv: VoiceServerOption) => {
    setVoiceServer(srv);
    localStorage.setItem('iraqiachat_voice_server', srv);
  };

  // Topic edit state
  const [isEditingTopic, setIsEditingTopic] = useState(false);
  const [topicInput, setTopicInput] = useState('');

  // Scroll tracking
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasNewUnread, setHasNewUnread] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<number | null>(null);
  const [guestRoomHint, setGuestRoomHint] = useState(false);

  const totalOnlineCount = useMemo(
    () =>
      Math.max(
        onlineUsers.length,
        rooms.reduce((sum, r) => sum + r.onlineCount, 0)
      ),
    [onlineUsers.length, rooms]
  );

  const totalUnreadPm = useMemo(
    () => Object.values(unreadPmByUser).reduce((acc, n) => acc + n, 0),
    [unreadPmByUser]
  );

  const unreadNotificationsCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const openNotificationsCenter = () => {
    setShowNotificationsModal(true);
    setMobileDrawer('none');
    if (unreadNotificationsCount > 0) {
      onMarkNotificationsRead();
    }
  };

  const filteredOnlineUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return onlineUsers;
    return onlineUsers.filter(
      (u) => u.username.toLowerCase().includes(q) || u.country.toLowerCase().includes(q)
    );
  }, [onlineUsers, userSearch]);

  const theme = useMemo(
    () => resolveEffectiveTheme(siteSettings, selectedStyle),
    [siteSettings, selectedStyle]
  );
  const cssVars = useMemo(() => getDesignCssVars(theme, design), [theme, design]);
  const isStaff =
    self.role === 'admin' ||
    self.role === 'moderator' ||
    hasUserPermission(self, siteSettings, 'canManageRoomMedia') ||
    hasUserPermission(self, siteSettings, 'canRunQuiz');
  const canAccessAdmin = hasUserPermission(self, siteSettings, 'canAccessAdminPanel');
  const canManageAccounts = hasUserPermission(self, siteSettings, 'canManageAccounts');
  const canSendImages =
    (siteSettings?.allowImages !== false || self.role === 'admin') &&
    hasUserPermission(self, siteSettings, 'canSendImages');
  const canSendVoiceNotes =
    (siteSettings?.allowVoiceNotes !== false || self.role === 'admin') &&
    hasUserPermission(self, siteSettings, 'canSendVoice');

  const selfLikesCount = userStatsMap[self.id]?.likesCount ?? self.likesCount ?? 50;
  const minLikesToChat = Math.max(0, Math.round(Number(siteSettings?.minLikesToChat) || 0));
  const isStaffChatExempt = self.role === 'admin' || self.role === 'moderator';
  const isLikesRestrictedForChat =
    minLikesToChat > 0 && !isStaffChatExempt && selfLikesCount < minLikesToChat;
  const isChatComposerDisabled = isInSpace || self.isMuted || isLikesRestrictedForChat;

  const visibleMessages = useMemo(
    () =>
      messages.filter(
        (m) =>
          m.timestamp > clearedBeforeTs &&
          !ignoredUserIds.includes(m.userId) &&
          !(
            hideJoinNotices &&
            m.type === 'system' &&
            (m.systemKind === 'join' || m.systemKind === 'move' || m.systemKind === 'leave') &&
            !m.isRoyalEntry
          )
      ),
    [messages, clearedBeforeTs, ignoredUserIds, hideJoinNotices]
  );

  const typingNames = useMemo(() => Object.values(typingUsers), [typingUsers]);

  const canEditTopic =
    currentRoom &&
    (hasUserPermission(self, siteSettings, 'canEditRoomTopic') ||
      hasUserPermission(self, siteSettings, 'canManageRooms') ||
      currentRoom.createdBy === self.id);

  const lastVisibleMessageId = visibleMessages[visibleMessages.length - 1]?.id || '';

  useEffect(() => {
    if (activeTab !== 'chat') return;
    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setHasNewUnread(false);
    } else if (visibleMessages.length > 0) {
      setHasNewUnread(true);
    }
  }, [visibleMessages.length, lastVisibleMessageId, currentRoomId, activeTab, isAtBottom]);

  useEffect(() => {
    setIsAtBottom(true);
    setHasNewUnread(false);
    setIsEditingTopic(false);
    setShowFormatTray(false);
    setShowEmojiPicker(false);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, 30);
  }, [currentRoomId]);

  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom < 80;
    setIsAtBottom(nearBottom);
    if (nearBottom) {
      setHasNewUnread(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setIsAtBottom(true);
    setHasNewUnread(false);
  };

  const handleComposerFocus = () => {
    markPublicUiActive();
    if (!isAtBottom) return;
    window.setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }), 140);
    window.setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 340);
  };

  const handleDraftChange = (val: string) => {
    if (isChatComposerDisabled) return;
    markPublicUiActive();
    setDraft(val);
    onTyping(currentRoomId, val.trim().length > 0);
    if (typingTimerRef.current) {
      window.clearTimeout(typingTimerRef.current);
    }
    typingTimerRef.current = window.setTimeout(() => {
      onTyping(currentRoomId, false);
    }, 2000);
  };

  const submitChatMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isInSpace) return;
    if (isLikesRestrictedForChat) {
      onMicError(
        `التحدث في الدردشة العامة يتطلب ${minLikesToChat} لايك على الأقل (لايكاتك الحالية: ${selfLikesCount}).`
      );
      return;
    }
    if (self.isMuted) return;
    if (!draft.trim() && !pendingImage && !pendingAudio) return;
    markPublicUiActive();
    onSendMessage({
      roomId: currentRoomId,
      text: draft.trim(),
      textColor,
      isBold,
      fontSize,
      replyTo,
      imageUrl: pendingImage,
      audioUrl: pendingAudio?.url,
      audioDuration: pendingAudio?.duration,
    });
    setDraft('');
    setReplyTo(undefined);
    setPendingImage(undefined);
    setPendingAudio(undefined);
    setShowEmojiPicker(false);
    setShowFormatTray(false);
    onTyping(currentRoomId, false);
    setIsAtBottom(true);
  };

  const stopVoiceNoteRecording = () => {
    if (recordTimerRef.current) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingNote(false);
  };

  const startVoiceNoteRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      onMicError('المتصفح لا يدعم تسجيل الرسائل الصوتية.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 24000 })
        : new MediaRecorder(stream);

      recordChunksRef.current = [];
      recordDurationRef.current = 0;
      setRecordSeconds(0);
      setIsRecordingNote(true);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) recordChunksRef.current.push(ev.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(recordChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        if (blob.size > 0 && blob.size <= 270_000) {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (typeof reader.result === 'string') {
              setPendingAudio({
                url: reader.result,
                duration: Math.max(1, recordDurationRef.current),
              });
            }
          };
          reader.readAsDataURL(blob);
        } else if (blob.size > 270_000) {
          onMicError('الرسالة الصوتية طويلة جداً، يرجى تقصير مدة التسجيل.');
        }
      };

      recorder.start(250);
      recordTimerRef.current = window.setInterval(() => {
        recordDurationRef.current += 1;
        setRecordSeconds(recordDurationRef.current);
        if (recordDurationRef.current >= 20) {
          stopVoiceNoteRecording();
        }
      }, 1000);
    } catch {
      onMicError('تعذر تشغيل الميكروفون لتسجيل رسالة صوتية.');
      setIsRecordingNote(false);
    }
  };

  const handleAttachImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const processed = await readImageFileWithGifSupport(file);
      setPendingImage(processed);
    } catch (err) {
      onMicError(err instanceof Error ? err.message : 'تعذر إرفاق الصورة أو ملف GIF.');
    } finally {
      e.target.value = '';
    }
  };

  const handleMention = (username: string) => {
    setActiveTab('chat');
    setDraft((prev) => `${prev ? `${prev} ` : ''}@${username} `);
    setTimeout(() => composerInputRef.current?.focus(), 50);
  };

  const handleStartPm = (user: ChatUser) => {
    onViewUserProfile(user.id);
    onSelectPmPartner(user.id);
    setActiveTab('chat');
    setMobileDrawer('none');
    setPmExpanded(false);
  };

  const handleToggleIgnore = (userId: string) => {
    setIgnoredUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const cycleFontSize = () => {
    setFontSize((prev) => (prev === 'sm' ? 'md' : prev === 'md' ? 'lg' : 'sm'));
  };

  const showGuestCreateRoomHint = () => {
    setGuestRoomHint(true);
    window.setTimeout(() => setGuestRoomHint(false), 3500);
  };

  const canEditOwnProfile =
    hasUserPermission(self, siteSettings, 'canEditProfile') &&
    (siteSettings?.allowProfileEdits !== false || self.role === 'admin');

  const renderOnlineUsersList = () => (
    <div className="flex flex-col h-full">
      <div className="p-3 pl-12 lg:pl-3 bg-[var(--ych-primary)] dark:bg-zinc-900 text-white border-b border-[var(--ych-primary-dark)] dark:border-zinc-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-bold text-white flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            <span>المتواجدون الآن</span>
          </h2>
          <span className="text-xs font-mono-tabular font-bold bg-[#44a948] px-2 py-0.5 rounded-xs">
            {onlineUsers.length}
          </span>
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="بحث بالاسم..."
            className="w-full h-9 sm:h-8 pr-8 pl-3 rounded-xs border border-[var(--ych-primary-dark)] dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm sm:text-xs text-stone-900 dark:text-stone-100 focus:outline-none"
          />
        </div>
        {onAdminSpawnTestMember &&
          (canAccessAdmin ||
            hasUserPermission(self, siteSettings, 'canManageAccounts') ||
            hasUserPermission(self, siteSettings, 'canMuteUsers') ||
            hasUserPermission(self, siteSettings, 'canKickUsers')) && (
            <button
              type="button"
              onClick={onAdminSpawnTestMember}
              className="w-full h-8 px-2.5 rounded-xs bg-black/20 hover:bg-black/30 border border-white/25 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5 shrink-0" />
              <span>إضافة عضو تجريبي لاختبار الصلاحيات</span>
            </button>
          )}
      </div>

      {/* Member Status Lights Legend */}
      <div className="px-2.5 py-1.5 border-b border-stone-200 dark:border-zinc-800 bg-stone-50/90 dark:bg-zinc-950/90 flex items-center justify-center gap-2.5 flex-wrap text-[10px] font-bold text-stone-600 dark:text-stone-300 shrink-0">
        <span className="inline-flex items-center gap-1" title="نشط في العام">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.85)]" />
          <span>نشط</span>
        </span>
        <span className="inline-flex items-center gap-1" title="خامل في العام">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-[0_0_5px_rgba(250,204,21,0.85)]" />
          <span>خامل</span>
        </span>
        <span className="inline-flex items-center gap-1" title="الخاص مغلق">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.85)]" />
          <span>مغلق الخاص</span>
        </span>
        {self.role === 'admin' && (
          <span className="inline-flex items-center gap-1" title="يتجول بوضع الشبح">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.9)]" />
            <span>الشبح</span>
          </span>
        )}
      </div>

      {/* Quick Mood / Activity Status Icon Selector for Self */}
      {canEditOwnProfile && (
        <div className="border-b border-stone-200 dark:border-zinc-800 bg-stone-50/90 dark:bg-zinc-950/70 px-2.5 py-2 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-6 h-6 rounded-xs bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 flex items-center justify-center text-sm leading-none shrink-0"
                title={getStatusIconLabel(self.statusIcon) || 'رمز حالتك الحالي'}
              >
                {self.statusIcon || <Smile className="w-3.5 h-3.5 text-stone-400" />}
              </span>
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-stone-800 dark:text-stone-200 truncate">
                  {self.statusIcon
                    ? getStatusIconLabel(self.statusIcon) || self.statusText || 'رمزي الحالي'
                    : 'اختر رمز مزاجك'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowQuickStatusPicker((v) => !v)}
              className="px-2 py-1 rounded-xs bg-white dark:bg-zinc-900 border border-stone-300 dark:border-zinc-700 hover:bg-[var(--ych-soft)] dark:hover:bg-zinc-800 text-[11px] font-bold text-[var(--ych-primary)] dark:text-amber-300 shrink-0 cursor-pointer"
            >
              {showQuickStatusPicker ? 'إغلاق' : self.statusIcon ? 'تغيير' : 'تعيين'}
            </button>
          </div>

          {showQuickStatusPicker && (
            <div className="p-2 rounded-xs bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between gap-1 text-[10px] text-stone-500 dark:text-stone-400">
                <label className="inline-flex items-center gap-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={syncStatusLabelWithIcon}
                    onChange={(e) => setSyncStatusLabelWithIcon(e.target.checked)}
                    className="accent-[var(--ych-primary)]"
                  />
                  <span>تحديث نص الحالة تلقائياً</span>
                </label>
                {self.statusIcon && (
                  <button
                    type="button"
                    onClick={() => {
                      onSetStatusIcon('');
                      setCustomQuickIcon('');
                      setShowQuickStatusPicker(false);
                    }}
                    className="text-red-600 dark:text-red-400 font-bold hover:underline cursor-pointer"
                  >
                    إزالة الرمز
                  </button>
                )}
              </div>

              <div className="grid grid-cols-5 gap-1">
                {STATUS_ICON_PRESETS.map((preset) => {
                  const active = self.statusIcon === preset.icon;
                  return (
                    <button
                      key={preset.icon}
                      type="button"
                      title={preset.label}
                      onClick={() => {
                        onSetStatusIcon(
                          preset.icon,
                          syncStatusLabelWithIcon ? preset.label : undefined
                        );
                        setShowQuickStatusPicker(false);
                      }}
                      className={`h-8 rounded-xs border text-base flex items-center justify-center transition-colors cursor-pointer ${
                        active
                          ? 'border-[var(--ych-primary)] bg-[var(--ych-soft)] dark:bg-zinc-800 ring-1 ring-[var(--ych-primary)]'
                          : 'border-stone-200 dark:border-zinc-800 bg-stone-50/70 dark:bg-zinc-950 hover:bg-stone-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {preset.icon}
                    </button>
                  );
                })}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formatted = formatStatusIcon(customQuickIcon);
                  onSetStatusIcon(formatted);
                  setShowQuickStatusPicker(false);
                }}
                className="flex items-center gap-1"
              >
                <input
                  type="text"
                  value={customQuickIcon}
                  onChange={(e) => setCustomQuickIcon(formatStatusIcon(e.target.value))}
                  placeholder="إيموجي مخصص..."
                  className="flex-1 min-w-0 h-7 px-2 rounded-xs border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-xs text-center"
                />
                <button
                  type="submit"
                  className="px-2.5 h-7 rounded-xs bg-[#44a948] hover:bg-[#3a963e] text-white text-[11px] font-bold shrink-0 cursor-pointer"
                >
                  حفظ
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto chat-scroll divide-y divide-stone-100 dark:divide-zinc-800/80">
        {filteredOnlineUsers.length === 0 ? (
          <div className="p-6 text-center text-xs text-stone-500 dark:text-stone-400">
            لا يوجد أعضاء مطابقون للبحث.
          </div>
        ) : (
          filteredOnlineUsers.map((u) => {
            const isMe = u.id === self.id;
            const isIgnored = ignoredUserIds.includes(u.id);
            const iconTitle = u.statusIcon
              ? getStatusIconLabel(u.statusIcon) || u.statusText || 'رمز الحالة'
              : '';
            const presenceLight = u.isGhost
              ? {
                  dotClass: 'bg-blue-500 shadow-[0_0_7px_rgba(59,130,246,0.95)]',
                  label: 'يتجول بوضع الشبح',
                }
              : u.pmDisabled
              ? {
                  dotClass: 'bg-red-500 shadow-[0_0_7px_rgba(239,68,68,0.9)]',
                  label: 'الخاص مغلق',
                }
              : u.isIdle
              ? {
                  dotClass: 'bg-yellow-400 shadow-[0_0_7px_rgba(250,204,21,0.9)]',
                  label: 'خامل في العام',
                }
              : {
                  dotClass: 'bg-emerald-500 shadow-[0_0_7px_rgba(16,185,129,0.9)]',
                  label: 'نشط في العام',
                };
            return (
              <button
                key={u.id}
                type="button"
                dir="ltr"
                onClick={() => {
                  setSelectedUserModal(u);
                  setMobileDrawer('none');
                }}
                className="w-full px-3 py-2.5 min-h-[54px] flex items-center gap-2.5 text-left hover:bg-[var(--ych-soft)] active:bg-[var(--ych-soft)] dark:hover:bg-zinc-800/60 dark:active:bg-zinc-800/80 transition-colors cursor-pointer"
                style={!isDark && u.bgColor ? { backgroundColor: u.bgColor } : undefined}
              >
                <div className="relative shrink-0">
                  <UserAvatar avatarUrl={u.avatarUrl} username={u.username} size="sm" className="rounded-xs" />
                  <span
                    title={presenceLight.label}
                    aria-label={presenceLight.label}
                    className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-zinc-900 ${presenceLight.dotClass}`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {u.giftImageUrl ? (
                      <img
                        src={u.giftImageUrl}
                        alt={u.giftLabel || 'هدية'}
                        title={u.giftLabel ? `هدية: ${u.giftLabel}` : 'أيقونة هدية'}
                        referrerPolicy="no-referrer"
                        className="h-6 w-auto max-w-[44px] object-contain shrink-0"
                      />
                    ) : u.giftIcon ? (
                      <span
                        title={u.giftLabel ? `هدية: ${u.giftLabel}` : 'أيقونة هدية'}
                        className="text-lg leading-none shrink-0"
                      >
                        {u.giftIcon}
                      </span>
                    ) : null}
                    <span className="font-bold text-xs truncate" style={{ color: u.nameColor }}>
                      {u.username}
                    </span>
                    {u.royalEntry && (
                      <span
                        title="صاحب دخول ملكي"
                        className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-xs bg-amber-100 dark:bg-amber-950/70 border border-amber-400/70 text-amber-800 dark:text-amber-300 text-[9px] font-extrabold shrink-0"
                      >
                        <Crown className="w-2.5 h-2.5 fill-amber-500/40" />
                      </span>
                    )}
                    {u.statusIcon && (
                      <span
                        title={iconTitle}
                        className="inline-flex items-center justify-center px-1 py-0.5 rounded-xs bg-stone-100 dark:bg-zinc-800 border border-stone-200/80 dark:border-zinc-700 text-xs leading-none shrink-0"
                      >
                        {u.statusIcon}
                      </span>
                    )}
                    {(() => {
                      const speakerSlot = isVoiceEnabled
                        ? mics.find((m) => m.userId === u.id)
                        : undefined;
                      if (!speakerSlot) return null;
                      const uSpeaking =
                        !speakerSlot.isMuted &&
                        (u.id === self.id ? isLocalSpeaking : Boolean(speakingUsers[u.id]));
                      return speakerSlot.isMuted ? (
                        <span title="متحدث (مكتوم)" className="shrink-0 inline-flex items-center">
                          <MicOff className="w-3.5 h-3.5 text-red-500" />
                        </span>
                      ) : (
                        <span title={uSpeaking ? 'يتحدث الآن' : 'على المايك'} className="shrink-0 inline-flex items-center">
                          <Mic
                            className={`w-3.5 h-3.5 ${
                              uSpeaking
                                ? 'text-[#44a948] animate-pulse'
                                : 'text-[var(--ych-primary)]'
                            }`}
                          />
                        </span>
                      );
                    })()}
                    {isMe && (
                      <span className="text-[10px] text-stone-400 dark:text-stone-500 shrink-0">
                        (أنت)
                      </span>
                    )}
                    {self.role === 'admin' && u.id.startsWith('demo-member-test') && (
                      <span
                        title={
                          u.demoTalkControlEnabled
                            ? 'وضع التحدث والتحكم مفعّل'
                            : 'صامت — وضع التحدث والتحكم معطّل'
                        }
                        className={`text-[9px] font-bold px-1 py-0.5 rounded-xs shrink-0 ${
                          u.demoTalkControlEnabled
                            ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                            : 'bg-stone-100 dark:bg-zinc-800 text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-zinc-700'
                        }`}
                      >
                        {u.demoTalkControlEnabled ? 'تحدث ✓' : 'صامت'}
                      </span>
                    )}
                    {isIgnored && (
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 shrink-0">
                        متجاهل
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                    <span
                      className={
                        u.role === 'admin'
                          ? 'text-red-600 dark:text-amber-400 font-semibold'
                          : ''
                      }
                    >
                      {getRoleLabel(u.role)}
                    </span>
                    {' · '}
                    <span style={u.statusColor ? { color: u.statusColor } : undefined}>
                      {u.statusText || u.country}
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  const renderRoomsList = () => (
    <div className="flex flex-col h-full">
      <div className="p-3 pl-12 lg:pl-3 bg-[var(--ych-primary)] dark:bg-zinc-900 text-white border-b border-[var(--ych-primary-dark)] dark:border-zinc-800 flex items-center justify-between">
        <h2 className="font-display text-sm font-bold text-white flex items-center gap-1.5">
          <DoorOpen className="w-4 h-4" />
          <span>غرف الشات</span>
        </h2>
        <span className="text-xs font-mono-tabular font-bold text-white/90">
          {rooms.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto chat-scroll p-2 space-y-1">
        {rooms.map((room) => {
          const isActive = !isInSpace && room.id === currentRoomId;
          return (
            <button
              key={room.id}
              type="button"
              onClick={() => {
                onJoinRoom(room.id);
                setActiveTab('chat');
                setMobileDrawer('none');
              }}
              className={`w-full px-2.5 py-2.5 min-h-[54px] rounded-xs text-right transition-colors cursor-pointer flex items-center justify-between gap-2 active:scale-[0.99] ${
                isActive
                  ? 'bg-[var(--ych-primary)] text-white font-semibold shadow-xs'
                  : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-zinc-800/70'
              }`}
            >
              <div className="min-w-0 flex-1 flex items-center gap-2">
                <RoomThumbnail
                  imageUrl={room.imageUrl}
                  name={room.name}
                  size="sm"
                  className="rounded-xs"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs sm:text-sm truncate flex items-center gap-1.5">
                    <span className="truncate">{room.name}</span>
                    {room.isVoiceRoom && (
                      <span
                        title="غرفة صوتية"
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-xs text-[9px] font-bold shrink-0 ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        <Mic className="w-2.5 h-2.5" />
                        <span>صوتية</span>
                      </span>
                    )}
                    {room.hasPassword && <Lock className="w-3 h-3 shrink-0 opacity-85" />}
                  </div>
                  <div
                    className={`text-[11px] truncate mt-0.5 font-normal ${
                      isActive ? 'text-stone-200' : 'text-stone-500 dark:text-stone-400'
                    }`}
                  >
                    {room.description}
                  </div>
                </div>
              </div>
              <span
                className={`text-xs font-mono-tabular shrink-0 ${
                  isActive ? 'bg-[#44a948] text-white px-1.5 py-0.5 rounded-xs font-bold' : 'text-stone-500 dark:text-stone-400'
                }`}
              >
                {room.onlineCount}
              </span>
            </button>
          );
        })}
      </div>

      <div className="p-2.5 border-t border-stone-200 dark:border-zinc-800 space-y-1.5">
        <button
          type="button"
          onClick={openCreateVoiceRoomModal}
          className="w-full py-2.5 px-3 rounded-xs bg-[#44a948] hover:bg-[#3a963e] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Mic className="w-3.5 h-3.5" />
          <span>إنشاء غرفة صوتية</span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (self.isGuest) {
              setSelectedUserModal(null);
              showGuestCreateRoomHint();
              setMobileDrawer('none');
              return;
            }
            setCreateRoomInitialVoiceMode(false);
            setShowCreateRoomModal(true);
            setMobileDrawer('none');
          }}
          className="w-full py-2 px-3 rounded-xs bg-[var(--ych-primary)] hover:bg-[var(--ych-primary-dark)] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>إنشاء غرفة جديدة</span>
        </button>
      </div>
    </div>
  );

  const renderSettingsDrawerContent = () => (
    <SettingsDrawer
      self={self}
      currentRoom={currentRoom}
      canEditTopic={Boolean(canEditTopic)}
      isDark={isDark}
      soundEnabled={soundEnabled}
      fontScale={fontScale}
      voiceServer={voiceServer}
      selectedStyle={selectedStyle}
      styleLocked={Boolean(design.lockUserStyleOverride)}
      hideJoinNotices={hideJoinNotices}
      unreadNotificationsCount={unreadNotificationsCount}
      passwordFeedback={passwordFeedback}
      onClose={() => setMobileDrawer('none')}
      onToggleGhost={self.role === 'admin' ? onAdminToggleGhost : undefined}
      onSaveProfile={onUpdateProfile}
      onChangeFontScale={handleChangeFontScale}
      onChangeVoiceServer={handleChangeVoiceServer}
      onChangeStyle={onChangeStyle}
      onClearLocalScreen={() => {
        setClearedBeforeTs(Date.now());
        setMobileDrawer('none');
      }}
      onOpenAvatarModal={() => {
        setShowProfileModal(true);
        setMobileDrawer('none');
      }}
      onOpenNotifications={openNotificationsCenter}
      onToggleSound={onToggleSound}
      onToggleTheme={onToggleTheme}
      onToggleHideJoinNotices={() => setHideJoinNotices((v) => !v)}
      onOpenGames={() => {
        setShowGamesModal(true);
        setMobileDrawer('none');
      }}
      onOpenAdmin={() => {
        setActiveTab('admin');
        setMobileDrawer('none');
      }}
      onEditRoomTopic={() => {
        if (currentRoom) {
          setTopicInput(currentRoom.topic);
          setIsEditingTopic(true);
        }
        setActiveTab('chat');
        setMobileDrawer('none');
      }}
      onChangePassword={onChangePassword}
      onClearPasswordFeedback={onClearPasswordFeedback}
      onLogout={onLogout}
    />
  );

  return (
    <div
      style={cssVars as React.CSSProperties}
      className="h-[var(--app-height,100dvh)] w-full max-w-full flex flex-col overflow-hidden bg-[#f5f3f2] text-stone-900 dark:bg-zinc-950 dark:text-stone-100"
    >
      {/* Desktop Top Header (hidden on mobile chat view so mobile matches the ultra-clean screenshot!) */}
      <header
        style={{ background: 'var(--ych-header-bg, var(--ych-primary))' }}
        className={`${
          activeTab === 'chat' ? 'hidden lg:flex' : 'flex'
        } h-12 dark:!bg-none dark:bg-zinc-900 text-white border-b border-[var(--ych-primary-dark)] dark:border-zinc-800 px-3 sm:px-5 items-center justify-between gap-3 shrink-0`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {activeTab !== 'chat' && (
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className="lg:hidden px-2.5 py-1 rounded-xs bg-black/20 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>الشات</span>
            </button>
          )}
          <span className="font-display text-base sm:text-lg font-bold text-white whitespace-nowrap shrink-0">
            {siteSettings?.siteTitle || 'عراقية شات'}
          </span>
          {currentRoom && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-stone-200/90 truncate">
              <span>·</span>
              <RoomThumbnail
                imageUrl={currentRoom.imageUrl}
                name={currentRoom.name}
                size="xs"
                className="rounded-xs border-white/30"
              />
              <span className="truncate">{currentRoom.name}</span>
            </span>
          )}
          {isInSpace && (
            <button
              type="button"
              onClick={onResumeFromSpace}
              title="أنت الآن في الفضاء — انقر للعودة واستئناف الرسائل"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs bg-indigo-950/80 border border-indigo-300/40 text-amber-200 text-[11px] font-bold cursor-pointer hover:bg-indigo-900 shrink-0"
            >
              <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
              <span>في الفضاء · عودة</span>
            </button>
          )}
        </div>

        {/* Desktop Quick Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {self.role === 'admin' && self.isGhost && (
            <button
              type="button"
              onClick={() => onAdminToggleGhost(false)}
              title="انقر للخروج من الوضع الشبحي والظهور للجميع"
              className="px-2.5 py-1 rounded-xs bg-zinc-950/80 hover:bg-zinc-900 border border-amber-400/70 text-amber-300 text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <Ghost className="w-3.5 h-3.5" />
              <span>وضع شبحي نشط</span>
            </button>
          )}
          {canAccessAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === 'admin' ? 'chat' : 'admin')}
              className={`px-2.5 py-1 rounded-xs text-xs font-bold flex items-center gap-1 cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-[#44a948] text-white'
                  : 'bg-black/20 hover:bg-black/30 text-amber-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>الإدارة</span>
            </button>
          )}

          <button
            type="button"
            onClick={openCreateVoiceRoomModal}
            title="إنشاء غرفة صوتية مخصصة"
            className="flex items-center gap-1 px-2.5 py-1 rounded-xs bg-[#44a948] hover:bg-[#3a963e] text-xs font-bold text-white cursor-pointer shadow-2xs active:scale-95 transition-transform"
          >
            <Mic className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">غرفة صوتية</span>
            <span className="sm:hidden">+ صوتية</span>
          </button>

          <button
            type="button"
            onClick={() => setYoutubeSearchMode('chat')}
            title="البحث عن أغنية في يوتيوب"
            className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-xs bg-black/20 hover:bg-black/30 text-xs font-semibold text-white cursor-pointer"
          >
            <Youtube className="w-3.5 h-3.5 text-red-300" />
            <span>أغاني يوتيوب</span>
          </button>

          <button
            type="button"
            onClick={() => setShowProfileModal(true)}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xs bg-black/20 hover:bg-black/30 text-xs font-semibold text-white cursor-pointer"
          >
            <UserAvatar avatarUrl={self.avatarUrl} username={self.username} size="xs" className="rounded-xs" />
            <span className="max-w-[90px] truncate">{self.username}</span>
          </button>

          <button
            type="button"
            onClick={openNotificationsCenter}
            aria-label="التنبيهات"
            title="التنبيهات والإشعارات"
            className="relative p-2 rounded-xs bg-black/20 hover:bg-black/30 text-white cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold font-mono-tabular flex items-center justify-center">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onToggleSound}
            aria-label={soundEnabled ? 'كتم الصوت' : 'تفعيل الصوت'}
            className="p-2 rounded-xs bg-black/20 hover:bg-black/30 text-white cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}
            className="p-2 rounded-xs bg-black/20 hover:bg-black/30 text-white cursor-pointer"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => {
              if (isInSpace) {
                onResumeFromSpace();
              } else {
                onExitToSpace();
              }
            }}
            title={isInSpace ? 'العودة من الفضاء إلى الغرفة' : 'الخروج إلى الفضاء'}
            aria-label={isInSpace ? 'العودة من الفضاء إلى الغرفة' : 'الخروج إلى الفضاء'}
            className={`p-2 rounded-xs text-white cursor-pointer ${
              isInSpace
                ? 'bg-indigo-700 hover:bg-indigo-800'
                : 'bg-black/20 hover:bg-red-700'
            }`}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Connection / Ghost / Notice / Announcement Alerts */}
      {self.role === 'admin' && self.isGhost && activeTab === 'chat' && (
        <div className="lg:hidden px-3 py-1 bg-zinc-900 border-b border-amber-500/40 text-amber-300 text-[11px] font-bold flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <Ghost className="w-3.5 h-3.5 shrink-0" />
            <span>وضع شبحي نشط (مخفي)</span>
          </div>
          <button
            type="button"
            onClick={() => onAdminToggleGhost(false)}
            className="px-2 py-0.5 rounded-xs bg-amber-500 text-zinc-950 font-bold cursor-pointer"
          >
            الظهور للجميع
          </button>
        </div>
      )}

      {connectionState !== 'connected' && (
        <div className="px-4 py-1.5 bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 text-center shrink-0">
          {connectionState === 'reconnecting'
            ? 'انقطع الاتصال بالخادم، جاري إعادة الاتصال تلقائياً...'
            : 'جاري الاتصال بغرفة الدردشة...'}
        </div>
      )}

      {noticeBanner && (
        <div
          className={`px-4 py-1.5 border-b text-xs flex items-center justify-between shrink-0 ${
            noticeBanner.tone === 'error'
              ? 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-900 text-red-800 dark:text-red-200'
              : 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200'
          }`}
        >
          <span>{noticeBanner.text}</span>
          <button
            type="button"
            onClick={onClearNotice}
            className="p-1 cursor-pointer"
            aria-label="إغلاق التنبيه"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {guestRoomHint && (
        <div className="px-4 py-1.5 bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 text-center shrink-0">
          إنشاء الغرف الجديدة متاح للأعضاء المسجلين فقط. يمكنك تسجيل عضوية من شاشة الدخول.
        </div>
      )}

      {adminAnnouncement && (
        <div className="px-3 sm:px-4 py-2 bg-[var(--ych-primary)] dark:bg-rose-950 border-b border-[var(--ych-primary-dark)] text-white text-xs sm:text-sm flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Megaphone className="w-4 h-4 text-amber-300 shrink-0" />
            <span className="font-bold text-amber-200 shrink-0">
              إعلان {adminAnnouncement.by}:
            </span>
            <span className="truncate">{adminAnnouncement.text}</span>
          </div>
          <button
            type="button"
            onClick={onDismissAnnouncement}
            aria-label="إغلاق الإعلان"
            className="p-1 text-stone-200 hover:text-white cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {incomingChallenge && (
        <div className="px-3 sm:px-4 py-2 bg-[#44a948] text-white border-b border-emerald-700 text-xs sm:text-sm flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Trophy className="w-4 h-4 text-amber-200 shrink-0" />
            <span className="font-bold truncate">
              دعوة {incomingChallenge.gameType === 'xo' ? 'تحدي X-O' : 'تحدي Ludo'} من{' '}
              {incomingChallenge.challengerName}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onRespondChallenge(incomingChallenge.id, true)}
              className="px-3 py-1 rounded-xs bg-white text-[#2f7d32] font-bold text-xs cursor-pointer"
            >
              قبول
            </button>
            <button
              type="button"
              onClick={() => onRespondChallenge(incomingChallenge.id, false)}
              className="px-2.5 py-1 rounded-xs bg-black/20 text-white font-bold text-xs cursor-pointer"
            >
              رفض
            </button>
          </div>
        </div>
      )}

      {/* Main 3-Pane Body */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Desktop Right Sidebar (Online Users) */}
        <aside className="hidden lg:flex w-68 border-l border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex-col shrink-0">
          {renderOnlineUsersList()}
        </aside>

        {/* Center Viewport */}
        <main className="flex-1 flex flex-col min-w-0 min-h-0 bg-white dark:bg-zinc-950">
          <div className="relative flex-1 flex flex-col min-h-0">
          {activeTab === 'admin' && canAccessAdmin ? (
            <AdminDashboard
              key="tab-admin"
              self={self}
              token={token}
              rooms={rooms}
              adminState={adminState}
              siteSettings={siteSettings}
              onFetchState={onFetchAdminState}
              onUpdateSettings={onUpdateSiteSettings}
              onUpdateDesign={onAdminUpdateDesign}
              onUpdateGifts={onAdminUpdateGifts}
              onUpdateSmileys={onAdminUpdateSmileys}
              onUpdateBanners={onAdminUpdateBanners}
              onToggleGhost={onAdminToggleGhost}
              onUpdateRolePermissions={onAdminUpdateRolePermissions}
              onSetUserPermissions={onAdminSetUserPermissions}
              onSetUserLikes={onAdminSetUserLikes}
              onEditUser={onAdminEditUser}
              onSetRoyalEntry={onAdminSetRoyalEntry}
              onBulkRoyalEntry={onAdminBulkRoyalEntry}
              onBulkMicAction={onAdminBulkMicAction}
              onBroadcast={onAdminBroadcast}
              onModAction={onModAction}
              onSetRole={onAdminSetRole}
              onBanUser={onAdminBanUser}
              onUnbanUser={onAdminUnbanUser}
              onDeleteAccount={onAdminDeleteAccount}
              onMoveUserRoom={onAdminMoveUserRoom}
              onCreateRoom={onCreateRoom}
              onUpdateRoom={onAdminUpdateRoom}
              onDeleteRoom={onAdminDeleteRoom}
              onClearRoom={onAdminClearRoom}
              onClearAllRooms={onAdminClearAllRooms}
              onClearWall={onAdminClearWall}
              onClearAuditLogs={onAdminClearAuditLogs}
              onAddBannedWord={onAdminAddBannedWord}
              onRemoveBannedWord={onAdminRemoveBannedWord}
              onSpawnTestMember={onAdminSpawnTestMember}
              onSetDemoTalkControl={onAdminSetDemoTalkControl}
              onDemoDirectAction={onAdminDemoDirectAction}
              onClearNickHistory={onAdminClearNickHistory}
            />
          ) : activeTab === 'pm' ? (
            <PrivateMessagesPanel
              key="tab-pm"
              self={self}
              onlineUsers={onlineUsers}
              messages={privateMessages}
              activePartnerId={activePmPartnerId}
              unreadByUser={unreadPmByUser}
              customSmileys={siteSettings?.customSmileys}
              userStatsMap={userStatsMap}
              canSendImages={canSendImages}
              onSelectPartner={(uid) => {
                if (uid) onViewUserProfile(uid);
                onSelectPmPartner(uid);
              }}
              onSendPm={onSendPm}
              onToggleLikeUser={onToggleLikeUser}
              onAlertUser={onAlertUser}
              onOpenUserProfile={(user) => setSelectedUserModal(user)}
            />
          ) : (
            <div key="tab-chat" className="relative flex-1 flex flex-col min-h-0">
              {activePmPartnerId && (
                <FloatingPrivateChat
                  self={self}
                  partnerId={activePmPartnerId}
                  onlineUsers={onlineUsers}
                  messages={privateMessages}
                  customSmileys={siteSettings?.customSmileys}
                  userStatsMap={userStatsMap}
                  unreadOthersCount={Object.entries(unreadPmByUser).reduce(
                    (sum, [uid, cnt]) => (uid !== activePmPartnerId ? sum + cnt : sum),
                    0
                  )}
                  canSendImages={canSendImages}
                  isExpanded={pmExpanded}
                  onToggleExpand={() => setPmExpanded((v) => !v)}
                  onClose={() => {
                    onSelectPmPartner('');
                    setPmExpanded(false);
                  }}
                  onOpenList={() => setMobileDrawer('pm')}
                  onSendPm={onSendPm}
                  onToggleLikeUser={onToggleLikeUser}
                  onAlertUser={onAlertUser}
                  onOpenUserProfile={(user) => setSelectedUserModal(user)}
                />
              )}
              {isInSpace && (
                <div className="px-3 py-1.5 bg-gradient-to-l from-indigo-950 via-[#151d42] to-indigo-950 border-b border-indigo-400/40 text-white text-xs flex flex-wrap items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span className="font-bold truncate">
                      أنت الآن في الفضاء — توقفت الرسائل الجديدة والكتابة في {currentRoom?.name || 'الغرفة'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={onResumeFromSpace}
                      className="px-2.5 py-1 rounded-xs bg-[#44a948] hover:bg-[#3a963e] text-white text-[11px] font-bold cursor-pointer active:scale-95"
                    >
                      العودة للغرفة
                    </button>
                  </div>
                </div>
              )}

              {/* Desktop Room Topic Bar + Inline Edit on Mobile when triggered */}
              {currentRoom && (
                <div
                  className={`${
                    isEditingTopic ? 'flex' : 'hidden lg:flex'
                  } px-3 sm:px-4 py-1.5 bg-[#f8f1e7] dark:bg-zinc-900 border-b border-stone-200 dark:border-zinc-800 items-center justify-between gap-2 shrink-0`}
                >
                  {isEditingTopic ? (
                    <form
                      key="topic-edit"
                      onSubmit={(e) => {
                        e.preventDefault();
                        onUpdateTopic(currentRoom.id, topicInput);
                        setIsEditingTopic(false);
                      }}
                      className="flex-1 flex items-center gap-2"
                    >
                      <input
                        type="text"
                        maxLength={140}
                        value={topicInput}
                        onChange={(e) => setTopicInput(e.target.value)}
                        className="flex-1 h-8 px-2.5 rounded-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="p-1.5 rounded-xs bg-[var(--ych-primary)] text-white cursor-pointer"
                        aria-label="حفظ"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingTopic(false)}
                        className="p-1.5 rounded-xs border border-stone-300 dark:border-zinc-700 cursor-pointer"
                        aria-label="إلغاء"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  ) : (
                    <div key="topic-display" className="flex-1 min-w-0 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex items-center gap-2 text-xs">
                        <RoomThumbnail
                          imageUrl={currentRoom.imageUrl}
                          name={currentRoom.name}
                          size="xs"
                          className="rounded-xs"
                        />
                        <span className="font-bold text-[var(--ych-primary)] dark:text-amber-300 shrink-0">
                          {currentRoom.name}
                        </span>
                        <span className="text-stone-400" aria-hidden="true">
                          |
                        </span>
                        <p className="text-stone-700 dark:text-stone-300 truncate">
                          {currentRoom.topic}
                        </p>
                      </div>
                      {canEditTopic && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setRoomImageDraft(currentRoom.imageUrl || '');
                              setShowRoomImageModal(true);
                            }}
                            title="تغيير صورة الغرفة"
                            className="px-2 py-1 rounded-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 hover:bg-stone-50 dark:hover:bg-zinc-800 text-stone-700 dark:text-stone-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                          >
                            <ImagePlus className="w-3 h-3 text-[var(--ych-primary)] dark:text-amber-300" />
                            <span>صورة الغرفة</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMediaUrlInput(currentRoom.media?.url || '');
                              setMediaTitleInput(currentRoom.media?.title || '');
                              setShowMediaModal(true);
                            }}
                            title="راديو / يوتيوب الغرفة"
                            className="px-2 py-1 rounded-xs bg-[var(--ych-primary)] hover:bg-[var(--ych-primary-dark)] text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                          >
                            <Radio className="w-3 h-3" />
                            <span>إذاعة</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowQuizModal(true)}
                            title="مسابقة الغرفة"
                            className="px-2 py-1 rounded-xs bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                          >
                            <HelpCircle className="w-3 h-3" />
                            <span>مسابقة</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTopicInput(currentRoom.topic);
                              setIsEditingTopic(true);
                            }}
                            title="تعديل موضوع الغرفة"
                            aria-label="تعديل موضوع الغرفة"
                            className="p-1 rounded-xs text-stone-500 hover:text-[var(--ych-primary)] dark:hover:text-amber-300 cursor-pointer shrink-0"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Room Media / Radio / YouTube Player Bar */}
              {currentRoom?.media && (
                <div className="bg-[var(--ych-soft)] dark:bg-zinc-900 border-b border-stone-200 dark:border-zinc-800 px-3 py-1.5 shrink-0">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Radio className="w-3.5 h-3.5 text-[var(--ych-primary)] dark:text-amber-300 shrink-0" />
                      <span className="font-bold text-stone-900 dark:text-stone-100 truncate">
                        {currentRoom.media.title}
                      </span>
                      <span className="text-[11px] text-stone-500 dark:text-stone-400 hidden sm:inline shrink-0">
                        · بواسطة {currentRoom.media.addedBy}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setMediaCollapsed((c) => !c)}
                        className="px-2 py-0.5 rounded-xs border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        {mediaCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                        <span>{mediaCollapsed ? 'إظهار' : 'طي'}</span>
                      </button>
                      {canEditTopic && (
                        <button
                          type="button"
                          onClick={() => onClearRoomMedia(currentRoom.id)}
                          title="إيقاف البث"
                          aria-label="إيقاف البث"
                          className="p-1 rounded-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  {!mediaCollapsed && (
                    <div className="mt-1.5">
                      {currentRoom.media.kind === 'youtube' && currentRoom.media.embedId ? (
                        <div className="aspect-video max-h-40 w-full max-w-sm rounded-xs overflow-hidden border border-stone-300 dark:border-zinc-700 bg-black">
                          <iframe
                            src={`https://www.youtube-nocookie.com/embed/${currentRoom.media.embedId}`}
                            title={currentRoom.media.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full border-0"
                          />
                        </div>
                      ) : (
                        <audio
                          controls
                          src={currentRoom.media.url}
                          className="w-full max-w-md h-9"
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Active Room Trivia / Quiz Banner */}
              {activeQuiz && (
                <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/70 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-300 shrink-0" />
                    <div className="min-w-0">
                      <span className="font-bold text-amber-900 dark:text-amber-200">
                        مسابقة الغرفة (+{activeQuiz.rewardLikes} لايك):{' '}
                      </span>
                      <span className="font-semibold text-stone-900 dark:text-stone-100">
                        {activeQuiz.question}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-medium text-amber-800 dark:text-amber-300">
                      اكتب الإجابة في الشات!
                    </span>
                    {canEditTopic && (
                      <button
                        type="button"
                        onClick={() => onStopRoomQuiz(activeQuiz.roomId)}
                        className="px-2 py-0.5 rounded-xs bg-red-600 text-white text-[11px] font-bold cursor-pointer"
                      >
                        إنهاء
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Chat Top Banners */}
              {siteSettings?.banners?.some(
                (b) => b.enabled !== false && b.placement === 'chat_top' && b.imageUrl
              ) && (
                <BannerStrip
                  banners={siteSettings?.banners}
                  placement="chat_top"
                  className="px-2.5 sm:px-4 py-1.5 border-b border-stone-200 dark:border-zinc-800 bg-stone-50/70 dark:bg-zinc-900/50 shrink-0"
                />
              )}

              {/* Main Interface Custom Voice Rooms Quick Launcher & Switcher Bar */}
              <div className="px-2 sm:px-3 py-1.5 bg-zinc-900/95 border-b border-zinc-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                <button
                  type="button"
                  onClick={openCreateVoiceRoomModal}
                  className="px-2.5 py-1 rounded-xs bg-[#44a948] hover:bg-[#3a963e] text-white text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer active:scale-95 transition-transform"
                >
                  <Plus className="w-3 h-3" />
                  <Mic className="w-3 h-3" />
                  <span>إنشاء غرفة صوتية</span>
                </button>
                {customVoiceRooms.length > 0 ? (
                  customVoiceRooms.map((vRoom) => {
                    const isHere = !isInSpace && vRoom.id === currentRoomId;
                    return (
                      <button
                        key={vRoom.id}
                        type="button"
                        onClick={() => onJoinRoom(vRoom.id)}
                        className={`px-2.5 py-1 rounded-xs border text-[11px] font-bold flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors ${
                          isHere
                            ? 'bg-emerald-700/80 border-emerald-400 text-white'
                            : 'bg-zinc-800/90 hover:bg-zinc-700 border-zinc-700 text-stone-200'
                        }`}
                      >
                        <Mic className={`w-3 h-3 ${isHere ? 'text-white' : 'text-emerald-400'}`} />
                        <span className="max-w-[115px] truncate">{vRoom.name}</span>
                        <span className="text-[10px] font-mono-tabular px-1 rounded-xs bg-black/30 text-amber-300">
                          {vRoom.onlineCount}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <span className="text-[11px] text-zinc-400 truncate px-1">
                    أنشئ غرفة صوتية مخصصة للتجمع والتحدث مع الأعضاء بالمايك
                  </span>
                )}
              </div>

              {/* Voice Mic Stage (General Room & Custom Voice Rooms) */}
              {isVoiceEnabled && (Boolean(currentRoom?.isVoiceRoom) || design.showMicStage !== false) && mics.length > 0 && (
                <GeneralMicStage
                  self={self}
                  mics={mics}
                  micRequests={micRequests}
                  speakingUsers={speakingUsers}
                  reactions={micReactions}
                  onlineUsers={onlineUsers}
                  localLevel={localLevel}
                  isLocalSpeaking={isLocalSpeaking}
                  isDeafened={isDeafened}
                  localVideoStream={localVideoStream}
                  remoteStreams={remoteStreams}
                  isVoiceRoom={Boolean(currentRoom?.isVoiceRoom)}
                  roomName={currentRoom?.name}
                  roomCreatorId={currentRoom?.createdBy}
                  onToggleDeafen={() => setIsDeafened((d) => !d)}
                  onJoinMic={onJoinMic}
                  onLeaveMic={onLeaveMic}
                  onToggleSelfMute={onToggleMicMute}
                  onToggleCam={onToggleMicCam}
                  onToggleMicRequest={onToggleMicRequest}
                  onModAction={onMicModAction}
                  onGrantRequest={onGrantMicRequest}
                  onReact={onSendMicReaction}
                  onOpenUserProfile={(user) => setSelectedUserModal(user)}
                />
              )}

              {/* Royal Entry Live Welcome Banner */}
              {royalBanner && royalBanner.roomId === currentRoomId && (
                <div className="mx-2 sm:mx-3 mt-1.5 mb-0.5 px-3 py-2 rounded-md border-2 border-amber-400 bg-gradient-to-l from-amber-950 via-[#4a0b1c] to-amber-950 text-white shadow-lg flex items-center justify-between gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedUserModal(royalBanner.user)}
                    className="flex items-center gap-2.5 min-w-0 text-right cursor-pointer"
                  >
                    <div className="relative shrink-0">
                      <UserAvatar
                        avatarUrl={royalBanner.user.avatarUrl}
                        username={royalBanner.user.username}
                        size="md"
                        className="rounded-full ring-2 ring-amber-400"
                      />
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center shadow">
                        <Crown className="w-3 h-3 fill-amber-950/30" />
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded-xs bg-amber-400 text-amber-950 text-[10px] font-extrabold">
                          دخول ملكي 👑
                        </span>
                        <span className="font-display font-extrabold text-sm text-amber-200 truncate">
                          {royalBanner.user.username}
                        </span>
                      </div>
                      <p className="text-xs text-amber-100/95 font-medium truncate mt-0.5">
                        {royalBanner.royalEntryText || 'شرف الديوان بدخول ملكي مهيب 👑'}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={onDismissRoyalBanner}
                    aria-label="إغلاق إشعار الدخول الملكي"
                    className="p-1 rounded hover:bg-white/15 text-amber-200 hover:text-white shrink-0 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Classic Arab Mobile Chat Message Stream */}
              <div className="relative flex-1 min-h-0">
                {design.chatBgUrl && !chatBgError && (
                  <img
                    src={design.chatBgUrl}
                    alt=""
                    aria-hidden="true"
                    referrerPolicy="no-referrer"
                    onError={() => setChatBgError(true)}
                    style={{
                      opacity: isDark
                        ? Math.min(0.25, (design.chatBgOpacity ?? 12) / 100)
                        : Math.max(0.04, Math.min(0.45, (design.chatBgOpacity ?? 12) / 100)),
                    }}
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none z-0"
                  />
                )}

                <div
                  ref={messagesContainerRef}
                  onScroll={() => {
                    handleScroll();
                    markPublicUiActive();
                  }}
                  onPointerDown={markPublicUiActive}
                  className="relative z-10 h-full overflow-y-auto chat-scroll"
                >
                  {visibleMessages.length === 0 ? (
                    <div
                      key="empty-messages"
                      className="py-16 px-4 text-center text-xs sm:text-sm text-stone-500 dark:text-stone-400"
                    >
                      <span>لا توجد رسائل في هذه الغرفة بعد. ألقِ التحية وابدأ السوالف!</span>
                    </div>
                  ) : (
                    <div
                      key="messages-list"
                      className="divide-y divide-stone-200 dark:divide-zinc-800/80"
                    >
                      {visibleMessages.map((msg, idx) => {
                      const compactTime = formatCompactMinutes(msg.timestamp);
                      const senderOnline = onlineUsers.find((u) => u.id === msg.userId);
                      const densityPad =
                        design.messageDensity === 'compact'
                          ? 'py-[2px]'
                          : design.messageDensity === 'spacious'
                          ? 'py-2'
                          : 'py-[4px]';
                      const hasWallpaper = Boolean(design.chatBgUrl && !chatBgError);

                      if (msg.type === 'system' && msg.systemKind === 'dedication') {
                        return (
                          <div
                            key={msg.id}
                            className="mx-2 sm:mx-4 my-2 px-3 py-2.5 rounded-md border-2 border-amber-400/80 dark:border-amber-700/80 bg-gradient-to-l from-amber-50 via-[#fdf2f4] to-amber-50 dark:from-amber-950/40 dark:via-zinc-900 dark:to-amber-950/30 shadow-xs"
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-800 dark:text-amber-300">
                                <Sparkles className="w-4 h-4 shrink-0" />
                                <span>إهداء عام من {msg.username}</span>
                              </div>
                              <span className="text-[10px] font-mono-tabular text-stone-500 dark:text-stone-400">
                                {compactTime}
                              </span>
                            </div>
                            <p className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 leading-relaxed">
                              {msg.text}
                            </p>
                          </div>
                        );
                      }

                      if (msg.type === 'system' && msg.systemKind === 'join' && msg.isRoyalEntry) {
                        const displayName = senderOnline?.username || msg.username;
                        const displayColor = senderOnline?.nameColor || msg.nameColor || '#B45309';
                        const displayAvatar = senderOnline?.avatarUrl ?? msg.avatarUrl;
                        return (
                          <div
                            key={msg.id}
                            className="mx-2 sm:mx-3.5 my-2 rounded-lg border-2 border-amber-400 dark:border-amber-500/80 bg-gradient-to-l from-amber-50 via-[#fff7e2] to-rose-50 dark:from-amber-950/60 dark:via-zinc-900 dark:to-rose-950/50 px-3 py-2.5 shadow-md"
                          >
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-l from-amber-500 to-yellow-400 text-amber-950 text-[11px] font-extrabold shadow-2xs">
                                <Crown className="w-3.5 h-3.5 fill-amber-950/20" />
                                <span>دخول ملكي مهيب</span>
                              </span>
                              <span className="text-[11px] text-amber-800/75 dark:text-amber-300/80 font-mono-tabular">
                                {compactTime}
                              </span>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <button
                                type="button"
                                onClick={() => {
                                  if (senderOnline) setSelectedUserModal(senderOnline);
                                }}
                                className="relative shrink-0 cursor-pointer"
                                aria-label={displayName}
                              >
                                <UserAvatar
                                  avatarUrl={displayAvatar}
                                  username={displayName}
                                  size="lg"
                                  className="rounded-full ring-2 ring-amber-400 shadow"
                                />
                              </button>
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (senderOnline) setSelectedUserModal(senderOnline);
                                    }}
                                    className="font-display font-extrabold text-sm sm:text-base hover:underline cursor-pointer"
                                    style={{ color: displayColor }}
                                  >
                                    {displayName}
                                  </button>
                                  <span className="text-xs font-bold text-stone-700 dark:text-stone-200">
                                    شرف
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setMobileDrawer('rooms')}
                                    className="inline-flex items-center bg-gradient-to-l from-rose-800 to-amber-700 text-white px-2.5 py-0.5 rounded-sm text-[11px] font-bold cursor-pointer shadow-2xs"
                                  >
                                    <span>{msg.roomLabel || currentRoom?.name}</span>
                                  </button>
                                </div>
                                <p className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200 leading-snug">
                                  {msg.royalEntryText || 'شرف الديوان بدخول ملكي مهيب 👑'}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (
                        msg.type === 'system' &&
                        (msg.systemKind === 'kick' || msg.systemKind === 'ban')
                      ) {
                        const isBanNotice = msg.systemKind === 'ban';
                        const displayName = senderOnline?.username || msg.username;
                        const displayColor = senderOnline?.nameColor || msg.nameColor || '#991b1b';
                        const displayAvatar = senderOnline?.avatarUrl ?? msg.avatarUrl;
                        return (
                          <div
                            key={msg.id}
                            dir="ltr"
                            className={`px-1.5 sm:px-3 ${densityPad} border-r-4 flex items-start gap-2 text-left ${
                              isBanNotice
                                ? 'border-red-600 bg-red-50/90 dark:bg-red-950/35'
                                : 'border-orange-500 bg-orange-50/90 dark:bg-orange-950/30'
                            }`}
                          >
                            <div className="relative shrink-0">
                              <UserAvatar
                                avatarUrl={displayAvatar}
                                username={displayName}
                                size="lg"
                                className={`!w-11 !h-11 sm:!w-12 sm:!h-12 rounded-xs ring-2 ${
                                  isBanNotice ? 'ring-red-500/80' : 'ring-orange-500/80'
                                }`}
                              />
                              <span
                                className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full text-white flex items-center justify-center shadow ${
                                  isBanNotice ? 'bg-red-700' : 'bg-orange-600'
                                }`}
                              >
                                {isBanNotice ? (
                                  <Ban className="w-3 h-3" />
                                ) : (
                                  <UserX className="w-3 h-3" />
                                )}
                              </span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className="font-bold text-[13px] sm:text-sm leading-tight truncate text-left"
                                  style={{ color: displayColor }}
                                >
                                  {displayName}
                                </span>
                                <span dir="rtl" className="text-[10px] text-stone-400 dark:text-stone-500 font-mono-tabular shrink-0">
                                  {compactTime}
                                </span>
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] sm:text-sm text-stone-800 dark:text-stone-100">
                                <span
                                  className={`inline-flex items-center gap-1 text-white px-2 py-[2px] rounded-xs text-[11px] font-extrabold shadow-2xs ${
                                    isBanNotice
                                      ? 'bg-gradient-to-l from-red-700 to-rose-800'
                                      : 'bg-gradient-to-l from-orange-600 to-rose-600'
                                  }`}
                                >
                                  {isBanNotice ? (
                                    <Ban className="w-3 h-3 shrink-0" />
                                  ) : (
                                    <UserX className="w-3 h-3 shrink-0" />
                                  )}
                                  <span>{isBanNotice ? 'شعار حظر' : 'شعار طرد'}</span>
                                </span>
                                <span dir="rtl" className="font-bold">
                                  {msg.noticeLabel ||
                                    (isBanNotice
                                      ? `تم حظر هذا المستخدم من الدردشة${msg.modActorName ? ` بواسطة ${msg.modActorName}` : ''}`
                                      : `تم طرد هذا المستخدم من الغرفة${msg.modActorName ? ` بواسطة ${msg.modActorName}` : ''}`)}
                                </span>
                                {isBanNotice && msg.modReason && (
                                  <span
                                    dir="rtl"
                                    className="inline-flex items-center px-1.5 py-[1px] rounded-xs bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 text-[11px] font-semibold border border-red-200 dark:border-red-800/60"
                                  >
                                    السبب: {msg.modReason}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (
                        msg.type === 'system' &&
                        (msg.systemKind === 'join' || msg.systemKind === 'move' || msg.systemKind === 'leave')
                      ) {
                        const isMoveNotice = msg.systemKind === 'move';
                        const isLeaveNotice = msg.systemKind === 'leave';
                        const noticeText =
                          msg.noticeLabel ||
                          (isMoveNotice
                            ? 'هذا المستخدم قد انتقل إلى'
                            : isLeaveNotice
                            ? 'هذا المستخدم قد غادر'
                            : 'هذا المستخدم قد دخل');
                        const badgeClass = isMoveNotice
                          ? 'bg-amber-600 hover:bg-amber-700'
                          : isLeaveNotice
                          ? 'bg-rose-700 hover:bg-rose-800'
                          : 'bg-[var(--ych-primary)] hover:bg-[var(--ych-primary-dark)]';
                        const displayName = senderOnline?.username || msg.username;
                        const displayColor = senderOnline?.nameColor || msg.nameColor || '#1c1917';
                        const displayAvatar = senderOnline?.avatarUrl ?? msg.avatarUrl;
                        return (
                          <div
                            key={msg.id}
                            dir="ltr"
                            className={`px-1.5 sm:px-3 ${densityPad} bg-white/95 dark:bg-zinc-900/75 flex items-start gap-2 text-left`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                if (senderOnline) setSelectedUserModal(senderOnline);
                              }}
                              className="shrink-0 cursor-pointer"
                              aria-label={displayName}
                            >
                              <UserAvatar
                                avatarUrl={displayAvatar}
                                username={displayName}
                                size="lg"
                                className="!w-11 !h-11 sm:!w-12 sm:!h-12 rounded-xs"
                              />
                            </button>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (senderOnline) setSelectedUserModal(senderOnline);
                                  }}
                                  className="font-bold text-[13px] sm:text-sm leading-tight truncate hover:underline cursor-pointer text-left"
                                  style={{ color: displayColor }}
                                >
                                  {displayName}
                                </button>
                                <span dir="rtl" className="text-[10px] text-stone-400 dark:text-stone-500 font-mono-tabular shrink-0">
                                  {compactTime}
                                </span>
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[13px] sm:text-sm text-stone-800 dark:text-stone-100">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isMoveNotice && msg.moveTargetRoomId) {
                                      onJoinRoom(msg.moveTargetRoomId);
                                    } else {
                                      setMobileDrawer('rooms');
                                    }
                                  }}
                                  className={`inline-flex items-center gap-1 ${badgeClass} text-white px-2 py-[2px] rounded-xs text-[11px] font-bold cursor-pointer shadow-2xs active:scale-95 transition-transform`}
                                >
                                  {isMoveNotice ? (
                                    <ArrowLeftRight className="w-3 h-3 shrink-0" />
                                  ) : isLeaveNotice ? (
                                    <LogOut className="w-3 h-3 shrink-0" />
                                  ) : (
                                    <LogIn className="w-3 h-3 shrink-0" />
                                  )}
                                  <span>{msg.roomLabel || currentRoom?.name}</span>
                                </button>
                                <span dir="rtl" className="font-medium">{noticeText}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (msg.type === 'system') {
                        const sysAvatar = msg.avatarUrl || design.systemAvatarUrl;
                        const sysRowBg = !isDark
                          ? idx % 2 === 0
                            ? design.chatOddRowColor || undefined
                            : design.chatEvenRowColor || undefined
                          : undefined;
                        return (
                          <div
                            key={msg.id}
                            dir="ltr"
                            style={sysRowBg ? { backgroundColor: sysRowBg } : undefined}
                            className={`px-1.5 sm:px-3 ${densityPad} flex items-start gap-2 text-left ${
                              idx % 2 === 0
                                ? hasWallpaper
                                  ? 'bg-white/80 dark:bg-zinc-950/80'
                                  : 'bg-white dark:bg-zinc-950'
                                : hasWallpaper
                                ? 'bg-[#ebeff6]/85 dark:bg-zinc-900/70'
                                : 'bg-[#ebeff6] dark:bg-zinc-900/55'
                            }`}
                          >
                            <div
                              style={{ borderRadius: 'var(--ych-avatar-radius, 0.25rem)' }}
                              className="w-11 h-11 sm:w-12 sm:h-12 overflow-hidden border border-stone-300 dark:border-zinc-700 bg-[#f6e4e7] dark:bg-zinc-800 flex items-center justify-center shrink-0"
                            >
                              {sysAvatar ? (
                                <UserAvatar
                                  avatarUrl={sysAvatar}
                                  username={msg.username}
                                  size="lg"
                                  className="!w-full !h-full border-0 rounded-none"
                                />
                              ) : (
                                <span className="font-display text-[11px] font-extrabold text-[var(--ych-primary)] dark:text-amber-300 text-center leading-tight px-1">
                                  {siteSettings?.siteTitle || 'عراقية شات'}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span dir="rtl" className="font-bold text-[13px] sm:text-sm leading-tight text-[#c81e1e] dark:text-red-400 truncate">
                                  {msg.username === 'النظام'
                                    ? `خدمات الغرفة : ${currentRoom?.name || 'العامة'}`
                                    : msg.username}
                                </span>
                                <span dir="rtl" className="text-[10px] text-stone-400 dark:text-stone-500 font-mono-tabular shrink-0">
                                  {compactTime}
                                </span>
                              </div>
                              <p
                                dir="auto"
                                className="mt-0.5 text-center sm:text-left text-[13px] sm:text-[14px] font-bold text-[#1d4ed8] dark:text-sky-300 leading-snug break-words"
                              >
                                <RichSmileyText
                                  text={msg.text}
                                  smileys={siteSettings?.customSmileys}
                                />
                              </p>
                              {msg.imageUrl && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setZoomedImage({
                                      src: msg.imageUrl!,
                                      alt: msg.username || 'صورة',
                                    })
                                  }
                                  className="mt-1 inline-block rounded-xs cursor-zoom-in"
                                  aria-label="تكبير الصورة"
                                >
                                  <img
                                    src={msg.imageUrl}
                                    alt="هدية"
                                    referrerPolicy="no-referrer"
                                    className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded-xs"
                                  />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      }

                      const isMentioningMe =
                        msg.text.includes(`@${self.username}`) && msg.userId !== self.id;
                      const canDelete =
                        msg.userId === self.id ||
                        hasUserPermission(self, siteSettings, 'canDeleteMessages');
                      const textSizeClass =
                        msg.fontSize === 'sm'
                          ? 'text-xs sm:text-sm'
                          : msg.fontSize === 'lg'
                          ? 'text-[15px] sm:text-[17px]'
                          : 'text-[14px] sm:text-[15px]';

                      const adminRowBg =
                        !isDark && !isMentioningMe
                          ? idx % 2 === 0
                            ? design.chatOddRowColor || undefined
                            : design.chatEvenRowColor || undefined
                          : undefined;

                      const customBg =
                        !isDark && !isMentioningMe
                          ? senderOnline?.bgColor ||
                            (msg.userId === self.id ? self.bgColor : undefined) ||
                            adminRowBg
                          : undefined;

                      return (
                        <div
                          key={msg.id}
                          dir="ltr"
                          style={customBg ? { backgroundColor: customBg } : undefined}
                          className={`group px-1.5 sm:px-3 ${densityPad} flex items-start gap-2 text-left transition-colors ${
                            isMentioningMe
                              ? 'bg-amber-50/90 dark:bg-amber-950/30'
                              : idx % 2 === 0
                              ? hasWallpaper
                                ? 'bg-white/80 dark:bg-zinc-950/80 hover:bg-stone-50/90 dark:hover:bg-zinc-900/75'
                                : 'bg-white dark:bg-zinc-950 hover:bg-stone-50 dark:hover:bg-zinc-900/60'
                              : hasWallpaper
                              ? 'bg-[#ebeff6]/85 dark:bg-zinc-900/70 hover:bg-[#e2e8f4]/90 dark:hover:bg-zinc-900/85'
                              : 'bg-[#ebeff6] dark:bg-zinc-900/55 hover:bg-[#e2e8f4] dark:hover:bg-zinc-900/80'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              if (senderOnline) {
                                setSelectedUserModal(senderOnline);
                              } else {
                                handleMention(msg.username);
                              }
                            }}
                            className="shrink-0 cursor-pointer"
                            aria-label={`ملف ${msg.username}`}
                          >
                            <UserAvatar
                              avatarUrl={senderOnline?.avatarUrl ?? msg.avatarUrl}
                              username={senderOnline?.username || msg.username}
                              size="lg"
                              className="!w-11 !h-11 sm:!w-12 sm:!h-12 rounded-xs"
                            />
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-1 min-w-0">
                                {senderOnline?.giftImageUrl ? (
                                  <img
                                    src={senderOnline.giftImageUrl}
                                    alt={senderOnline.giftLabel || 'هدية'}
                                    title={senderOnline.giftLabel ? `هدية: ${senderOnline.giftLabel}` : 'أيقونة هدية'}
                                    referrerPolicy="no-referrer"
                                    className="h-5 w-auto max-w-[44px] object-contain shrink-0"
                                  />
                                ) : senderOnline?.giftIcon ? (
                                  <span
                                    title={senderOnline.giftLabel ? `هدية: ${senderOnline.giftLabel}` : 'أيقونة هدية'}
                                    className="text-base sm:text-lg leading-none shrink-0"
                                  >
                                    {senderOnline.giftIcon}
                                  </span>
                                ) : null}
                                {senderOnline?.statusIcon && (
                                  <span
                                    title={getStatusIconLabel(senderOnline.statusIcon) || undefined}
                                    className="text-xs leading-none shrink-0"
                                  >
                                    {senderOnline.statusIcon}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (senderOnline) {
                                      setSelectedUserModal(senderOnline);
                                    } else {
                                      handleMention(msg.username);
                                    }
                                  }}
                                  className="font-bold text-[13px] sm:text-sm leading-tight hover:underline cursor-pointer"
                                  style={{ color: senderOnline?.nameColor || msg.nameColor }}
                                >
                                  {senderOnline?.username || msg.username}
                                </button>
                                {(() => {
                                  const senderMic = isVoiceEnabled
                                    ? mics.find((m) => m.userId === msg.userId)
                                    : undefined;
                                  if (!senderMic) return null;
                                  const senderSpeaking =
                                    !senderMic.isMuted &&
                                    (msg.userId === self.id
                                      ? isLocalSpeaking
                                      : Boolean(speakingUsers[msg.userId]));
                                  return senderMic.isMuted ? (
                                    <span title="متحدث على المايك (مكتوم)" className="inline-flex items-center shrink-0">
                                      <MicOff className="w-3.5 h-3.5 text-red-500" />
                                    </span>
                                  ) : (
                                    <span title={senderSpeaking ? 'يتحدث الآن على المايك' : 'متحدث على المايك'} className="inline-flex items-center shrink-0">
                                      <Mic
                                        className={`w-3.5 h-3.5 ${
                                          senderSpeaking
                                            ? 'text-[#44a948] animate-pulse'
                                            : 'text-[var(--ych-primary)]'
                                        }`}
                                      />
                                    </span>
                                  );
                                })()}
                                {(msg.userRole === 'admin' || msg.userRole === 'moderator' || msg.userRole === 'vip') && (
                                  <span dir="rtl" className="text-[10px] font-semibold text-stone-500 dark:text-stone-400">
                                    · {getRoleLabel(msg.userRole)}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {canDelete && (
                                  <button
                                    type="button"
                                    onClick={() => onDeleteMessage(msg.roomId, msg.id)}
                                    title="حذف الرسالة"
                                    aria-label="حذف الرسالة"
                                    className="w-6 h-6 rounded-xs text-stone-400 hover:text-red-600 flex items-center justify-center opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-all active:scale-90 cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                                <span dir="rtl" className="text-[10px] text-stone-400 dark:text-stone-500 font-mono-tabular">
                                  {compactTime}
                                </span>
                              </div>
                            </div>

                            {msg.replyTo && (
                              <div dir="rtl" className="mt-0.5 mb-0.5 px-2 py-0.5 rounded-xs bg-stone-100 dark:bg-zinc-800/80 text-[11px] text-stone-600 dark:text-stone-300 text-left">
                                <span className="font-semibold ml-1 text-[var(--ych-primary)] dark:text-amber-300">
                                  رداً على {msg.replyTo.username}:
                                </span>
                                <span className="truncate">
                                  <RichSmileyText
                                    text={msg.replyTo.text}
                                    smileys={siteSettings?.customSmileys}
                                    imgClassName="w-4 h-4 object-contain inline-block align-middle mx-0.5"
                                  />
                                </span>
                              </div>
                            )}

                            <div className="mt-0.5 flex items-end justify-between gap-1.5">
                              <div className="min-w-0 flex-1">
                                {msg.text && (
                                  <p
                                    dir="auto"
                                    className={`text-left leading-[1.35] whitespace-pre-wrap break-words ${textSizeClass} ${
                                      msg.isBold ? 'font-bold' : 'font-semibold sm:font-normal'
                                    } ${!msg.textColor ? 'text-stone-900 dark:text-stone-100' : ''}`}
                                    style={{
                                      ...(msg.textColor ? { color: msg.textColor } : {}),
                                      ...(fontScale !== 100 ? { fontSize: `${fontScale}%` } : {}),
                                    }}
                                  >
                                    <RichSmileyText
                                      text={msg.text}
                                      smileys={siteSettings?.customSmileys}
                                    />
                                  </p>
                                )}

                                {(() => {
                                  const ytInMsg = msg.text ? extractYouTubeFromText(msg.text) : null;
                                  if (!ytInMsg) return null;
                                  const firstLine = (msg.text || '')
                                    .split('\n')[0]
                                    .replace(/^🎵\s*/, '')
                                    .trim();
                                  const displayTitle =
                                    firstLine && !firstLine.startsWith('http')
                                      ? firstLine.slice(0, 60)
                                      : 'أغنية يوتيوب';
                                  const isExpanded = Boolean(expandedChatYoutubeIds[msg.id]);
                                  return (
                                    <div className="mt-1.5 space-y-1.5">
                                      {!isExpanded ? (
                                        <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-red-200 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/35">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setExpandedChatYoutubeIds((prev) => ({
                                                ...prev,
                                                [msg.id]: true,
                                              }))
                                            }
                                            className="flex items-center gap-1.5 text-xs font-bold text-red-700 dark:text-red-300 hover:underline cursor-pointer"
                                          >
                                            <Youtube className="w-4 h-4 text-red-600 shrink-0" />
                                            <span>{displayTitle || 'تشغيل الفيديو'}</span>
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="space-y-1 max-w-sm">
                                          <div className="aspect-video w-full rounded-xs overflow-hidden border border-stone-300 dark:border-zinc-700 bg-black">
                                            <iframe
                                              src={`https://www.youtube-nocookie.com/embed/${ytInMsg.videoId}?autoplay=1&playsinline=1&rel=0`}
                                              title={displayTitle}
                                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                              allowFullScreen
                                              className="w-full h-full border-0"
                                            />
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setExpandedChatYoutubeIds((prev) => ({
                                                ...prev,
                                                [msg.id]: false,
                                              }))
                                            }
                                            className="h-6 px-2 rounded-xs border border-stone-300 dark:border-zinc-700 bg-stone-100 dark:bg-zinc-800 text-[10px] font-bold text-stone-600 dark:text-stone-300 cursor-pointer"
                                          >
                                            إيقاف وإخفاء الفيديو
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}

                                {msg.imageUrl && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setZoomedImage({
                                        src: msg.imageUrl!,
                                        alt: `صورة من ${msg.username}`,
                                      })
                                    }
                                    className="group/img relative mt-1.5 rounded-xs overflow-hidden border border-stone-200 dark:border-zinc-700 block w-full max-w-[min(100%,26rem)] sm:max-w-md cursor-zoom-in active:scale-[0.99] transition-transform"
                                    aria-label={`تكبير صورة ${msg.username}`}
                                  >
                                    <img
                                      src={msg.imageUrl}
                                      alt={`صورة مرسلة من ${msg.username}`}
                                      referrerPolicy="no-referrer"
                                      className="max-h-80 sm:max-h-96 w-full object-contain"
                                    />
                                    <span className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-85 sm:opacity-0 sm:group-hover/img:opacity-100 transition-opacity pointer-events-none">
                                      <ZoomIn className="w-3.5 h-3.5" />
                                    </span>
                                  </button>
                                )}

                                {msg.audioUrl && (
                                  <div className="mt-1.5 flex items-center gap-2 max-w-xs">
                                    <audio
                                      controls
                                      preload="metadata"
                                      src={msg.audioUrl}
                                      className="h-9 max-w-full"
                                    />
                                    {msg.audioDuration && (
                                      <span className="text-[11px] font-mono-tabular text-stone-500 dark:text-stone-400 shrink-0">
                                        {msg.audioDuration}ث
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Always-visible Teal Reply Button matching reference screenshot */}
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyTo({
                                    id: msg.id,
                                    username: msg.username,
                                    text: msg.text || 'صورة مرفقة',
                                  });
                                  composerInputRef.current?.focus();
                                }}
                                title="رد / اقتباس"
                                aria-label="رد على الرسالة"
                                className="w-6 h-6 rounded-xs bg-[#0d828d] hover:bg-[#0a6a73] text-white flex items-center justify-center shrink-0 shadow-2xs cursor-pointer transition-all active:scale-90"
                              >
                                <Reply className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {hasNewUnread && (
                  <button
                    type="button"
                    onClick={scrollToBottom}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full bg-[var(--ych-primary)] text-white text-xs font-semibold shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                    <span>رسائل جديدة</span>
                  </button>
                )}
              </div>

              {/* Typing / Reply / Image / Audio Preview Strips above Composer */}
              {(typingNames.length > 0 ||
                replyTo ||
                pendingImage ||
                pendingAudio ||
                isRecordingNote ||
                self.isMuted) && (
                <div className="px-3 py-1.5 bg-stone-50 dark:bg-zinc-900 border-t border-stone-200 dark:border-zinc-800 space-y-1.5 shrink-0">
                  {typingNames.length > 0 && (
                    <div className="text-[11px] text-[var(--ych-primary)] dark:text-amber-300 font-medium">
                      {typingNames.slice(0, 3).join('، ')} يكتب الآن...
                    </div>
                  )}

                  {self.isMuted && (
                    <div className="text-xs text-amber-700 dark:text-amber-400 font-semibold">
                      تم كتمك من الكتابة في الغرفة العامة من قبل الإدارة.
                    </div>
                  )}

                  {!self.isMuted && isLikesRestrictedForChat && (
                    <div className="px-2.5 py-1.5 rounded-xs bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-600 shrink-0" />
                        <span>
                          التحدث في الدردشة العامة يتطلب{' '}
                          <span className="font-mono-tabular">{formatCompactMetric(minLikesToChat)}</span> لايك على الأقل
                        </span>
                      </span>
                      <span className="text-[11px] font-mono-tabular font-semibold text-rose-600 dark:text-rose-400">
                        لايكاتك: {formatCompactMetric(selfLikesCount)} / {formatCompactMetric(minLikesToChat)}
                      </span>
                    </div>
                  )}

                  {isRecordingNote && (
                    <div className="px-2.5 py-1.5 rounded-xs bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-900 flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-red-700 dark:text-red-300 font-mono-tabular">
                        جاري تسجيل رسالة صوتية... {recordSeconds}ث / 20ث
                      </span>
                      <button
                        type="button"
                        onClick={stopVoiceNoteRecording}
                        className="px-2.5 py-1 rounded-xs bg-red-600 text-white font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Square className="w-3 h-3 fill-current" />
                        <span>إيقاف</span>
                      </button>
                    </div>
                  )}

                  {replyTo && (
                    <div className="px-2.5 py-1 rounded-xs bg-white dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 flex items-center justify-between gap-2 text-xs">
                      <div className="truncate text-stone-700 dark:text-stone-300">
                        <span className="font-semibold ml-1 text-[var(--ych-primary)] dark:text-amber-300">
                          رد على {replyTo.username}:
                        </span>
                        <span>{replyTo.text}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReplyTo(undefined)}
                        aria-label="إلغاء الرد"
                        className="text-stone-400 hover:text-stone-700 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {pendingImage && (
                    <div className="relative inline-block rounded-xs overflow-hidden border border-stone-300 dark:border-zinc-700">
                      <img src={pendingImage} alt="معاينة الصورة" className="h-24 max-w-[200px] object-contain" />
                      <button
                        type="button"
                        onClick={() => setPendingImage(undefined)}
                        aria-label="حذف الصورة"
                        className="absolute top-1 left-1 p-0.5 rounded-full bg-stone-900/80 text-white cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {pendingAudio && (
                    <div className="px-2.5 py-1.5 rounded-xs bg-white dark:bg-zinc-800 border border-stone-300 dark:border-zinc-700 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <audio controls src={pendingAudio.url} className="h-8 max-w-[220px]" />
                        <span className="text-[11px] font-mono-tabular text-stone-500">
                          {pendingAudio.duration}ث
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPendingAudio(undefined)}
                        aria-label="حذف الرسالة الصوتية"
                        className="text-stone-400 hover:text-red-600 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Row 1: Classic Arab Chat Composer Strip ([LogOut] [Share2/Options] [Smiley] [أكتب رسالتك هنا] [إرسال ✈]) */}
              <div className="relative bg-[#ededed] dark:bg-zinc-900 border-t border-stone-300 dark:border-zinc-800 px-1 py-1 shrink-0">
                {/* Formatting Popover (Opened by Share2/Options button) */}
                {!isInSpace && showFormatTray && (
                  <div className="mb-1.5 p-2.5 rounded-sm bg-white dark:bg-zinc-950 border border-stone-300 dark:border-zinc-700 flex flex-wrap items-center gap-2 shadow-sm max-h-[40dvh] overflow-y-auto chat-scroll">
                    <div className="flex items-center flex-wrap gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-stone-500 ml-1" />
                      {TEXT_COLORS.map((c) => (
                        <button
                          key={c.label}
                          type="button"
                          title={c.label}
                          onClick={() => setTextColor(c.value)}
                          className={`w-8 h-8 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center text-[10px] cursor-pointer active:scale-90 transition-transform ${
                            textColor === c.value
                              ? 'border-stone-900 dark:border-white scale-110'
                              : 'border-stone-300 dark:border-zinc-700'
                          }`}
                          style={{
                            backgroundColor: c.value || (isDark ? '#27272a' : '#fafaf9'),
                          }}
                        >
                          {!c.value && 'ت'}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsBold((b) => !b)}
                      className={`h-9 sm:h-8 px-2.5 rounded-xs border text-xs font-bold flex items-center gap-1 cursor-pointer active:scale-95 transition-transform ${
                        isBold
                          ? 'border-[var(--ych-primary)] bg-[var(--ych-primary)] text-white'
                          : 'border-stone-300 dark:border-zinc-700 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      <Bold className="w-3.5 h-3.5" />
                      <span>عريض</span>
                    </button>

                    <button
                      type="button"
                      onClick={cycleFontSize}
                      className="h-9 sm:h-8 px-2.5 rounded-xs border border-stone-300 dark:border-zinc-700 text-xs font-semibold text-stone-700 dark:text-stone-300 cursor-pointer active:scale-95 transition-transform"
                    >
                      <span>
                        الحجم: {fontSize === 'sm' ? 'صغير' : fontSize === 'lg' ? 'كبير' : 'عادي'}
                      </span>
                    </button>

                    {canSendImages && (
                      <>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/gif,image/png,image/jpeg,image/webp,image/*"
                          onChange={handleAttachImage}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="h-9 sm:h-8 px-2.5 rounded-xs bg-[var(--ych-primary)] hover:bg-[var(--ych-primary-dark)] text-white text-xs font-bold flex items-center gap-1 cursor-pointer active:scale-95 transition-transform"
                        >
                          <ImagePlus className="w-3.5 h-3.5" />
                          <span>صورة / GIF</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <input
                            type="url"
                            dir="ltr"
                            value={imageUrlInput}
                            onChange={(e) => setImageUrlInput(e.target.value)}
                            placeholder="رابط GIF / صورة..."
                            className="w-36 sm:w-44 h-9 sm:h-8 px-2.5 rounded-xs border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-900 text-xs"
                          />
                          <button
                            type="button"
                            disabled={!imageUrlInput.trim()}
                            onClick={() => {
                              const clean = sanitizeExternalImageUrl(imageUrlInput);
                              if (!clean) {
                                onMicError('يرجى إدخال رابط صورة أو GIF يبدأ بـ https://');
                                return;
                              }
                              setPendingImage(clean);
                              setImageUrlInput('');
                              setShowFormatTray(false);
                            }}
                            className="h-9 sm:h-8 px-3 rounded-xs bg-stone-700 hover:bg-stone-800 text-white text-xs font-bold disabled:opacity-45 cursor-pointer active:scale-95 transition-transform"
                          >
                            إرفاق
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setShowDoodleModal(true);
                            setShowFormatTray(false);
                          }}
                          className="h-9 sm:h-8 px-2.5 rounded-xs bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold flex items-center gap-1 cursor-pointer active:scale-95 transition-transform"
                        >
                          <Paintbrush className="w-3.5 h-3.5" />
                          <span>لوحة الرسم</span>
                        </button>
                      </>
                    )}

                    {canSendVoiceNotes && (
                      <button
                        type="button"
                        onClick={() => {
                          if (isRecordingNote) {
                            stopVoiceNoteRecording();
                          } else {
                            startVoiceNoteRecording();
                          }
                        }}
                        className={`h-9 sm:h-8 px-2.5 rounded-xs text-white text-xs font-bold flex items-center gap-1 cursor-pointer active:scale-95 transition-transform ${
                          isRecordingNote
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-[#44a948] hover:bg-[#3a963e]'
                        }`}
                      >
                        {isRecordingNote ? (
                          <>
                            <Square className="w-3 h-3 fill-current" />
                            <span>إيقاف التسجيل</span>
                          </>
                        ) : (
                          <>
                            <Mic className="w-3.5 h-3.5" />
                            <span>رسالة صوتية</span>
                          </>
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setShowDedicationModal(true);
                        setShowFormatTray(false);
                      }}
                      className="h-9 sm:h-8 px-2.5 rounded-xs bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer active:scale-95 transition-transform"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>إهداء عام</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setYoutubeSearchMode('chat');
                        setShowFormatTray(false);
                      }}
                      className="h-9 sm:h-8 px-2.5 rounded-xs bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer active:scale-95 transition-transform"
                    >
                      <Music className="w-3.5 h-3.5" />
                      <span>أغنية يوتيوب</span>
                    </button>

                    {canEditTopic && currentRoom && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setMediaUrlInput(currentRoom.media?.url || '');
                            setMediaTitleInput(currentRoom.media?.title || '');
                            setShowMediaModal(true);
                            setShowFormatTray(false);
                          }}
                          className="lg:hidden h-9 px-2.5 rounded-xs bg-[var(--ych-primary-dark)] text-white text-xs font-bold flex items-center gap-1 cursor-pointer active:scale-95 transition-transform"
                        >
                          <Radio className="w-3.5 h-3.5" />
                          <span>إذاعة</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowQuizModal(true);
                            setShowFormatTray(false);
                          }}
                          className="lg:hidden h-9 px-2.5 rounded-xs bg-rose-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer active:scale-95 transition-transform"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>مسابقة</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRoomImageDraft(currentRoom.imageUrl || '');
                            setShowRoomImageModal(true);
                            setShowFormatTray(false);
                          }}
                          className="lg:hidden h-9 px-2.5 rounded-xs bg-zinc-800 text-white text-xs font-bold flex items-center gap-1 cursor-pointer active:scale-95 transition-transform"
                        >
                          <ImagePlus className="w-3.5 h-3.5" />
                          <span>صورة الغرفة</span>
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Emoji & Custom Smileys Picker Popover */}
                {!isInSpace && showEmojiPicker && (
                  <div className="absolute bottom-14 left-2 right-2 sm:right-auto sm:w-80 max-h-[42dvh] overflow-y-auto chat-scroll z-30 bg-white dark:bg-zinc-900 border border-stone-300 dark:border-zinc-700 rounded-md shadow-xl p-3 space-y-2.5">
                    {(siteSettings?.customSmileys?.length || 0) > 0 && (
                      <div>
                        <div className="text-[11px] font-bold text-[var(--ych-primary)] dark:text-amber-300 mb-1.5 flex items-center justify-between">
                          <span>سمايلات الموقع</span>
                          <span className="font-mono-tabular text-[10px] text-stone-400">
                            {siteSettings!.customSmileys!.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-6 sm:grid-cols-7 gap-1.5">
                          {siteSettings!.customSmileys!.map((sm) => (
                            <button
                              key={sm.id}
                              type="button"
                              title={`${sm.label} (${sm.code})`}
                              onClick={() =>
                                setDraft((prev) => `${prev}${prev && !prev.endsWith(' ') ? ' ' : ''}${sm.code} `)
                              }
                              className="h-10 sm:h-9 rounded hover:bg-amber-50 dark:hover:bg-zinc-800 border border-stone-200/70 dark:border-zinc-800 flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
                            >
                              <img
                                src={sm.imageUrl}
                                alt={sm.label}
                                referrerPolicy="no-referrer"
                                className="w-6 h-6 object-contain"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {EMOJI_GROUPS.map((grp) => (
                      <div key={grp.title}>
                        <div className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 mb-1">
                          {grp.title}
                        </div>
                        <div className="grid grid-cols-7 sm:grid-cols-8 gap-1">
                          {grp.items.map((em) => (
                            <button
                              key={em}
                              type="button"
                              onClick={() => setDraft((prev) => `${prev}${em}`)}
                              className="h-10 sm:h-8 rounded hover:bg-stone-100 dark:hover:bg-zinc-800 text-lg sm:text-base flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
                            >
                              {em}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <form dir="ltr" onSubmit={submitChatMessage} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (isInSpace) {
                        onResumeFromSpace();
                      } else {
                        onExitToSpace();
                      }
                    }}
                    title={isInSpace ? 'العودة من الفضاء' : 'الخروج إلى الفضاء'}
                    aria-label={isInSpace ? 'العودة من الفضاء' : 'الخروج إلى الفضاء'}
                    className={`w-8 h-[34px] sm:w-9 sm:h-9 rounded-md text-white flex items-center justify-center shrink-0 cursor-pointer transition-all active:scale-95 shadow-2xs ${
                      isInSpace
                        ? 'bg-indigo-700 hover:bg-indigo-800'
                        : 'bg-[var(--ych-primary)] hover:bg-red-700'
                    }`}
                  >
                    <LogOut className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    disabled={isInSpace}
                    onClick={() => {
                      if (isInSpace) return;
                      setShowFormatTray((v) => !v);
                      setShowEmojiPicker(false);
                    }}
                    title={isInSpace ? 'متوقف في الفضاء' : 'تنسيق الخط وإرفاق وسائط'}
                    aria-label="تنسيق الخط وإرفاق وسائط"
                    className={`w-8 h-[34px] sm:w-9 sm:h-9 rounded-md flex items-center justify-center shrink-0 transition-all shadow-2xs ${
                      isInSpace
                        ? 'bg-stone-400 dark:bg-zinc-700 text-stone-200 opacity-50 cursor-not-allowed'
                        : showFormatTray
                        ? 'bg-[var(--ych-primary-dark)] text-amber-200 cursor-pointer active:scale-95'
                        : 'bg-[var(--ych-primary)] hover:bg-[var(--ych-primary-dark)] text-white cursor-pointer active:scale-95'
                    }`}
                  >
                    <Share2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    disabled={isInSpace}
                    onClick={() => {
                      if (isInSpace) return;
                      setShowEmojiPicker((v) => !v);
                      setShowFormatTray(false);
                    }}
                    title={isInSpace ? 'متوقف في الفضاء' : 'الرموز التعبيرية والسمايلات'}
                    aria-label="الرموز التعبيرية والسمايلات"
                    className={`w-8 h-[34px] sm:w-9 sm:h-9 rounded-md flex items-center justify-center shrink-0 transition-transform ${
                      isInSpace
                        ? 'opacity-40 cursor-not-allowed grayscale'
                        : 'cursor-pointer hover:bg-stone-200/70 dark:hover:bg-zinc-800 active:scale-95'
                    }`}
                  >
                    <span className="w-7 h-7 rounded-full bg-[#ffe033] border-[1.5px] border-[#574100] flex items-center justify-center shadow-2xs">
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" aria-hidden="true">
                        <path
                          d="M7.5 9.5C7.8 8.3 9.2 8.3 9.5 9.5"
                          stroke="#1f1600"
                          strokeWidth="1.9"
                          strokeLinecap="round"
                        />
                        <path
                          d="M14.5 9.5C14.8 8.3 16.2 8.3 16.5 9.5"
                          stroke="#1f1600"
                          strokeWidth="1.9"
                          strokeLinecap="round"
                        />
                        <path
                          d="M7.5 13.8C8.8 16.4 15.2 16.4 16.5 13.8"
                          stroke="#1f1600"
                          strokeWidth="1.9"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                  </button>

                  <input
                    ref={composerInputRef}
                    type="text"
                    dir="auto"
                    maxLength={600}
                    disabled={isChatComposerDisabled}
                    value={isInSpace ? '' : draft}
                    onFocus={handleComposerFocus}
                    onChange={(e) => handleDraftChange(e.target.value)}
                    placeholder={
                      isInSpace
                        ? 'الكتابة وإرسال الرسائل متوقف في الفضاء'
                        : self.isMuted
                        ? 'أنت مكتوم حالياً...'
                        : isLikesRestrictedForChat
                        ? `التحدث في العام يتطلب ${minLikesToChat} لايك (رصيدك: ${selfLikesCount})`
                        : 'أكتب رسالتك هنا'
                    }
                    className={`flex-1 min-w-0 h-[34px] sm:h-9 px-2.5 rounded-md border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-base lg:text-sm leading-none text-right focus:outline-none focus:ring-1 focus:ring-[var(--ych-primary)] disabled:bg-stone-200 dark:disabled:bg-zinc-800 disabled:text-stone-400 dark:disabled:text-zinc-500 disabled:opacity-75 disabled:cursor-not-allowed ${
                      isBold ? 'font-bold' : ''
                    }`}
                    style={textColor ? { color: textColor } : undefined}
                  />

                  <button
                    type="submit"
                    disabled={isChatComposerDisabled || (!draft.trim() && !pendingImage && !pendingAudio)}
                    className={`h-[34px] sm:h-9 px-2.5 sm:px-3 rounded-md text-xs sm:text-sm font-bold flex items-center gap-1 shrink-0 transition-transform shadow-2xs ${
                      isInSpace
                        ? 'bg-stone-400 dark:bg-zinc-700 text-stone-200 dark:text-zinc-400 opacity-60 cursor-not-allowed'
                        : 'bg-[var(--ych-primary)] hover:bg-[var(--ych-primary-dark)] text-white disabled:opacity-65 cursor-pointer active:scale-95 disabled:cursor-not-allowed'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>إرسال</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Persistent Social Wall Drawer (stays mounted off-viewport without opacity-0 so Wall YouTube keeps playing when exited) */}
          {hasOpenedWall && (
            <div
              className={
                mobileDrawer === 'wall'
                  ? 'absolute inset-0 z-40 flex'
                  : 'fixed -left-[200vw] top-0 w-[340px] h-[500px] pointer-events-none overflow-hidden'
              }
              aria-hidden={mobileDrawer !== 'wall'}
            >
              {mobileDrawer === 'wall' && (
                <div
                  className="absolute inset-0 bg-stone-950/25"
                  onClick={() => setMobileDrawer('none')}
                />
              )}
              <div
                onTouchStart={handleDrawerTouchStart}
                onTouchEnd={(e) => handleDrawerTouchEnd('right', e)}
                className={`relative z-10 h-full w-[78%] sm:w-[400px] max-w-[88vw] ml-auto border-l border-stone-400/70 dark:border-zinc-700 bg-white dark:bg-zinc-950 shadow-2xl flex flex-col ${
                  mobileDrawer === 'wall' ? 'animate-drawer-right' : ''
                }`}
              >
                <SocialWall
                  self={self}
                  token={token}
                  posts={wallPosts}
                  topStars={topStars}
                  onlineUsers={onlineUsers}
                  siteSettings={siteSettings}
                  onCreatePost={onCreateWallPost}
                  onToggleLike={onLikeWallPost}
                  onAddComment={onCommentWallPost}
                  onDeletePost={onDeleteWallPost}
                  onOpenUserProfileById={(userId) => {
                    const target = onlineUsers.find((u) => u.id === userId);
                    if (target) setSelectedUserModal(target);
                  }}
                  onClose={() => setMobileDrawer('none')}
                />
              </div>
            </div>
          )}
          </div>

          {/* Row 2: Crimson 6-Button Bottom Dock ([👤 11] [خاص] [الغرف] [الحائط] [الضبط] [★]) */}
          <nav
            dir="ltr"
            aria-label="التنقل الرئيسي للدردشة"
            className="bg-[var(--ych-primary-dark)] dark:bg-zinc-950 border-t border-black/30 dark:border-zinc-800 px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] flex items-center gap-1 shrink-0"
          >
            <button
              type="button"
              onClick={() => {
                if (activeTab !== 'chat') {
                  setActiveTab('chat');
                }
                setMobileDrawer((cur) => (cur === 'users' ? 'none' : 'users'));
              }}
              className={`h-8 sm:h-9 px-2.5 rounded-xs border text-[11px] sm:text-xs font-bold text-white flex items-center justify-center gap-1 font-mono-tabular transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0 ${
                mobileDrawer === 'users'
                  ? 'bg-[#44a948] border-emerald-300/60'
                  : 'bg-[var(--ych-primary)] hover:bg-black/25 border-white/25'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5 shrink-0" />
              <span>{totalOnlineCount}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (activeTab !== 'chat') {
                  setActiveTab('chat');
                }
                setMobileDrawer((cur) => (cur === 'pm' ? 'none' : 'pm'));
              }}
              className={`flex-1 min-w-0 h-8 sm:h-9 px-1 rounded-xs border text-[11px] sm:text-xs font-bold text-white flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer whitespace-nowrap relative ${
                mobileDrawer === 'pm' || Boolean(activePmPartnerId)
                  ? 'bg-[#44a948] border-emerald-300/60'
                  : 'bg-[var(--ych-primary)] hover:bg-black/25 border-white/25'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5 shrink-0" />
              <span>خاص</span>
              {totalUnreadPm > 0 && (
                <span className="px-1 rounded-xs bg-red-600 text-white font-mono-tabular text-[10px]">
                  {totalUnreadPm}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                if (activeTab !== 'chat') {
                  setActiveTab('chat');
                }
                setMobileDrawer((cur) => (cur === 'rooms' ? 'none' : 'rooms'));
              }}
              className={`flex-1 min-w-0 h-8 sm:h-9 px-1 rounded-xs border text-[11px] sm:text-xs font-bold text-white flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer whitespace-nowrap ${
                mobileDrawer === 'rooms'
                  ? 'bg-[#44a948] border-emerald-300/60'
                  : 'bg-[var(--ych-primary)] hover:bg-black/25 border-white/25'
              }`}
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span>الغرف</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setMobileDrawer((cur) => (cur === 'wall' ? 'none' : 'wall'))
              }
              className={`flex-1 min-w-0 h-8 sm:h-9 px-1 rounded-xs border text-[11px] sm:text-xs font-bold text-white flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer whitespace-nowrap ${
                mobileDrawer === 'wall'
                  ? 'bg-[#44a948] border-emerald-300/60'
                  : 'bg-[var(--ych-primary)] hover:bg-black/25 border-white/25'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span>الحائط</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setMobileDrawer((cur) => (cur === 'settings' ? 'none' : 'settings'))
              }
              className={`relative flex-1 min-w-0 h-8 sm:h-9 px-1 rounded-xs border text-[11px] sm:text-xs font-bold text-white flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer whitespace-nowrap ${
                mobileDrawer === 'settings'
                  ? 'bg-[#44a948] border-emerald-300/60'
                  : 'bg-[var(--ych-primary)] hover:bg-black/25 border-white/25'
              }`}
            >
              <Settings className="w-3.5 h-3.5 shrink-0" />
              <span>الضبط</span>
            </button>

            <button
              type="button"
              onClick={openNotificationsCenter}
              title="التنبيهات والإشعارات"
              aria-label="التنبيهات والإشعارات"
              className="relative w-9 h-8 sm:w-10 sm:h-9 rounded-xs border border-white/25 bg-[var(--ych-primary)] hover:bg-black/25 text-white flex items-center justify-center shrink-0 cursor-pointer transition-all active:scale-95"
            >
              <Star className="w-4 h-4 fill-current" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-600 border border-white text-white font-mono-tabular text-[9px] font-bold flex items-center justify-center">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </button>
          </nav>
        </main>

        {/* Desktop Left Sidebar (Rooms List) */}
        <aside className="hidden lg:flex w-64 border-r border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex-col shrink-0">
          {renderRoomsList()}
        </aside>

        {/* Slide-over Drawers (Online Users, Rooms, Settings) */}
        {mobileDrawer !== 'none' && mobileDrawer !== 'wall' && (
          <div className="fixed inset-0 z-40 flex">
            <div
              className="fixed inset-0 bg-stone-950/50"
              onClick={() => setMobileDrawer('none')}
            />
            <div
              onTouchStart={handleDrawerTouchStart}
              onTouchEnd={(e) =>
                handleDrawerTouchEnd(mobileDrawer === 'rooms' ? 'left' : 'right', e)
              }
              className={`relative z-40 h-full bg-white dark:bg-zinc-900 border-stone-200 dark:border-zinc-800 shadow-2xl ${
                mobileDrawer === 'users' || mobileDrawer === 'settings' || mobileDrawer === 'pm'
                  ? 'w-72 sm:w-80 max-w-[85vw] ml-auto border-l animate-drawer-right'
                  : 'w-72 sm:w-80 max-w-[85vw] mr-auto border-r animate-drawer-left'
              }`}
            >
              {mobileDrawer !== 'settings' && (
                <button
                  type="button"
                  onClick={() => setMobileDrawer('none')}
                  aria-label="إغلاق القائمة"
                  className="absolute top-2 left-2 z-10 w-9 h-9 rounded-sm bg-black/25 hover:bg-black/40 text-white flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              )}
              <div key={mobileDrawer} className="h-full flex flex-col">
                {mobileDrawer === 'users' ? (
                  renderOnlineUsersList()
                ) : mobileDrawer === 'rooms' ? (
                  renderRoomsList()
                ) : mobileDrawer === 'pm' ? (
                  <PrivateMessagesPanel
                    listOnly
                    self={self}
                    onlineUsers={onlineUsers}
                    messages={privateMessages}
                    activePartnerId={activePmPartnerId}
                    unreadByUser={unreadPmByUser}
                    customSmileys={siteSettings?.customSmileys}
                    userStatsMap={userStatsMap}
                    canSendImages={canSendImages}
                    onSelectPartner={(uid) => {
                      if (uid) {
                        onViewUserProfile(uid);
                        onSelectPmPartner(uid);
                        setActiveTab('chat');
                        setMobileDrawer('none');
                        setPmExpanded(false);
                      } else {
                        onSelectPmPartner('');
                      }
                    }}
                    onSendPm={onSendPm}
                    onToggleLikeUser={onToggleLikeUser}
                    onAlertUser={onAlertUser}
                    onOpenUserProfile={(user) => setSelectedUserModal(user)}
                  />
                ) : (
                  renderSettingsDrawerContent()
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showProfileModal && (
        <ProfileModal
          user={self}
          onClose={() => setShowProfileModal(false)}
          onSave={onUpdateProfile}
        />
      )}

      {selectedUserModal && (
        <UserProfileModal
          target={onlineUsers.find((u) => u.id === selectedUserModal.id) || selectedUserModal}
          self={self}
          selfLikes={userStatsMap[self.id]?.likesCount ?? 50}
          stats={userStatsMap[selectedUserModal.id]}
          siteSettings={siteSettings}
          rooms={rooms}
          currentRoomId={currentRoomId}
          targetMicSlot={
            currentRoomId === 'general'
              ? mics.find((m) => m.userId === selectedUserModal.id)
              : undefined
          }
          isIgnored={ignoredUserIds.includes(selectedUserModal.id)}
          nickRevealResult={nickRevealResult}
          onRevealUserNicks={onAdminRevealNicks}
          onClearNickReveal={onClearNickRevealResult}
          onClose={() => {
            onClearNickRevealResult?.();
            setSelectedUserModal(null);
          }}
          onStartPm={handleStartPm}
          onMention={handleMention}
          onToggleIgnore={handleToggleIgnore}
          onToggleLike={onToggleLikeUser}
          onSendGift={onSendGift}
          onClearGiftIcon={onClearGiftIcon}
          onSendAlert={onAlertUser}
          onChallengeGame={onChallengeUser}
          onModAction={onModAction}
          onMoveUserRoom={onAdminMoveUserRoom}
          onBanUser={onAdminBanUser}
          onSetRole={onAdminSetRole}
          onSetUserLikes={onAdminSetUserLikes}
          onEditUser={onAdminEditUser}
          onSetRoyalEntry={canManageAccounts ? onAdminSetRoyalEntry : undefined}
          onDeleteAccount={onAdminDeleteAccount}
          onMicModAction={onMicModAction}
          onSetDemoTalkControl={onAdminSetDemoTalkControl}
          onDemoDirectAction={onAdminDemoDirectAction}
        />
      )}

      {showCreateRoomModal && (
        <CreateRoomModal
          initialVoiceMode={createRoomInitialVoiceMode}
          onClose={() => setShowCreateRoomModal(false)}
          onCreate={onCreateRoom}
        />
      )}

      {showGamesModal && (
        <GamesModal
          onClose={() => setShowGamesModal(false)}
          onJoinGamesRoom={() => {
            onJoinRoom('games');
            setActiveTab('chat');
          }}
          onPostResultToRoom={(text) =>
            onSendMessage({
              roomId: currentRoomId,
              text,
              textColor,
              isBold: false,
              fontSize,
            })
          }
        />
      )}

      {activeChallenge && (
        <ChallengeGameModal
          challenge={activeChallenge}
          selfId={self.id}
          onXoMove={onXoMove}
          onLudoRoll={onLudoRoll}
          onClose={onCloseChallenge}
        />
      )}

      {showNotificationsModal && (
        <NotificationsModal
          notifications={notifications}
          onlineUsers={onlineUsers}
          onClose={() => setShowNotificationsModal(false)}
          onMarkAllRead={onMarkNotificationsRead}
          onClearAll={onClearNotifications}
          onOpenUserProfile={(user) => setSelectedUserModal(user)}
          onStartPm={handleStartPm}
          onAlertUser={onAlertUser}
        />
      )}

      {activeAlertPopup && (() => {
        const alertSender = onlineUsers.find((u) => u.id === activeAlertPopup.fromUserId);
        const alertSenderStats = userStatsMap[activeAlertPopup.fromUserId];
        return (
          <AlertPopupModal
            alert={activeAlertPopup}
            sender={alertSender}
            senderLikesCount={alertSenderStats?.likesCount ?? alertSender?.likesCount ?? 0}
            isLikedByMe={(alertSenderStats?.likes || []).includes(self.id)}
            onClose={onDismissAlertPopup}
            onStartPm={handleStartPm}
            onOpenProfile={(user) => setSelectedUserModal(user)}
            onReplyAlert={(targetUserId, message) => onAlertUser(targetUserId, message)}
            onToggleLike={onToggleLikeUser}
            onIgnoreUser={handleToggleIgnore}
          />
        );
      })()}

      {roomPasswordPrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/65 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="room-pass-title"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!roomPasswordInput.trim()) return;
              onJoinRoom(roomPasswordPrompt.roomId, roomPasswordInput.trim());
            }}
            className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl shadow-xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h3
                id="room-pass-title"
                className="font-display text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2"
              >
                <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>غرفة محمية: {roomPasswordPrompt.roomName}</span>
              </h3>
              <button
                type="button"
                onClick={onDismissRoomPasswordPrompt}
                aria-label="إغلاق"
                className="p-1 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-400">
              أدخل كلمة مرور الغرفة للدخول إليها.
            </p>

            {roomPasswordPrompt.error && (
              <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                {roomPasswordPrompt.error}
              </p>
            )}

            <input
              type="password"
              required
              autoFocus
              maxLength={32}
              value={roomPasswordInput}
              onChange={(e) => setRoomPasswordInput(e.target.value)}
              placeholder="كلمة مرور الغرفة..."
              className="w-full h-10 px-3 rounded-lg border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-rose-700"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onDismissRoomPasswordPrompt}
                className="px-4 py-2 rounded-lg border border-stone-300 dark:border-zinc-700 text-xs font-medium cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={!roomPasswordInput.trim()}
                className="px-4 py-2 rounded-lg bg-[var(--ych-primary)] hover:bg-[var(--ych-primary-dark)] text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
              >
                دخول الغرفة
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Freehand Doodle Pad Modal */}
      {showDoodleModal && (
        <DoodleModal
          onClose={() => setShowDoodleModal(false)}
          onSendDrawing={(dataUrl) => {
            onSendMessage({
              roomId: currentRoomId,
              text: '',
              textColor,
              isBold: false,
              fontSize,
              imageUrl: dataUrl,
            });
            setShowDoodleModal(false);
          }}
        />
      )}

      {/* Public Dedication Modal (إهداء عام) */}
      {showDedicationModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/65 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!dedicationText.trim()) return;
              onSendDedication(
                currentRoomId,
                dedicationText.trim(),
                dedicationTo.trim() || undefined
              );
              setDedicationText('');
              setDedicationTo('');
              setShowDedicationModal(false);
            }}
            className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl shadow-xl p-5 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>إرسال إهداء عام في الغرفة</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowDedicationModal(false)}
                aria-label="إغلاق"
                className="p-1 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              يظهر الإهداء في بطاقة ذهبية بارزة أمام جميع المتواجدين في الغرفة (10 لايكات، مجاني للإدارة والإشراف).
            </p>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                اسم المُهدى إليه (اختياري)
              </label>
              <input
                type="text"
                maxLength={30}
                value={dedicationTo}
                onChange={(e) => setDedicationTo(e.target.value)}
                placeholder="مثال: لكل أعضاء الغرفة أو اسم عضو..."
                className="w-full h-9 px-3 rounded-lg border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                نص الإهداء
              </label>
              <textarea
                rows={3}
                required
                maxLength={160}
                value={dedicationText}
                onChange={(e) => setDedicationText(e.target.value)}
                placeholder="اكتب إهداءك أو تحيتك هنا..."
                className="w-full p-2.5 rounded-lg border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-xs resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowDedicationModal(false)}
                className="px-4 py-2 rounded-lg border border-stone-300 dark:border-zinc-700 text-xs font-medium cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={!dedicationText.trim()}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
              >
                إرسال الإهداء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Room Media / Radio / YouTube Modal (Staff) */}
      {showMediaModal && currentRoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/65 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!mediaUrlInput.trim()) return;
              onSetRoomMedia(
                currentRoom.id,
                mediaUrlInput.trim(),
                mediaTitleInput.trim() || undefined
              );
              setMediaCollapsed(false);
              setShowMediaModal(false);
            }}
            className="w-full max-w-md bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl shadow-xl p-5 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Radio className="w-4 h-4 text-[var(--ych-primary)] dark:text-amber-300" />
                <span>إذاعة / مشغل يوتيوب الغرفة</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowMediaModal(false)}
                aria-label="إغلاق"
                className="p-1 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                عنوان البث أو الأغنية (اختياري)
              </label>
              <input
                type="text"
                maxLength={60}
                value={mediaTitleInput}
                onChange={(e) => setMediaTitleInput(e.target.value)}
                placeholder="مثال: سهرة بغدادية أو راديو الغرفة..."
                className="w-full h-9 px-3 rounded-lg border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                رابط يوتيوب أو رابط بث صوتي مباشر (MP3 / HTTPS)
              </label>
              <input
                type="url"
                required
                dir="ltr"
                value={mediaUrlInput}
                onChange={(e) => setMediaUrlInput(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... أو رابط بث مباشر"
                className="w-full h-9 px-3 rounded-lg border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-xs"
              />
              <button
                type="button"
                onClick={() => setYoutubeSearchMode('roomMedia')}
                className="mt-2 w-full h-9 px-3 rounded-lg border border-red-300 dark:border-red-900/70 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 text-red-700 dark:text-red-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>بحث باسم الأغنية في يوتيوب</span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              {currentRoom.media ? (
                <button
                  type="button"
                  onClick={() => {
                    onClearRoomMedia(currentRoom.id);
                    setShowMediaModal(false);
                  }}
                  className="px-3 py-2 rounded-lg border border-red-300 dark:border-red-900 text-red-600 dark:text-red-400 text-xs font-bold cursor-pointer"
                >
                  إيقاف البث الحالي
                </button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMediaModal(false)}
                  className="px-4 py-2 rounded-lg border border-stone-300 dark:border-zinc-700 text-xs font-medium cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={!mediaUrlInput.trim()}
                  className="px-4 py-2 rounded-lg bg-[var(--ych-primary)] hover:bg-[var(--ych-primary-dark)] text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                >
                  تشغيل للجميع
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Room Trivia / Quiz Bot Modal (Staff) */}
      {showQuizModal && currentRoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/65 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!quizQuestionInput.trim() || !quizAnswerInput.trim()) return;
              onStartRoomQuiz(
                currentRoom.id,
                quizQuestionInput.trim(),
                quizAnswerInput.trim(),
                quizRewardInput
              );
              setShowQuizModal(false);
            }}
            className="w-full max-w-md bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl shadow-xl p-5 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-300" />
                <span>إطلاق مسابقة في الغرفة</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowQuizModal(false)}
                aria-label="إغلاق"
                className="p-1 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <span className="block text-[11px] font-semibold text-stone-500 dark:text-stone-400 mb-1.5">
                أسئلة جاهزة سريعة:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUIZ_PRESETS.map((preset, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setQuizQuestionInput(preset.question);
                      setQuizAnswerInput(preset.answer);
                      setQuizRewardInput(preset.rewardLikes);
                    }}
                    className="px-2 py-1 rounded-xs border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-[11px] font-medium cursor-pointer"
                  >
                    سؤال #{i + 1}: {preset.answer}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                السؤال
              </label>
              <input
                type="text"
                required
                maxLength={180}
                value={quizQuestionInput}
                onChange={(e) => setQuizQuestionInput(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  الإجابة الصحيحة
                </label>
                <input
                  type="text"
                  required
                  maxLength={60}
                  value={quizAnswerInput}
                  onChange={(e) => setQuizAnswerInput(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  الجائزة (لايكات)
                </label>
                <select
                  value={quizRewardInput}
                  onChange={(e) => setQuizRewardInput(Number(e.target.value))}
                  className="w-full h-9 px-2.5 rounded-lg border border-stone-300 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-950 text-xs"
                >
                  <option value={10}>10 لايكات</option>
                  <option value={20}>20 لايك</option>
                  <option value={25}>25 لايك</option>
                  <option value={30}>30 لايك</option>
                  <option value={50}>50 لايك</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowQuizModal(false)}
                className="px-4 py-2 rounded-lg border border-stone-300 dark:border-zinc-700 text-xs font-medium cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={!quizQuestionInput.trim() || !quizAnswerInput.trim()}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
              >
                بدء المسابقة
              </button>
            </div>
          </form>
        </div>
      )}
      {youtubeSearchMode && (
        <YouTubeSongSearchModal
          token={token}
          mode={youtubeSearchMode}
          canBroadcastRoom={Boolean(canEditTopic && currentRoom)}
          onClose={() => setYoutubeSearchMode(null)}
          onSendToChat={(song: YouTubeSearchResult) => {
            if (isChatComposerDisabled) {
              onMicError(
                isLikesRestrictedForChat
                  ? `التحدث في الدردشة العامة يتطلب ${minLikesToChat} لايك على الأقل.`
                  : 'أنت مكتوم حالياً من الإرسال في الغرفة.'
              );
              return;
            }
            onSendMessage({
              roomId: currentRoomId,
              text: `🎵 ${song.title}\n${song.url}`,
              textColor,
              isBold,
              fontSize,
            });
          }}
          onSelectForRoomMedia={(song: YouTubeSearchResult) => {
            if (youtubeSearchMode === 'roomMedia') {
              setMediaTitleInput(song.title.slice(0, 60));
              setMediaUrlInput(song.url);
            } else if (currentRoom && canEditTopic) {
              onSetRoomMedia(currentRoom.id, song.url, song.title.slice(0, 60));
            }
          }}
        />
      )}

      {showRoomImageModal && currentRoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label="تعديل صورة الغرفة"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onUpdateRoomImage(currentRoom.id, roomImageDraft.trim());
              setShowRoomImageModal(false);
            }}
            className="w-full max-w-md bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-xl shadow-xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <ImagePlus className="w-4 h-4 text-[var(--ych-primary)] dark:text-amber-300" />
                <span>صورة غرفة: {currentRoom.name}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowRoomImageModal(false)}
                aria-label="إغلاق"
                className="p-1 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <RoomImagePicker
              value={roomImageDraft}
              onChange={setRoomImageDraft}
              roomName={currentRoom.name}
            />

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowRoomImageModal(false)}
                className="px-4 py-2 rounded-lg border border-stone-300 dark:border-zinc-700 text-xs font-medium cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[var(--ych-primary)] hover:bg-[var(--ych-primary-dark)] text-white text-xs font-bold cursor-pointer"
              >
                حفظ الصورة
              </button>
            </div>
          </form>
        </div>
      )}

      <ImageLightboxModal image={zoomedImage} onClose={() => setZoomedImage(null)} />
    </div>
  );
};
