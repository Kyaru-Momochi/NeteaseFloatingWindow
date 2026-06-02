import { useState, useEffect } from 'react';
import type { AppConfig } from '../../shared/types';

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

type Category = 'position' | 'size' | 'animation' | 'style' | 'behavior';

const categories: { key: Category; label: string; icon: string }[] = [
  { key: 'position', label: '位置', icon: '⊞' },
  { key: 'size', label: '尺寸', icon: '⤡' },
  { key: 'animation', label: '动画', icon: '◐' },
  { key: 'style', label: '样式', icon: '🎨' },
  { key: 'behavior', label: '行为', icon: '⚙' },
];

function SliderControl({
  label, value, min, max, step, unit, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number;
  unit?: string; onChange: (v: number) => void;
}) {
  return (
    <div className="control-row">
      <label className="control-label">{label}</label>
      <div className="control-slider-wrap">
        <input
          type="range" min={min} max={max} step={step}
          value={value} onChange={(e) => onChange(Number(e.target.value))}
          className="control-slider"
        />
        <span className="control-value">{value}{unit ?? ''}</span>
      </div>
    </div>
  );
}

function ColorControl({
  label, value, onChange,
}: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  const isRgba = value.startsWith('rgba');
  const hexValue = isRgba ? '#ffffff' : value;

  return (
    <div className="control-row">
      <label className="control-label">{label}</label>
      <div className="control-color-wrap">
        <input
          type="color" value={hexValue}
          onChange={(e) => onChange(e.target.value)}
          className="control-color"
        />
        <input
          type="text" value={value}
          onChange={(e) => onChange(e.target.value)}
          className="control-input"
        />
      </div>
    </div>
  );
}

function ToggleControl({
  label, value, onChange,
}: {
  label: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="control-row">
      <label className="control-label">{label}</label>
      <button
        className={`toggle ${value ? 'toggle-on' : 'toggle-off'}`}
        onClick={() => onChange(!value)}
      >
        <span className="toggle-knob" />
      </button>
    </div>
  );
}

