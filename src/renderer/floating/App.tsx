import { useState, useEffect, useRef } from 'react';
import type { TrackInfo, AppConfig } from '../../shared/types';

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

function MarqueeText({ text, style, shadowPx, containerWidth }: {
  text: string; style: React.CSSProperties; shadowPx: number; containerWidth: number;
}) {
  const [needsScroll, setNeedsScroll] = useState(false);

  const shadow = shadowPx > 0
    ? `0 1px ${shadowPx}px rgba(0,0,0,0.8), 0 0 ${shadowPx * 2}px rgba(0,0,0,0.5)`
    : 'none';

  const base: React.CSSProperties = {
    ...style,
    textShadow: shadow,
    whiteSpace: 'nowrap',
    display: 'inline-block',
  };

  useEffect(() => {
    // Measure text width using canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.font = `${style.fontWeight ?? 400} ${style.fontSize ?? 16}px ${'sans-serif'}`;
      const w = ctx.measureText(text).width;
      setNeedsScroll(w > containerWidth - 4);
    }
  }, [text, style.fontSize, style.fontWeight, containerWidth]);

  if (!needsScroll) {
    return (
      <div style={{ textAlign: 'center', overflow: 'hidden', width: '100%' }}>
        <span style={base}>{text}</span>
      </div>
    );
  }

  const gap = containerWidth + 50;
  const duration = Math.max(text.length * 0.35, 5);

  return (
    <div style={{ overflow: 'hidden', width: containerWidth }}>
      <div style={{
        animation: `marquee-scroll ${duration}s linear infinite`,
        display: 'flex',
      }}>
        <span style={base}>{text}</span>
        <span style={{ width: gap, flexShrink: 0 }} />
        <span style={base}>{text}</span>
        <span style={{ width: gap, flexShrink: 0 }} />
      </div>
    </div>
  );
}

export function App() {
  const [config, setConfig] = useState<AppConfig>(defaultConfig);
  const [track, setTrack] = useState<TrackInfo | null>(null);
  const [visible, setVisible] = useState(false);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

  const scheduleHide = () => {
    const cfg = configRef.current;
    if (cfg.behavior.alwaysShow) return;
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    fadeTimer.current = setTimeout(() => setVisible(false), cfg.animation.displayDuration);
  };

  useEffect(() => {
    const unsubTrack = window.electronAPI.onTrackChanged((newTrack: TrackInfo) => {
      setTrack(newTrack);
      setVisible(true);
      scheduleHide();
    });
    const unsubConfig = window.electronAPI.onConfigChanged((newConfig: AppConfig) => {
      setConfig(newConfig);
      if (newConfig.behavior.alwaysShow) {
        setVisible(true);
        if (fadeTimer.current) clearTimeout(fadeTimer.current);
      }
    });
    window.electronAPI.getConfig().then((cfg) => {
      setConfig(cfg);
      if (cfg.behavior.alwaysShow) setVisible(true);
    });
    return () => {
      unsubTrack();
      unsubConfig();
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    };
  }, []);

  const { style, size, animation } = config;
  const bgParts = style.backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  const bgColor = bgParts
    ? `rgba(${bgParts[1]}, ${bgParts[2]}, ${bgParts[3]}, ${style.backgroundOpacity})`
    : style.backgroundColor;

  const textWidth = size.width - 40;

  return (
    <div
      className="floating-root"
      style={{
        fontFamily: style.fontFamily,
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <div
        className="floating-card"
        style={{
          opacity: visible ? 1 : 0,
          transition: `opacity ${visible ? animation.fadeInDuration : animation.fadeOutDuration}ms ease-in-out`,
          width: size.width,
          height: size.height,
          borderRadius: style.windowBorderRadius,
          background: bgColor,
          border: style.backgroundOpacity > 0.02 ? '1px solid rgba(255,255,255,0.08)' : 'none',
        }}
      >
        <div className="card-inner-vertical">
          <div
            className="cover-wrap-vertical"
            style={{
              width: style.coverSize,
              height: style.coverSize,
              borderRadius: style.coverBorderRadius,
            }}
          >
            {track?.coverBase64 ? (
              <img
                className="cover-img"
                src={`data:image/jpeg;base64,${track.coverBase64}`}
                alt=""
                style={{ borderRadius: style.coverBorderRadius }}
                draggable={false}
              />
            ) : (
              <div className="cover-placeholder-vertical" style={{ borderRadius: style.coverBorderRadius }}>
                <svg viewBox="0 0 24 24" fill="rgba(255,255,255,0.3)" width="32" height="32">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              </div>
            )}
          </div>
          <div className="track-text-vertical">
            <MarqueeText
              text={track?.title ?? (config.behavior.alwaysShow ? '等待播放...' : '')}
              style={{ fontSize: style.songNameFontSize, color: style.songNameColor, fontWeight: 600 }}
              shadowPx={style.textShadow}
              containerWidth={textWidth}
            />
            <MarqueeText
              text={track?.artist ?? ''}
              style={{ fontSize: style.artistFontSize, color: style.artistColor, fontWeight: 400 }}
              shadowPx={style.textShadow}
              containerWidth={textWidth}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
