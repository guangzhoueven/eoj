/**
 * 主题定制:把主题外观配置动态映射为 CSS 变量。
 *
 * 三层优先级(覆盖关系):
 *   1. 用户级 user_settings(theme_accent / theme_radius / theme_font)—— 最高优先级
 *   2. 管理端全局 settings(theme_accent)—— 仅在用户未自定义时生效
 *   3. CSS 默认变量(global.css 内的 [data-theme-style="..."] 块)
 *
 * 所有用户可调项都汇总到 applyUserTheme() 一次应用;applyThemeAccent()
 * 保留向后兼容,内部委托给 applyUserTheme。
 */

// ─── 颜色工具 ──────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const m = (hex || '').replace('#', '');
  if (!m) return 'transparent';
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return 'transparent';
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** 把 hex 颜色按比例调亮 (>1) 或调暗 (<1)。返回小写 hex。失败时回退原值。 */
function mixHex(hex: string, factor: number): string {
  const m = (hex || '').replace('#', '');
  if (!m) return hex;
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return hex;
  const n = parseInt(full, 16);
  const channel = (v: number) => {
    const mixed = factor >= 1
      ? Math.round(v + (255 - v) * (factor - 1))
      : Math.round(v * factor);
    return Math.max(0, Math.min(255, mixed));
  };
  const r = channel((n >> 16) & 255);
  const g = channel((n >> 8) & 255);
  const b = channel(n & 255);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

// ─── 主题片段 ──────────────────────────────────────────

export interface UserTheme {
  /** 强调色,6 位 hex。空串=回退到默认 */
  accent?: string;
  /** 圆角档位: 'sharp' | 'normal' | 'rounded'。空串=回退 */
  radius?: string;
  /** 字体族 preset key:'system' | 'sans' | 'serif' | 'mono'。空串=回退 */
  font?: string;
}

/** 圆角档位 → 4 档实际半径(px)。 */
const RADIUS_PRESETS: Record<string, [number, number, number, number]> = {
  sharp:   [0, 0, 0, 0],
  normal:  [6, 4, 8, 10],
  rounded: [10, 8, 14, 18],
};

/** 字体族 preset。返回 CSS font-family 值。 */
const FONT_PRESETS: Record<string, string> = {
  system: 'system-ui, -apple-system, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif',
  sans:   'Inter, "Helvetica Neue", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
  serif:  '"Source Han Serif SC", "Noto Serif CJK SC", Georgia, "Times New Roman", serif',
  mono:   '"JetBrains Mono", "SF Mono", "Fira Code", Menlo, Consolas, monospace',
};

/** 圆角档位名 → CSS 变量映射。顺序与 RADIUS_PRESETS 元素一致。 */
const RADIUS_VARS = ['--radius', '--radius-md', '--radius-lg', '--radius-xl'] as const;

/** 用户级主题应用的 CSS 变量清单,用于回退时整体清理。 */
const USER_THEME_VAR_KEYS = [
  '--accent', '--accent-hover', '--accent-light', '--primary',
  ...RADIUS_VARS,
  '--font-sans',
] as const;

/**
 * 应用用户级主题(最高优先级)。空字段=回退到 CSS 默认。
 *
 * 注意:在 admin 应用站点级 accent 之后调用,会覆盖前者。
 */
export function applyUserTheme(theme: UserTheme = {}): void {
  const root = document.documentElement;

  const accent = (theme.accent || '').trim().toLowerCase();
  const radiusKey = (theme.radius || '').trim();
  const fontKey = (theme.font || '').trim();

  // 没有任何用户自定义 → 整体清理,让 CSS / admin 配置生效
  if (!accent && !radiusKey && !fontKey) {
    for (const k of USER_THEME_VAR_KEYS) root.style.removeProperty(k);
    return;
  }

  // ── accent ──
  if (accent && /^#?[0-9a-fA-F]{6}$/.test(accent)) {
    const hex = accent.startsWith('#') ? accent : `#${accent}`;
    // 悬浮态:在原色基础上轻微提亮(暗色主题下视觉更明显)
    const hover = mixHex(hex, 1.12);
    root.style.setProperty('--accent', hex);
    root.style.setProperty('--accent-hover', hover);
    root.style.setProperty('--accent-light', hexToRgba(hex, 0.1));
    // 历史别名:--primary 在 Teams.css 等老代码里大量使用
    root.style.setProperty('--primary', hex);
  } else {
    // 用户未指定 accent,但指定了其他项——清理 accent 让 admin/CSS 生效
    root.style.removeProperty('--accent');
    root.style.removeProperty('--accent-hover');
    root.style.removeProperty('--accent-light');
    root.style.removeProperty('--primary');
  }

  // ── radius ──
  const radiusTuple = RADIUS_PRESETS[radiusKey];
  if (radiusTuple) {
    RADIUS_VARS.forEach((varName, i) => {
      root.style.setProperty(varName, `${radiusTuple[i]}px`);
    });
  } else {
    RADIUS_VARS.forEach((varName) => root.style.removeProperty(varName));
  }

  // ── font ──
  const fontFamily = FONT_PRESETS[fontKey];
  if (fontFamily) {
    root.style.setProperty('--font-sans', fontFamily);
  } else {
    root.style.removeProperty('--font-sans');
  }
}

/**
 * 应用管理端配置的强调色(向后兼容入口)。
 * 仅在没有用户级自定义时生效;若用户已自定义 accent,本调用将被覆盖。
 */
export function applyThemeAccent(accent?: string): void {
  applyUserTheme({ accent });
}

// ─── 自定义 CSS 注入(保留原有行为) ────────────────────

let customStyleEl: HTMLStyleElement | null = null;

/**
 * 应用用户自定义 CSS(存于 user_settings.custom_css)。
 * 通过注入 <style> 元素实现,可覆盖任意主题变量/组件样式。
 */
export function applyCustomCss(css?: string): void {
  const content = (css || '').trim();
  if (!content) {
    if (customStyleEl) {
      customStyleEl.remove();
      customStyleEl = null;
    }
    return;
  }
  if (!customStyleEl) {
    customStyleEl = document.createElement('style');
    customStyleEl.setAttribute('data-custom-css', 'true');
    document.head.appendChild(customStyleEl);
  }
  customStyleEl.textContent = content;
}

// ─── 主题预设导出(供 UI 使用) ─────────────────────────

/** 强调色预设:UI 可直接消费。 */
export const ACCENT_PRESETS: ReadonlyArray<{ key: string; value: string; name: string }> = [
  { key: 'blue',    value: '#58a6ff', name: '天蓝' },
  { key: 'indigo',  value: '#6366f1', name: '靛蓝' },
  { key: 'violet',  value: '#8b5cf6', name: '紫罗兰' },
  { key: 'pink',    value: '#ec4899', name: '玫粉' },
  { key: 'red',     value: '#ef4444', name: '猩红' },
  { key: 'orange',  value: '#f59e0b', name: '琥珀' },
  { key: 'green',   value: '#22c55e', name: '翡翠' },
  { key: 'teal',    value: '#14b8a6', name: '青碧' },
  { key: 'cyan',    value: '#06b6d4', name: '青' },
  { key: 'slate',   value: '#64748b', name: '岩石灰' },
];

/** 圆角档位预设。 */
export const RADIUS_PRESET_LIST: ReadonlyArray<{ key: string; name: string }> = [
  { key: 'normal',  name: '标准' },
  { key: 'sharp',   name: '硬朗' },
  { key: 'rounded', name: '圆润' },
];

/** 字体族预设。 */
export const FONT_PRESET_LIST: ReadonlyArray<{ key: string; name: string }> = [
  { key: 'system', name: '系统默认' },
  { key: 'sans',   name: 'Inter / 无衬线' },
  { key: 'serif',  name: '思源宋体' },
  { key: 'mono',   name: 'JetBrains Mono' },
];
