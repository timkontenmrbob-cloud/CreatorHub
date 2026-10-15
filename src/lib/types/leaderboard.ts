export interface LeaderboardCreator {
  rank: number;
  creatorId: string;
  name: string;
  handle: string | null;
  avatar: string | null;
  totalPoints: number;
  totalViews: number;
  approvedVideos: number;
  highlight?: string | null;
  isAnonymous?: boolean;
}

export interface LeaderboardVideo {
  rank: number;
  id: string;
  creatorId: string;
  creatorName: string;
  creatorHandle: string | null;
  creatorAvatar: string | null;
  platform: string;
  videoUrl: string;
  title: string;
  views: number;
  points: number;
  postingDate: string;
  category?: string;
  isAnonymous?: boolean;
  thumbnailUrl?: string | null;
  thumbnailSource?: "manual" | "auto" | null;
}

export interface LeaderboardPeriod {
  startDate: Date;
  endDate: Date;
  startDateIso: string;
  endDateIso: string;
  startDateStr: string;
  endDateStr: string;
  effectiveCutoffStr?: string;
  label: string;
}

export interface UserRankInfo {
  rank: number;
  totalCreators: number;
  totalPoints: number;
  totalViews: number;
  approvedVideos: number;
}
