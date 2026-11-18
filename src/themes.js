import { compileThemeCss, parseThemeCss } from './theme-css.js';
import { createId } from './id.js';

import { BUILTIN_THEMES, THEME_ALIASES, RETIRED_THEME_IDS } from './builtin-themes.js';
import { LEGACY_THEMES } from './legacy-themes.js';
import { TAVERN_THEME_IDS, isTavernThemeId, tavernReadingTheme, tavernThemeId } from './tavern-look.js';
export { BUILTIN_THEMES, THEME_ALIASES, RETIRED_THEME_IDS, TAVERN_THEME_IDS, isTavernThemeId, tavernThemeId, tavernReadingTheme };
// 混合章节的正文与卡片沿用正文主题；小手机沿用手机主题。
export const themeMode = mode => mode === 'mixed' ? 'prose' : mode;
export function resolveLegacyTheme(state, mode, themeId) {
  const target = themeMode(mode);
  return state.themes.find(t => t.id === themeId && t.mode === target) || LEGACY_THEMES.find(t => t.id === themeId && t.mode === target) || resolveTheme(state, mode, themeId);
}
const tokenKeys = new Set(['background', 'color', 'fontFamily', 'fontSize', 'lineHeight', 'bubble', 'ownBubble']);
// 小手机皮肤布局：classic 是默认框架；guardian／wechat／qq 是三种结构级皮肤，
// 由 reader 按布局渲染不同的标题栏、消息行与装饰底栏，CSS 只负责配色。
export const PHONE_LAYOUTS = ['classic', 'guardian', 'wechat', 'qq'];
// Cache successful CSS validation only, keyed by exact input, with a fixed bound.
// Returned chapter snapshots and their tokens always remain independent objects.
const verifiedCss = new Set();
export function validateTheme(raw, { allowBuiltInId = false } = {}) {
  if (!raw || !['prose', 'phone'].includes(raw.mode) || typeof raw.name !== 'string' || !raw.name.trim()) throw new Error('主题需要 name、mode（prose 或 phone）和 tokens。');
  if (!raw.tokens || typeof raw.tokens !== 'object' || Array.isArray(raw.tokens)) throw new Error('主题 tokens 必须是对象。');
  const tokens = {};
  for (const [key, value] of Object.entries(raw.tokens)) {
    if (!tokenKeys.has(key) || typeof value !== 'string' || value.length > 200 || /[;{}<>\\]|expression\s*\(/i.test(value)) throw new Error(`不支持的主题变量：${key}`);
    parseThemeCss(value, 'value');
    tokens[key] = value;
  }
  const css = raw.css ?? '';
  const cssKey = typeof css === 'string' && css.length <= 30000 ? JSON.stringify([css, tokens.fontFamily]) : null;
  if (!cssKey || !verifiedCss.has(cssKey)) {
    compileThemeCss(css, tokens.fontFamily);
    if (cssKey) { if (verifiedCss.size >= 16) verifiedCss.delete(verifiedCss.values().next().value); verifiedCss.add(cssKey); }
  }
  return { id: typeof raw.id === 'string' && (/^custom-[a-z0-9-]{1,80}$/.test(raw.id) || allowBuiltInId && ([...BUILTIN_THEMES, ...LEGACY_THEMES].some(t => t.id === raw.id && t.mode === raw.mode) || isTavernThemeId(raw.id))) ? raw.id : `custom-${createId()}`,
    name: raw.name.trim().slice(0, 60), mode: raw.mode, tokens, css,
    ...(raw.mode === 'phone' && PHONE_LAYOUTS.includes(raw.layout) ? { layout: raw.layout } : {}),
    // 结构级皮肤用的原始规则：跟主题一起存，下次打开不用再读一次 27MB 的设置。
    native: typeof raw.native === 'string' && raw.native.length <= 30000 && !/[<>]/.test(raw.native) ? raw.native : undefined };
}
export function resolveTheme(state, mode, themeId) {
  const target = themeMode(mode);
  const follow = () => tavernReadingTheme(target, { background: state?.settings?.followBackground === true, font: state?.settings?.followFont !== false });
  // 小手机不再跟随酒馆主题：酒馆美化大多只管聊天区，硬套到手机壳上会变成一堆错位的装饰。
  if (target === 'phone') {
    const phone = [...BUILTIN_THEMES, ...(state?.themes || [])].find(t => t.id === themeId && t.mode === 'phone');
    return phone || BUILTIN_THEMES.find(t => t.mode === 'phone');
  }
  // “跟随酒馆”每次渲染现取一次酒馆配色，章节保存时会冻结成快照。
  if (isTavernThemeId(themeId) && tavernThemeId(target) === themeId) return follow();
  const chosen = [...BUILTIN_THEMES, ...(state?.themes || [])].find(t => t.id === themeId && t.mode === target);
  if (chosen) return chosen;
  if (TAVERN_THEME_IDS.includes(themeId) && tavernThemeId(target) === themeId) return follow();
  return BUILTIN_THEMES.find(t => t.mode === target) || follow();
}
// 美化页要列出的可选风格：内置 + 导入；只有正文才有实时的“跟随酒馆”。
export function themeChoices(state, mode) {
  const rows = [...BUILTIN_THEMES, ...state.themes].filter(t => t.mode === mode).map(t => ({ value: t.id, label: t.name }));
  return mode === 'phone' ? rows : rows.concat([{ value: tavernThemeId(mode), label: '跟随酒馆（实时）' }]);
}
export function removeImportedTheme(state, themeId) {
  const theme = state.themes.find(t => t.id === themeId);
  if (!theme) throw new Error('内置默认风格不能删除。');
  state.themes = state.themes.filter(t => t.id !== themeId);
  const key = theme.mode === 'phone' ? 'phoneTheme' : 'proseTheme';
  if (state.settings[key] === themeId) state.settings[key] = BUILTIN_THEMES.find(t => t.mode === theme.mode).id;
}
export function captureReadingTheme(theme, mode) {
  const target = themeMode(mode);
  if (theme?.mode !== target) throw new Error('章节的阅读风格与正文／小手机类型不一致。');
  return validateTheme(theme, { allowBuiltInId: true });
}
export function resolveChapterTheme(state, story, chapter) {
  const mode = chapter.mode || story.mode;
  return chapter.readingTheme || resolveTheme(state, mode, chapter.themeId || story.themeId);
}
