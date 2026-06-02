import type { TrackInfo, AppConfig } from '../shared/types';

export {};

declare global {
  interface Window {
    electronAPI: {
      onTrackChanged(callback: (track: TrackInfo) => void): () => void;
      onConfigChanged(callback: (config: AppConfig) => void): () => void;
      getConfig(): Promise<AppConfig>;
      saveConfig(config: Partial<AppConfig>): Promise<AppConfig>;
      resetConfig(): Promise<AppConfig>;
      openConfig(): void;
    };
  }
}
