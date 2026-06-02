import { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import type { AppConfig, TrackInfo } from '../shared/types';

const defaultConfig: AppConfig = {
  position: { x: 20, y: 20 },
  size: { width: 260, height: 320 },
  animation: { fadeInDuration: 400, fadeOutDuration: 400, displayDuration: 5000 },
  style: {
    windowBorderRadius: 16, coverBorderRadius: 12, coverSize: 200,
    songNameFontSize: 15, artistFontSize: 13,
    songNameColor: '#ffffff', artistColor: 'rgba(255,255,255,0.7)',
    backgroundColor: 'rgba(0,0,0,0.45)', backgroundOpacity: 0.45, backgroundBlur: 20,
    textShadow: 3,
    fontFamily: 'Microsoft YaHei, PingFang SC, sans-serif',
  },
  behavior: { alwaysShow: false },
};

// --- Config Store ---
class ConfigStore {
  private configPath: string;
  private config: AppConfig;

  constructor() {
    this.configPath = path.join(app.getPath('userData'), 'config.json');
    this.config = this.load();
  }

  private load(): AppConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
        return deepMerge(defaultConfig, data);
      }
    } catch { /* ignore corrupt config */ }
    return { ...defaultConfig };
  }

  save(partial: Partial<AppConfig>): AppConfig {
    this.config = deepMerge(this.config, partial);
    try { fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2)); } catch {}
    return this.config;
  }

  getAll(): AppConfig { return this.config; }

  reset(): AppConfig {
    this.config = { ...defaultConfig };
    try { fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2)); } catch {}
    return this.config;
  }
}

function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key of Object.keys(source) as (keyof T)[]) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      (result as any)[key] = deepMerge((target as any)[key], (source as any)[key]);
    } else {
      (result as any)[key] = source[key];
    }
  }
  return result;
}

// --- Globals ---
const isDev = !app.isPackaged;
const store = new ConfigStore();
let smtcProcess: ChildProcess | null = null;
let floatingWindow: BrowserWindow | null = null;
let configWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// --- SMTC Monitor ---
function startSmtcMonitor(): void {
  if (smtcProcess) return;

  const smtcPath = isDev
    ? path.join(__dirname, '..', '..', 'out', 'smtc-helper', 'smtc-helper.exe')
    : path.join(process.resourcesPath, 'smtc-helper.exe');

  if (!fs.existsSync(smtcPath)) {
    console.log('SMTC helper not found at:', smtcPath);
    setTimeout(startSmtcMonitor, 5000);
    return;
  }

  try {
    smtcProcess = spawn(smtcPath, [], { stdio: ['pipe', 'pipe', 'pipe'] });

    let buffer = '';
    smtcProcess.stdout!.on('data', (data: Buffer) => {
      buffer += data.toString('utf-8');
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('{')) continue;
        try {
          const msg = JSON.parse(trimmed);
          if (msg.type === 'track') {
            const track: TrackInfo = {
              title: msg.title,
              artist: msg.artist,
              coverBase64: msg.coverBase64 ?? null,
            };
            if (floatingWindow) {
              floatingWindow.webContents.send('track-changed', track);
            }
          } else if (msg.type === 'error' || msg.type === 'connected') {
            console.log('[SMTC]', msg.type, JSON.stringify(msg));
          }
        } catch { /* skip malformed JSON */ }
      }
    });

    smtcProcess.on('exit', () => { smtcProcess = null; setTimeout(startSmtcMonitor, 3000); });
    smtcProcess.on('error', () => { smtcProcess = null; setTimeout(startSmtcMonitor, 3000); });
  } catch {
    setTimeout(startSmtcMonitor, 3000);
  }
}

// --- Position Calculation ---
function calculatePosition(config: AppConfig): { x: number; y: number } {
  const display = screen.getPrimaryDisplay().workArea;
  return {
    x: display.x + config.position.x,
    y: display.y + display.height - config.size.height - config.position.y,
  };
}

