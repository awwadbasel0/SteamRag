export interface ModelCompatibility {
  status: 'optimal' | 'partial_offload' | 'too_large' | 'cpu_only';
  label: string;
  color: 'emerald' | 'amber' | 'rose' | 'blue';
  description: string;
  size_mb: number;
  runs_on_gpu: boolean;
}

export interface OllamaModel {
  name: string;
  size: number;
  modified_at?: string;
  compatibility?: ModelCompatibility;
}

export interface CatalogModel {
  name: string;
  description: string;
  size_tag: string;
  parameters: string;
  compatibility?: ModelCompatibility;
}

export interface HardwareInfo {
  gpu: {
    has_gpu: boolean;
    name: string;
    vram_total_mb: number;
    vram_used_mb: number;
    vram_free_mb: number;
    driver_version: string;
  };
  ram: {
    ram_total_mb: number;
    ram_available_mb: number;
  };
}

export interface HltbData {
  main_story_hours?: number | null;
  main_extra_hours?: number | null;
  completionist_hours?: number | null;
}

export interface TaxonomyData {
  pacing?: string;
  progression?: string;
  loop_length?: string;
  best_for?: string;
  difficulty_style?: string;
}

export interface RedditThread {
  title: string;
  subreddit: string;
  score: number;
  num_comments: number;
  upvote_ratio: number;
  url: string;
  excerpt?: string;
}

export interface RedditData {
  thread_count: number;
  upvote_percentage: number;
  total_upvotes: number;
  total_comments: number;
  sentiment: string;
  reddit_bonus?: number;
  top_threads?: RedditThread[];
}

export interface GameCardData {
  appid?: number;
  name?: string;
  header_image?: string;
  short_description?: string;
  current_ccu?: number | null;
  release_date?: string;
  genres?: string[];
  metacritic?: number | null;
  owners_estimate?: string;
  average_playtime_forever?: number;
  rank?: number;
  rank_score?: number;
  review_excerpt?: string;
  hltb?: HltbData | null;
  taxonomy?: TaxonomyData | null;
  reddit?: RedditData | null;
  price?: {
    is_free: boolean;
    currency: string;
    initial_formatted: string;
    final_formatted: string;
    discount_percent: number;
  };
  review_summary?: {
    review_score_desc: string;
    total_reviews: number;
    total_positive: number;
    total_negative: number;
    positive_percentage: number;
  };
}

export interface StepEvent {
  step: 'plan' | 'tools' | 'rag' | 'synthesis';
  message: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  steps?: StepEvent[];
  card?: GameCardData;
  cards?: GameCardData[];
  isStreaming?: boolean;
}

export interface UserGame {
  appid?: number;
  name: string;
  hours_played?: string;
  icon?: string;
}

export interface UserProfile {
  authenticated: boolean;
  steamid?: string;
  personaname?: string;
  avatar_url?: string;
  profile_url?: string;
  summary?: string;
  games?: UserGame[];
}

export interface GoogleAuthStatus {
  connected: boolean;
  method?: 'oauth' | 'api_key' | null;
  user?: {
    name: string;
    email: string;
    picture?: string;
  } | null;
}
