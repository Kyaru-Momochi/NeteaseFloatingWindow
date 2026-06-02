export interface TrackInfo {
  title: string;
  artist: string;
  coverBase64: string | null;
}

export interface AppConfig {
  position: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  };
  animation: {
    fadeInDuration: number;
    fadeOutDuration: number;
    displayDuration: number;
  };
  style: {
    windowBorderRadius: number;
    coverBorderRadius: number;
    coverSize: number;
    songNameFontSize: number;
    artistFontSize: number;
    songNameColor: string;
    artistColor: string;
    backgroundColor: string;
    backgroundOpacity: number;
    backgroundBlur: number;
    textShadow: number;
    fontFamily: string;
  };
  behavior: {
    alwaysShow: boolean;
  };
}

export const defaultConfig: AppConfig = {
  position: {
    x: 20,
    y: 20,
  },
  size: {
    width: 260,
    height: 320,
  },
  animation: {
    fadeInDuration: 400,
    fadeOutDuration: 400,
    displayDuration: 5000,
  },
  style: {
    windowBorderRadius: 16,
    coverBorderRadius: 12,
    coverSize: 200,
    songNameFontSize: 15,
    artistFontSize: 13,
    songNameColor: '#ffffff',
    artistColor: 'rgba(255,255,255,0.7)',
    backgroundColor: 'rgba(0,0,0,0.45)',
    backgroundOpacity: 0.45,
    backgroundBlur: 20,
    textShadow: 3,
    fontFamily: 'Microsoft YaHei, PingFang SC, sans-serif',
  },
  behavior: {
    alwaysShow: false,
  },
};
