export type UserRole = 'visitor' | 'member' | 'vip' | 'moderator' | 'admin';

export type UserGender = 'male' | 'female';

export type YouCamStyleId = 'classic' | 'royal-blue' | 'gold-baghdad' | 'rose-pink' | 'emerald';

export interface UserSocialLinks {
  youtube?: string;
  snapchat?: string;
  instagram?: string;
  tiktok?: string;
  website?: string;
}

export type PermissionKey =
  | 'canChatPublic'
  | 'canSendImages'
  | 'canSendVoice'
  | 'canUsePrivateMsg'
  | 'canBypassSlowMode'
  | 'canSendDedications'
  | 'canSendAlerts'
  | 'canSendGifts'
  | 'canPlayGames'
  | 'canPostWall'
  | 'canCommentWall'
  | 'canEditProfile'
  | 'canCreateRoom'
  | 'canUseMic'
  | 'canUseCam'
  | 'canManageRoomMedia'
  | 'canRunQuiz'
  | 'canEditRoomTopic'
  | 'canDeleteMessages'
  | 'canMuteUsers'
  | 'canKickUsers'
  | 'canMoveUsers'
  | 'canManageMics'
  | 'canClearRoom'
  | 'canBroadcast'
  | 'canAccessAdminPanel'
  | 'canBanUsers'
  | 'canManageRooms'
  | 'canManageAccounts'
  | 'canManageSettings';

export type RolePermissionSet = Record<PermissionKey, boolean>;
export type RolePermissionsMap = Record<UserRole, RolePermissionSet>;

export interface ChatUser {
  id: string;
  username: string;
  isGuest: boolean;
  role: UserRole;
  gender: UserGender;
  nameColor: string;
  textColor?: string;
  bgColor?: string;
  statusColor?: string;
  statusIcon?: string;
  giftIcon?: string;
  giftImageUrl?: string;
  giftLabel?: string;
  pmDisabled?: boolean;
  socialLinks?: UserSocialLinks;
  customPermissions?: Partial<RolePermissionSet>;
  statusText: string;
  bio: string;
  avatarSymbol: string;
  avatarUrl?: string;
  coverUrl?: string;
  roomId: string;
  joinedAt: number;
  isMuted: boolean;
  isGhost?: boolean;
  isIdle?: boolean;
  royalEntry?: boolean;
  royalEntryText?: string;
  likesCount?: number;
  demoTalkControlEnabled?: boolean;
  country: string;
}

export interface RoomMedia {
  kind: 'youtube' | 'audio';
  url: string;
  embedId?: string;
  title: string;
  addedBy: string;
  updatedAt: number;
}

export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  channel: string;
  duration: string;
  thumbnail: string;
  url: string;
  viewsText?: string;
}

export interface RoomQuiz {
  id: string;
  roomId: string;
  question: string;
  rewardLikes: number;
  askedBy: string;
  startedAt: number;
}

export interface Room {
  id: string;
  name: string;
  description: string;
  topic: string;
  isDefault: boolean;
  createdBy: string;
  onlineCount: number;
  hasPassword?: boolean;
  imageUrl?: string;
  media?: RoomMedia | null;
  isVoiceRoom?: boolean;
  voiceMicCount?: number;
}

export interface ReplyReference {
  id: string;
  username: string;
  text: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  userRole: UserRole;
  userGender: UserGender;
  nameColor: string;
  avatarUrl?: string;
  text: string;
  textColor: string;
  isBold: boolean;
  fontSize: 'sm' | 'md' | 'lg';
  replyTo?: ReplyReference;
  imageUrl?: string;
  audioUrl?: string;
  audioDuration?: number;
  timestamp: number;
  type: 'chat' | 'system';
  systemKind?: 'join' | 'leave' | 'move' | 'kick' | 'ban' | 'notice' | 'dedication';
  roomLabel?: string;
  noticeLabel?: string;
  modActorName?: string;
  modReason?: string;
  moveTargetRoomId?: string;
  isRoyalEntry?: boolean;
  royalEntryText?: string;
}

export interface MicSlot {
  slotIndex: number;
  userId: string | null;
  username: string | null;
  nameColor?: string;
  avatarUrl?: string;
  userRole?: UserRole;
  isMuted: boolean;
  isLocked: boolean;
  hasCam?: boolean;
  joinedAt?: number;
}

export type GiftId = string;

export interface GiftItem {
  id: string;
  label: string;
  emoji?: string;
  imageUrl?: string;
  cost: number;
  enabled?: boolean;
}

