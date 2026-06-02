import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import type { TrackInfo, AppConfig } from '../shared/types';

contextBridge.exposeInMainWorld('electronAPI', {
  onTrackChanged(callback: (track: TrackInfo) => void): () => void {
    const handler = (_event: IpcRendererEvent, track: TrackInfo) => callback(track);
    ipcRenderer.on('track-changed', handler);
    return () => ipcRenderer.removeListener('track-changed', handler);
  },

  onConfigChanged(callback: (config: AppConfig) => void): () => void {
    const handler = (_event: IpcRendererEvent, config: AppConfig) => callback(config);
    ipcRenderer.on('config-changed', handler);
    return () => ipcRenderer.removeListener('config-changed', handler);
  },

  getConfig(): Promise<AppConfig> {
    return ipcRenderer.invoke('get-config');
  },

  saveConfig(config: Partial<AppConfig>): Promise<AppConfig> {
    return ipcRenderer.invoke('save-config', config);
  },

  resetConfig(): Promise<AppConfig> {
    return ipcRenderer.invoke('reset-config');
  },

  openConfig(): void {
    ipcRenderer.send('open-config');
  },
});