function SelectControl({
  label, value, options, onChange,
}: {
  label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void;
}) {
  return (
    <div className="control-row">
      <label className="control-label">{label}</label>
      <select
        className="control-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export function App() {
  const [config, setConfig] = useState<AppConfig>(defaultConfig);
  const [activeCategory, setActiveCategory] = useState<Category>('position');
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    window.electronAPI.getConfig().then((c) => setConfig(c));
  }, []);

  const update = (partial: Partial<AppConfig>) => {
    const next = { ...config, ...partial };
    // Deep merge for nested objects
    for (const key of Object.keys(partial) as (keyof AppConfig)[]) {
      if (partial[key] && typeof partial[key] === 'object' && !Array.isArray(partial[key])) {
        (next as any)[key] = { ...(config as any)[key], ...(partial as any)[key] };
      }
    }
    setConfig(next);
    setSaved(false);
    window.electronAPI.saveConfig(partial);
  };

  const handleSave = () => {
    window.electronAPI.saveConfig(config).then(() => setSaved(true));
  };

  const handleReset = () => {
    window.electronAPI.resetConfig().then((c) => {
      setConfig(c);
      setSaved(true);
    });
  };

  const c = config;

  return (
    <div className="config-app">
      <header className="config-header">
        <h1 className="config-title">网易云音乐悬浮窗</h1>
        <span className="config-subtitle">设置面板</span>
      </header>
      <div className="config-body">
        <nav className="config-sidebar">
          {categories.map((cat) => (
            <button
              key={cat.key}
              className={`sidebar-item ${activeCategory === cat.key ? 'sidebar-item-active' : ''}`}
              onClick={() => setActiveCategory(cat.key)}
            >
              <span className="sidebar-icon">{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </nav>
        <main className="config-content">
          {activeCategory === 'position' && (
            <section className="config-section">
              <h2 className="section-title">位置设置（锚点：左下角）</h2>
              <p className="section-hint">窗口左下角距离屏幕左边、下边的距离</p>
              <SliderControl
                label="距左边"
                value={c.position.x} min={0} max={3000} step={5} unit="px"
                onChange={(v) => update({ position: { ...c.position, x: v } })}
              />
              <SliderControl
                label="距下边"
                value={c.position.y} min={0} max={2000} step={5} unit="px"
                onChange={(v) => update({ position: { ...c.position, y: v } })}
              />
            </section>
          )}

          {activeCategory === 'size' && (
            <section className="config-section">
              <h2 className="section-title">尺寸设置</h2>
              <SliderControl
                label="窗口宽度"
                value={c.size.width} min={150} max={800} step={10} unit="px"
                onChange={(v) => update({ size: { ...c.size, width: v } })}
              />
              <SliderControl
                label="窗口高度"
                value={c.size.height} min={150} max={600} step={10} unit="px"
                onChange={(v) => update({ size: { ...c.size, height: v } })}
              />
              <SliderControl
                label="封面大小"
                value={c.style.coverSize} min={60} max={400} step={10} unit="px"
                onChange={(v) => update({ style: { ...c.style, coverSize: v } })}
              />
            </section>
          )}

          {activeCategory === 'animation' && (
            <section className="config-section">
              <h2 className="section-title">动画设置</h2>
              <SliderControl
                label="淡入时长"
                value={c.animation.fadeInDuration} min={0} max={5000} step={100} unit="ms"
                onChange={(v) => update({ animation: { ...c.animation, fadeInDuration: v } })}
              />
              <SliderControl
                label="淡出时长"
                value={c.animation.fadeOutDuration} min={0} max={5000} step={100} unit="ms"
                onChange={(v) => update({ animation: { ...c.animation, fadeOutDuration: v } })}
              />
              <SliderControl
                label="显示时长"
                value={c.animation.displayDuration} min={1000} max={120000} step={1000} unit="ms"
                onChange={(v) => update({ animation: { ...c.animation, displayDuration: v } })}
              />
            </section>
          )}

          {activeCategory === 'style' && (
            <section className="config-section">
              <h2 className="section-title">样式设置</h2>
              <SliderControl
                label="窗口圆角"
                value={c.style.windowBorderRadius} min={0} max={80} step={1} unit="px"
                onChange={(v) => update({ style: { ...c.style, windowBorderRadius: v } })}
              />
              <SliderControl
                label="封面圆角"
                value={c.style.coverBorderRadius} min={0} max={60} step={1} unit="px"
                onChange={(v) => update({ style: { ...c.style, coverBorderRadius: v } })}
              />
              <SliderControl
                label="歌名字号"
                value={c.style.songNameFontSize} min={10} max={48} step={1} unit="px"
                onChange={(v) => update({ style: { ...c.style, songNameFontSize: v } })}
              />
              <SliderControl
                label="歌手字号"
                value={c.style.artistFontSize} min={8} max={36} step={1} unit="px"
                onChange={(v) => update({ style: { ...c.style, artistFontSize: v } })}
              />
              <ColorControl
                label="歌名颜色"
                value={c.style.songNameColor}
                onChange={(v) => update({ style: { ...c.style, songNameColor: v } })}
              />
              <ColorControl
                label="歌手颜色"
                value={c.style.artistColor}
                onChange={(v) => update({ style: { ...c.style, artistColor: v } })}
              />
              <SliderControl
                label="背景透明度"
                value={Math.round(c.style.backgroundOpacity * 100)} min={0} max={100} step={5} unit="%"
                onChange={(v) => update({ style: { ...c.style, backgroundOpacity: v / 100 } })}
              />
              <SliderControl
                label="文字阴影"
                value={c.style.textShadow} min={0} max={40} step={1} unit="px"
                onChange={(v) => update({ style: { ...c.style, textShadow: v } })}
              />
            </section>
          )}

          {activeCategory === 'behavior' && (
            <section className="config-section">
              <h2 className="section-title">行为设置</h2>
              <ToggleControl
                label="常驻显示（始终显示当前歌曲）"
                value={c.behavior.alwaysShow}
                onChange={(v) => update({ behavior: { ...c.behavior, alwaysShow: v } })}
              />
              <p className="section-hint">
                关闭时仅在切歌时短暂显示悬浮窗，开启后始终显示当前播放信息。
              </p>
            </section>
          )}

          <div className="config-actions">
            <button className="btn btn-secondary" onClick={handleReset}>恢复默认</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saved}>
              {saved ? '已保存' : '保存设置'}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
