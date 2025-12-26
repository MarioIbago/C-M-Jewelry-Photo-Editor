export interface Preset {
  id: string;
  name: string;
  icon: string;
  prompt: string;
}

export interface EditHistory {
  original: string;
  processed: string | null;
  prompt: string;
  timestamp: number;
}
