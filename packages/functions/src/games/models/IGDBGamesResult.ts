export type Root = Root2[];

export interface Root2 {
  id: number;
  category: number;
  cover?: Cover;
  created_at: number;
  genres?: Genre[];
  name: string;
  screenshots?: Screenshot[];
  slug: string;
  summary?: string;
  updated_at: number;
  url: string;
  checksum: string;
  first_release_date?: number;
  game_modes?: GameMode[];
  platforms?: Platform[];
  release_dates?: ReleaseDate[];
  videos?: Video[];
  collection?: number;
}

export interface Cover {
  id: number;
  image_id: string;
}

export interface Genre {
  id: number;
  name: string;
  slug: string;
}

export interface Screenshot {
  id: number;
  image_id: string;
}

export interface GameMode {
  id: number;
  name: string;
  slug: string;
}

export interface Platform {
  id: number;
  name: string;
  slug: string;
}

export interface ReleaseDate {
  id: number;
  date: number;
  human: string;
  platform: Platform2;
}

export interface Platform2 {
  id: number;
  name: string;
}

export interface Video {
  id: number;
  name: string;
  video_id: string;
}