// --- Windows ---
function createFloatingWindow(): void {
  const config = store.getAll();
  const pos = calculatePosition(config);

  floatingWindow = new BrowserWindow({
    width: config.size.width,
    height: config.size.height,
    x: pos.x,
    y: pos.y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  floatingWindow.setAlwaysOnTop(true, 'screen-saver');
  floatingWindow.setIgnoreMouseEvents(true, { forward: true });

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    floatingWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/floating/index.html`);
  } else {
    floatingWindow.loadFile(path.join(__dirname, '..', 'renderer', 'floating', 'index.html'));
  }

  floatingWindow.on('ready-to-show', () => {
    floatingWindow?.webContents.send('config-changed', store.getAll());
  });
}

function createConfigWindow(): void {
  if (configWindow) { configWindow.focus(); return; }

  configWindow = new BrowserWindow({
    width: 720, height: 540,
    title: '网易云悬浮窗 - 设置',
    autoHideMenuBar: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    configWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/config/index.html`);
  } else {
    configWindow.loadFile(path.join(__dirname, '..', 'renderer', 'config', 'index.html'));
  }

  configWindow.on('closed', () => { configWindow = null; });
}

function updateFloatingPosition(): void {
  if (!floatingWindow || floatingWindow.isDestroyed()) return;
  const config = store.getAll();
  const pos = calculatePosition(config);
  floatingWindow.setBounds({
    x: pos.x,
    y: pos.y,
    width: config.size.width,
    height: config.size.height,
  });
}

// --- Tray ---
function createTray(): void {
  // 16x16 red music note icon as PNG base64
  const iconData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA' +
    'x0lEQVQ4T6XTsUrDUBQG4P/cmzSJia0oCA4uOnQRXHwAH8HNN3BwcRV8Ad/BQRQXBxcnB0GwIAgOIiIuoiAW' +
    'aZN778m5iYMWaQzdznLgW875PjjD+UcZayHEFQBPURRP5/M5bdsGSmmEYQgAWNc1XdfBsixMJhMURcHz+ZzX' +
    '6/Ufgu/7zPMcz8Xj8cgYI4QQoJQC8Hw+Z13XvFwuGI/HqKoKQRAQQKjX6z8kAhCd94qesl9CKaCUAjiOY57nL' +
    'JcLhsMhXNfFeDzGdV2Am+sfgrUWIYQ4+SveAZSwG/YV/x+AAAAAAElFTkSuQmCC';
  const icon = nativeImage.createFromDataURL(iconData);
  tray = new Tray(icon);
  tray.setToolTip('网易云音乐悬浮窗');
  const ctxMenu = Menu.buildFromTemplate([
    { label: '打开设置', click: () => createConfigWindow() },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ]);
  tray.setContextMenu(ctxMenu);
  tray.on('double-click', () => createConfigWindow());
}

// --- IPC ---
function setupIPC(): void {
  ipcMain.handle('get-config', () => store.getAll());
  ipcMain.handle('save-config', (_e, partial: Partial<AppConfig>) => {
    const updated = store.save(partial);
    floatingWindow?.webContents.send('config-changed', updated);
    updateFloatingPosition();
    return updated;
  });
  ipcMain.handle('reset-config', () => {
    const updated = store.reset();
    floatingWindow?.webContents.send('config-changed', updated);
    updateFloatingPosition();
    return updated;
  });
  ipcMain.on('open-config', () => createConfigWindow());
}

// --- App Lifecycle ---
app.whenReady().then(() => {
  setupIPC();
  createFloatingWindow();
  createTray();
  startSmtcMonitor();
});

app.on('window-all-closed', () => {
  // Don't quit - keep running in tray
});

app.on('before-quit', () => {
  smtcProcess?.kill();
  smtcProcess = null;
});

app.on('activate', () => {
  createConfigWindow();
});