export interface CustomSmiley {
  id: string;
  code: string;
  label: string;
  imageUrl: string;
  category?: string;
}

export type BannerPlacement = 'portal_top' | 'portal_bottom' | 'chat_top' | 'wall_top';

export interface SiteBanner {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl?: string;
  placement: BannerPlacement;
  enabled: boolean;
  createdAt: number;
}

export interface TopStarEntry {
  userId: string;
  username: string;
  nameColor: string;
  avatarUrl?: string;
  likesCount: number;
  profileLikesCount: number;
}

export interface MicRequestItem {
  userId: string;
  username: string;
  nameColor?: string;
  avatarUrl?: string;
  requestedAt: number;
}

export interface MicReaction {
  id: string;
  userId: string;
  username: string;
  emoji: string;
  timestamp: number;
}

export interface MicSignalPayload {
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export interface PrivateMessage {
  id: string;
  fromUserId: string;
  fromUsername: string;
  fromNameColor: string;
  fromAvatarUrl?: string;
  toUserId: string;
  toUsername: string;
  text: string;
  textColor: string;
  imageUrl?: string;
  timestamp: number;
}

export interface WallComment {
  id: string;
  userId: string;
  username: string;
  nameColor: string;
  text: string;
  timestamp: number;
}

export interface WallPost {
  id: string;
  userId: string;
  username: string;
  userRole: UserRole;
  nameColor: string;
  avatarUrl?: string;
  country?: string;
  content: string;
  imageUrl?: string;
  youtubeId?: string;
  audioUrl?: string;
  audioDuration?: number;
  likes: string[];
  comments: WallComment[];
  timestamp: number;
}

export interface SiteDesignSettings {
  portalBannerUrl: string;
  portalThumbUrl: string;
  showPortalThumb: boolean;
  portalBannerOpacity: number;
  portalBgUrl: string;
  chatBgUrl: string;
  chatBgOpacity: number;
  systemAvatarUrl: string;
  useCustomColors: boolean;
  primaryColor: string;
  primaryDarkColor: string;
  softBgColor: string;
  accentColor: string;
  chatOddRowColor: string;
  chatEvenRowColor: string;
  headerBgStyle: 'solid' | 'gradient';
  borderRadiusMode: 'sharp' | 'medium' | 'rounded';
  messageDensity: 'compact' | 'normal' | 'spacious';
  avatarShape: 'square' | 'rounded' | 'circle';
  showMicStage: boolean;
  showPortalOnlineList: boolean;
  showPortalInfoBar: boolean;
  portalFooterText: string;
  lockUserStyleOverride: boolean;
}

export interface SiteSettings {
  siteTitle: string;
  welcomeBanner: string;
  allowGuestLogin: boolean;
  allowRegistration?: boolean;
  allowWallPosts: boolean;
  slowModeSeconds: number;
  minLikesToChat?: number;
  defaultStyle?: YouCamStyleId;
  allowImages?: boolean;
  allowVoiceNotes?: boolean;
  allowPrivateMessages?: boolean;
  allowMics?: boolean;
  allowGames?: boolean;
  allowGifts?: boolean;
  allowRoomCreation?: boolean;
  allowProfileEdits?: boolean;
  maintenanceMode?: boolean;
  maxGuests?: number;
  rolePermissions?: RolePermissionsMap;
  design?: SiteDesignSettings;
  customGifts?: GiftItem[];
  customSmileys?: CustomSmiley[];
  banners?: SiteBanner[];
}

export interface BannedEntry {
  id: string;
  username: string;
  usernameLower: string;
  reason: string;
  bannedBy: string;
  bannedAt: number;
}

export interface AdminLogEntry {
  id: string;
  actorName: string;
  action: string;
  target: string;
  timestamp: number;
}

export interface NickAccessRecord {
  id: string;
  userId: string;
  username: string;
  isGuest: boolean;
  role: UserRole;
  nameColor: string;
  country: string;
  ip: string;
  deviceSummary: string;
  firstSeenAt: number;
  lastSeenAt: number;
  loginCount: number;
  lastRoomId?: string;
  isOnline?: boolean;
}

export interface NickRevealPayload {
  targetUserId: string;
  username: string;
  isGuest: boolean;
  role: UserRole;
  ip: string;
  deviceSummary: string;
  lastSeenAt?: number;
  linkedNicks: NickAccessRecord[];
}

export interface RegisteredUserSummary {
  id: string;
  username: string;
  role: UserRole;
  gender: UserGender;
  nameColor: string;
  avatarUrl?: string;
  country: string;
  isMuted: boolean;
  isBanned: boolean;
  royalEntry?: boolean;
  royalEntryText?: string;
  likesCount: number;
  customPermissions?: Partial<RolePermissionSet>;
  demoTalkControlEnabled?: boolean;
  lastIp?: string;
  lastDevice?: string;
  createdAt: number;
}

export interface AdminStatePayload {
  settings: SiteSettings;
  allOnlineUsers: ChatUser[];
  registeredUsers: RegisteredUserSummary[];
  bans: BannedEntry[];
  bannedWords: string[];
  auditLogs: AdminLogEntry[];
  totalMessagesCount: number;
  nickHistory?: NickAccessRecord[];
  onlineIpMap?: Record<string, { ip: string; deviceSummary: string }>;
}

export interface OnlineUserPreview {
  id: string;
  username: string;
  role: UserRole;
  gender: UserGender;
  nameColor: string;
  avatarUrl?: string;
  coverUrl?: string;
  likesCount?: number;
  statusText: string;
  statusIcon?: string;
  giftIcon?: string;
  giftImageUrl?: string;
  giftLabel?: string;
  bio: string;
  country: string;
  roomId: string;
}

export interface BootstrapResponse {
  rooms: Room[];
  totalOnline: number;
  wallCount: number;
  settings: SiteSettings;
  onlinePreview?: OnlineUserPreview[];
  wallPreview?: WallPost[];
}

export interface AuthResponse {
  token: string;
  user: ChatUser;
}

export type MemberNotificationKind = 'alert' | 'mention' | 'like' | 'wall' | 'game' | 'admin';

export interface MemberNotification {
  id: string;
  kind: MemberNotificationKind;
  fromUserId: string;
  fromUsername: string;
  fromNameColor?: string;
  fromAvatarUrl?: string;
  message: string;
  timestamp: number;
  read: boolean;
  roomId?: string;
}

export type WSClientEvent =
  | { type: 'auth:hello'; token: string; roomId: string }
  | { type: 'room:join'; roomId: string; password?: string }
  | { type: 'room:exitToSpace' }
  | { type: 'room:resumeFromSpace' }
  | {
      type: 'room:create';
      name: string;
      description: string;
      topic: string;
      password?: string;
      imageUrl?: string;
      isVoiceRoom?: boolean;
      voiceMicCount?: number;
    }
  | { type: 'room:updateTopic'; roomId: string; topic: string }
  | { type: 'room:updateImage'; roomId: string; imageUrl?: string }
  | { type: 'room:setMedia'; roomId: string; url: string; title?: string }
  | { type: 'room:clearMedia'; roomId: string }
  | { type: 'room:startQuiz'; roomId: string; question: string; answer: string; rewardLikes?: number }
  | { type: 'room:stopQuiz'; roomId: string }
  | { type: 'chat:dedicate'; roomId: string; toUsername?: string; text: string }
  | {
      type: 'chat:send';
      roomId: string;
      text: string;
      textColor: string;
      isBold: boolean;
      fontSize: 'sm' | 'md' | 'lg';
      replyTo?: ReplyReference;
      imageUrl?: string;
      audioUrl?: string;
      audioDuration?: number;
    }
  | { type: 'chat:delete'; roomId: string; messageId: string }
  | { type: 'chat:typing'; roomId: string; isTyping: boolean }
  | { type: 'mic:join'; slotIndex: number }
  | { type: 'mic:leave' }
  | { type: 'mic:toggleMute' }
  | { type: 'mic:toggleCam' }
  | { type: 'mic:request' }
  | {
      type: 'mic:modAction';
      slotIndex: number;
      action: 'kick' | 'mute' | 'unmute' | 'lock' | 'unlock';
    }
  | { type: 'mic:grantRequest'; targetUserId: string }
  | { type: 'mic:speaking'; isSpeaking: boolean }
  | { type: 'mic:signal'; targetUserId: string; signal: MicSignalPayload }
  | { type: 'mic:react'; emoji: string }
  | { type: 'pm:send'; toUserId: string; text: string; textColor: string; imageUrl?: string }
  | {
      type: 'wall:post';
      content: string;
      imageUrl?: string;
      youtubeUrl?: string;
      audioUrl?: string;
      audioDuration?: number;
    }
  | { type: 'wall:like'; postId: string }
  | { type: 'wall:comment'; postId: string; text: string }
  | { type: 'wall:delete'; postId: string }
  | { type: 'user:viewProfile'; targetUserId: string }
  | { type: 'user:like'; targetUserId: string }
  | { type: 'user:sendGift'; targetUserId: string; giftId: GiftId }
  | { type: 'user:clearGiftIcon'; targetUserId: string }
  | { type: 'user:alert'; targetUserId: string; message?: string }
  | { type: 'notifications:markRead' }
  | { type: 'notifications:clear' }
  | { type: 'game:challenge'; targetUserId: string; gameType: 'xo' | 'ludo' }
  | { type: 'game:respond'; challengeId: string; accept: boolean }
  | { type: 'game:xoMove'; challengeId: string; cellIndex: number }
  | { type: 'game:ludoRoll'; challengeId: string }
  | {
      type: 'user:setStatusIcon';
      statusIcon: string;
      statusText?: string;
    }
  | { type: 'presence:status'; isIdle: boolean }
  | {
      type: 'profile:update';
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
    }
  | {
      type: 'account:changePassword';
      currentPassword: string;
      newPassword: string;
    }
  | {
      type: 'mod:action';
      targetUserId: string;
      action: 'mute' | 'unmute' | 'kick' | 'promote' | 'demote';
    }
  | { type: 'admin:fetchState' }
  | { type: 'admin:updateSettings'; settings: SiteSettings }
  | { type: 'admin:updateDesign'; design: SiteDesignSettings; defaultStyle?: YouCamStyleId }
  | { type: 'admin:updateGifts'; gifts: GiftItem[] }
  | { type: 'admin:updateSmileys'; smileys: CustomSmiley[] }
  | { type: 'admin:updateBanners'; banners: SiteBanner[] }
  | { type: 'admin:toggleGhost'; enabled: boolean }
  | { type: 'admin:updateRolePermissions'; rolePermissions: RolePermissionsMap }
  | { type: 'admin:setUserPermissions'; targetUserId: string; permissions: Partial<RolePermissionSet> }
  | { type: 'admin:setUserLikes'; targetUserId: string; likesCount: number }
  | {
      type: 'admin:editUser';
      targetUserId: string;
      username?: string;
      nameColor?: string;
      statusText?: string;
      gender?: UserGender;
      removeAvatar?: boolean;
      removeCover?: boolean;
    }
  | { type: 'admin:broadcast'; text: string }
  | { type: 'admin:setRole'; targetUserId: string; role: UserRole }
  | { type: 'admin:ban'; targetUserId?: string; username: string; reason: string }
  | { type: 'admin:unban'; banId: string }
  | { type: 'admin:deleteAccount'; targetUserId: string }
  | { type: 'admin:moveUserRoom'; targetUserId: string; roomId: string }
  | { type: 'admin:updateRoom'; roomId: string; name: string; description: string; topic: string; password?: string; imageUrl?: string }
  | { type: 'admin:deleteRoom'; roomId: string }
  | { type: 'admin:clearRoom'; roomId: string }
  | { type: 'admin:clearAllRooms' }
  | { type: 'admin:clearWall' }
  | { type: 'admin:bulkMicAction'; action: 'lockAll' | 'unlockAll' | 'kickAll' | 'muteAll' | 'unmuteAll' }
  | { type: 'admin:clearAuditLogs' }
  | { type: 'admin:addBannedWord'; word: string }
  | { type: 'admin:removeBannedWord'; word: string }
  | { type: 'admin:spawnTestMember' }
  | { type: 'admin:setDemoTalkControl'; targetUserId: string; enabled: boolean }
  | {
      type: 'admin:demoDirectAction';
      targetUserId: string;
      action: 'sayRoom' | 'micJoin' | 'micLeave' | 'micSpeak' | 'setGender';
      text?: string;
      slotIndex?: number;
      gender?: UserGender;
    }
  | {
      type: 'admin:setRoyalEntry';
      targetUserId: string;
      enabled: boolean;
      royalEntryText?: string;
      announceNow?: boolean;
    }
  | {
      type: 'admin:bulkRoyalEntry';
      target: 'allOnline' | 'vipAndMods' | 'allRegistered' | 'revokeAll';
      royalEntryText?: string;
    }
  | { type: 'admin:revealNicks'; targetUserId: string }
  | { type: 'admin:clearNickHistory' };

export interface UserProfileStats {
  userId: string;
  views: number;
  likes: string[];
  likesCount: number;
}

export interface GameChallengeState {
  id: string;
  gameType: 'xo' | 'ludo';
  challengerId: string;
  challengerName: string;
  opponentId: string;
  opponentName: string;
  status: 'pending' | 'active' | 'finished';
  turnUserId: string;
  winnerId?: string | 'draw';
  xoBoard: ('' | 'X' | 'O')[];
  ludoPositions: Record<string, number>;
  lastDice?: number;
  lastActionText?: string;
}

export type WSServerEvent =
  | {
      type: 'init:state';
      self: ChatUser;
      rooms: Room[];
      currentRoomId: string;
      messages: ChatMessage[];
      onlineUsers: ChatUser[];
      wallPosts: WallPost[];
      privateMessages: PrivateMessage[];
      notifications: MemberNotification[];
      settings: SiteSettings;
      mics: MicSlot[];
      micRequests: MicRequestItem[];
      topStars: TopStarEntry[];
      activeQuiz?: RoomQuiz | null;
    }
  | { type: 'rooms:update'; rooms: Room[] }
  | {
      type: 'room:joined';
      roomId: string;
      messages: ChatMessage[];
      onlineUsers: ChatUser[];
      mics?: MicSlot[];
      micRequests?: MicRequestItem[];
      activeQuiz?: RoomQuiz | null;
    }
  | {
      type: 'space:state';
      roomId: string;
      isInSpace: boolean;
    }
  | {
      type: 'room:mediaUpdated';
      roomId: string;
      media: RoomMedia | null;
    }
  | {
      type: 'room:quizUpdated';
      roomId: string;
      quiz: RoomQuiz | null;
    }
  | {
      type: 'room:passwordRequired';
      roomId: string;
      roomName: string;
      error?: string;
    }
  | { type: 'leaderboard:update'; stars: TopStarEntry[] }
  | { type: 'room:cleared'; roomId: string; messages: ChatMessage[] }
  | { type: 'users:update'; roomId: string; onlineUsers: ChatUser[] }
  | {
      type: 'mics:update';
      roomId: string;
      mics: MicSlot[];
      micRequests: MicRequestItem[];
    }
  | {
      type: 'mic:speaking';
      roomId: string;
      userId: string;
      isSpeaking: boolean;
    }
  | {
      type: 'mic:botAudio';
      roomId: string;
      userId: string;
      username: string;
      gender?: UserGender;
      mimeType: string;
      audioBase64: string;
      durationMs?: number;
      spokenText?: string;
    }
  | {
      type: 'mic:signal';
      fromUserId: string;
      signal: MicSignalPayload;
    }
  | {
      type: 'mic:reaction';
      roomId: string;
      reaction: MicReaction;
    }
  | { type: 'chat:message'; message: ChatMessage }
  | { type: 'chat:deleted'; roomId: string; messageId: string }
  | {
      type: 'chat:typing';
      roomId: string;
      userId: string;
      username: string;
      isTyping: boolean;
    }
  | { type: 'pm:message'; message: PrivateMessage }
  | { type: 'wall:created'; post: WallPost }
  | { type: 'wall:updated'; post: WallPost }
  | { type: 'wall:deleted'; postId: string }
  | { type: 'wall:cleared' }
  | { type: 'profile:updated'; user: ChatUser }
  | { type: 'user:profileStats'; stats: UserProfileStats }
  | {
      type: 'user:alerted';
      kind?: 'alert' | 'like';
      badgeNumber?: number;
      fromUserId: string;
      fromUsername: string;
      fromNameColor?: string;
      fromAvatarUrl?: string;
      message: string;
      timestamp: number;
    }
  | { type: 'notification:new'; notification: MemberNotification }
  | { type: 'notifications:synced'; notifications: MemberNotification[] }
  | { type: 'game:challenged'; challenge: GameChallengeState }
  | { type: 'game:updated'; challenge: GameChallengeState }
  | { type: 'game:declined'; challengeId: string; byUsername: string }
  | { type: 'account:passwordResult'; ok: boolean; message: string }
  | { type: 'settings:updated'; settings: SiteSettings }
  | { type: 'admin:state'; data: AdminStatePayload }
  | { type: 'admin:nicksResult'; data: NickRevealPayload }
  | { type: 'admin:announcement'; text: string; by: string; timestamp: number }
  | {
      type: 'royal:entry';
      user: ChatUser;
      roomId: string;
      roomName: string;
      royalEntryText?: string;
      timestamp: number;
    }
  | { type: 'mod:notice'; message: string; kicked?: boolean }
  | { type: 'error:notice'; message: string };
