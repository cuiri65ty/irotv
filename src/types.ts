export interface Channel {
  id: string;
  name: string;
  url: string;
  logoUrl?: string;
  category?: string;
  isFavorite?: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  url?: string;
  channels: Channel[];
  importedAt: string;
}

export interface PlayerSettings {
  aspectRatio: 'auto' | '16-9' | '4-3' | 'cover';
  volume: number;
  isMuted: boolean;
  sleepTimerMinutes: number | null; // null = off
  showOledScreensaver: boolean;
}

export type FocusArea = 'sidebar_nav' | 'channel_list' | 'search_bar' | 'playlist_importer' | 'player_controls' | 'presets_list';
