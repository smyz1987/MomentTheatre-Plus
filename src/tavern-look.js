// 读取酒馆当前外观（全局字体与主题色），让番外阅读区与面板跟随酒馆，而不是固定用系统默认。
// 只在渲染时读取一次计算样式，不挂任何全局监听，避免拖慢酒馆。

const FALLBACK_FONT = 'system-ui,sans-serif';
const FALLBACK_PAPER = '#F9F8F6';
const FALLBACK_INK = '#282724';
const GENERIC_FAMILIES = new Set(['system-ui', 'ui-sans-serif', 'ui-serif', 'ui-monospace', 'sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', '-apple-system', 'blinkmacsystemfont', 'inherit', 'initial', 'unset', 'emoji', 'math']);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const safe = () => typeof document !== 'undefined' && document.body;

function readRoot(name) {
  try { return getComputedStyle(document.body).getPropertyValue(name).trim(); } catch { return ''; }
}

function parseColor(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text || text === 'transparent') return null;
  const hex = text.match(/^#([0-9a-f]{3,8})$/);
  if (hex) {
    const h = hex[1];
    const pair = index => parseInt(h.slice(index, index + 2), 16);
    if (h.length === 3 || h.length === 4) return { r: pair(0) * 17, g: pair(1) * 17, b: pair(2) * 17, a: h.length === 4 ? (pair(3) * 17) / 255 : 1 };
    if (h.length === 6 || h.length === 8) return { r: pair(0), g: pair(2), b: pair(4), a: h.length === 8 ? pair(6) / 255 : 1 };
    return null;
  }
  const fn = text.match(/^rgba?\(([^)]*)\)$/);
  if (fn) {
    const parts = fn[1].split(/[,\s/]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const channel = part => part.endsWith('%') ? (parseFloat(part) * 255) / 100 : parseFloat(part);
    const alpha = parts[3] === undefined ? 1 : parts[3].endsWith('%') ? parseFloat(parts[3]) / 100 : parseFloat(parts[3]);
    const [r, g, b] = [channel(parts[0]), channel(parts[1]), channel(parts[2])];
    if (![r, g, b, alpha].every(Number.isFinite)) return null;
    return { r: clamp(Math.round(r), 0, 255), g: clamp(Math.round(g), 0, 255), b: clamp(Math.round(b), 0, 255), a: clamp(alpha, 0, 1) };
  }
  return null;
}

const cssColor = color => color.a >= 0.999
  ? `rgb(${color.r}, ${color.g}, ${color.b})`
  : `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')})`;

const mixChannels = (a, b, weight) => ({
  r: Math.round(a.r * (1 - weight) + b.r * weight),
  g: Math.round(a.g * (1 - weight) + b.g * weight),
  b: Math.round(a.b * (1 - weight) + b.b * weight),
  a: a.a * (1 - weight) + b.a * weight,
});

function flatten(color, under) {
  if (!color) return under;
  if (color.a >= 0.999) return color;
  const base = under || { r: 255, g: 255, b: 255, a: 1 };
  return { ...mixChannels(base, color, color.a), a: 1 };
}

const luminance = color => (0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b) / 255;
// 相对亮度对比度，用来判断气泡配色套上去后文字还看不看得清（低于 3 就放弃气泡色，退回默认样式）。
function contrastRatio(a, b) {
  const channel = value => { const x = value / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  const lum = color => 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function sanitizeFont(value) {
  const text = String(value || '').replace(/[;{}<>\\]/g, '').replace(/expression\s*\(/gi, '').trim();
  if (!text || text.length > 240 || /^none$/i.test(text)) return '';
  return text;
}

// 酒馆的“全局字体”以聊天区实际计算出的字体为准，回退到 --mainFontFamily。
export function tavernFontFamily(fallback = FALLBACK_FONT) {
  if (!safe()) return fallback;
  try {
    const chat = document.querySelector('#chat');
    const computed = sanitizeFont(chat ? getComputedStyle(chat).fontFamily : '');
    const variable = sanitizeFont(readRoot('--mainFontFamily'));
    return computed || variable || fallback;
  } catch { return fallback; }
}

// 主题没有指定具体字体时（系统默认那些）才跟随酒馆，保留主题作者自选的字体。
export function usesGenericFont(value) {
  const text = String(value || '').trim();
  if (!text) return true;
  return text.split(',').map(part => part.trim().replace(/^['"]|['"]$/g, '').toLowerCase()).every(part => !part || GENERIC_FAMILIES.has(part));
}

// 「字体跟随酒馆」打开时，正文、标题、预览一律用酒馆的全局字体，不再保留主题自带字体；
// 关掉之后才回到主题作者选的字体。
export function effectiveFont(themeFont, follow = true) {
  if (follow) return tavernFontFamily(themeFont || FALLBACK_FONT);
  return themeFont || FALLBACK_FONT;
}

// 阅读区在独立沙箱 iframe 里，酒馆用 @import 载入的网络字体不会跟进去，这里把字体的
// 样式表链接带进阅读区，让番外和预览真正用上酒馆同一套字体。
const FONT_HOST = /fontsapi\.zeoseven\.com|fonts\.googleapis\.com|fonts\.gstatic\.com|fonts\.cdnfonts\.com|chinese-fonts-cdn|fonts\.fontsource\.org/i;
export function tavernFontLinks() {
  if (!safe()) return [];
  const found = new Set();
  try {
    for (const node of document.querySelectorAll('style')) {
      const text = node.textContent || '';
      if (!text || text.indexOf('@import') === -1) continue;
      const rule = /@import\s+url\(\s*(?:'([^']+)'|"([^"]+)"|([^'")]+))\s*\)/gi;
      let match;
      while ((match = rule.exec(text))) {
        const href = (match[1] || match[2] || match[3] || '').trim();
        if (/^https:\/\//i.test(href) && FONT_HOST.test(href)) found.add(href);
      }
    }
    for (const link of document.querySelectorAll('link[rel~="stylesheet"]')) {
      const href = link.getAttribute('href') || '';
      if (/^https:\/\//i.test(href) && FONT_HOST.test(href)) found.add(href);
    }
    for (const sheet of Array.from(document.styleSheets)) {
      const href = sheet.href || '';
      if (/^https:\/\//i.test(href) && FONT_HOST.test(href)) found.add(href);
    }
  } catch { }
  return [...found].slice(0, 6);
}

function chatTypography() {
  const fallback = { fontSize: '', lineHeight: '' };
  if (!safe()) return fallback;
  try {
    const target = document.querySelector('#chat') || document.body;
    const style = getComputedStyle(target);
    const px = parseFloat(style.fontSize);
    const line = parseFloat(style.lineHeight);
    const fontSize = Number.isFinite(px) ? `${clamp(Math.round(px), 11, 22)}px` : '';
    const lineHeight = Number.isFinite(px) && px > 0 && Number.isFinite(line) ? (clamp(line / px, 1.3, 2.6).toFixed(2).replace(/0+$/, '').replace(/\.$/, '')) : '';
    return { fontSize, lineHeight };
  } catch { return fallback; }
}

export function tavernColors() {
  const empty = { paper: '', ink: '', quote: '', em: '', strong: '', bubble: '', ownBubble: '' };
  if (!safe()) return empty;
  const ink = parseColor(readRoot('--SmartThemeBodyColor'));
  const chatTint = parseColor(readRoot('--SmartThemeChatTintColor'));
  const blurTint = parseColor(readRoot('--SmartThemeBlurTintColor'));
  let chatBackground = null;
  try { chatBackground = parseColor(getComputedStyle(document.querySelector('#chat') || document.body).backgroundColor); } catch { }
  const under = chatBackground && chatBackground.a > 0.08 ? flatten(chatBackground, null) : { r: 255, g: 255, b: 255, a: 1 };
  let paper = chatTint && chatTint.a > 0.05 ? flatten(chatTint, under) : null;
  if (!paper && blurTint && blurTint.a > 0.05) paper = flatten(blurTint, ink && luminance(ink) < 0.5 ? under : under);
  const background = paper ? cssColor(paper) : '';
  const foreground = ink ? cssColor(flatten(ink, paper || parseColor(FALLBACK_PAPER))) : '';
  // 气泡沿用酒馆消息底色；透明或缺失时按文字与纸面调和出一个接近的浅色。
  const paperColor = paper || parseColor(FALLBACK_PAPER);
  const textColor = ink || parseColor(FALLBACK_INK);
  const own = parseColor(readRoot('--SmartThemeUserMesBlurTintColor'));
  const other = parseColor(readRoot('--SmartThemeBotMesBlurTintColor'));
  const bubble = other && other.a > 0.05 ? cssColor(flatten(other, paperColor)) : cssColor(mixChannels(paperColor, textColor, 0.04));
  const ownBubble = own && own.a > 0.05 ? cssColor(flatten(own, paperColor)) : cssColor(mixChannels(paperColor, textColor, 0.14));
  return {
    paper: background, ink: foreground,
    quote: (() => { const value = parseColor(readRoot('--SmartThemeQuoteColor')); return value ? cssColor(flatten(value, paperColor)) : ''; })(),
    em: (() => { const value = parseColor(readRoot('--SmartThemeEmColor')); return value ? cssColor(flatten(value, paperColor)) : ''; })(),
    strong: '',
    bubble, ownBubble,
  };
}

// 聊天背景图（可选）：只在用户开启“沿用酒馆聊天背景”时读取，且限制长度。
export function tavernChatBackground() {
  if (!safe()) return '';
  try {
    const style = getComputedStyle(document.querySelector('#chat') || document.body);
    const image = String(style.backgroundImage || '');
    const url = image.match(/url\("?(https?:\/\/[^"')]+)"?\)/i)?.[1] || '';
    return url && url.length <= 260000 && !/\s/.test(url) ? url : '';
  } catch { return ''; }
}

export const TAVERN_THEME_IDS = ['tavern-prose', 'tavern-phone'];
export const isTavernThemeId = id => TAVERN_THEME_IDS.includes(id);
export const tavernThemeId = mode => mode === 'phone' ? 'tavern-phone' : 'tavern-prose';

function safeCssValue(value) {
  const text = String(value || '').trim();
  return text && text.length <= 200 && !/[;{}<>\\]|expression\s*\(/i.test(text) ? text : '';
}

// 动态生成的“跟随酒馆”阅读主题。生成章节时会被冻结成章节自己的样式快照。
// 跟随酒馆：除了配色和字体，也把酒馆当前生效的主题样式搬进阅读区。
// 酒馆把主题 CSS 放在 #custom-style 里，读文本比请求整份设置（二十多 MB）便宜得多。
let liveDecor = { key: '', css: '', ready: false, busy: false };
export function tavernDecorCss() { return liveDecor.ready ? liveDecor.css : ''; }
export function primeTavernDecor(onReady) {
  if (liveDecor.busy) return;
  const text = document.getElementById('custom-style')?.textContent || '';
  if (text.trim().length < 200) return;
  const key = `${text.length}:${text.slice(0, 120)}`;
  if (liveDecor.key === key) { if (liveDecor.ready) onReady?.(); return; }
  liveDecor.busy = true;
  // 放到空闲时段再解析，避免打开面板那一下卡住酒馆。
  const run = () => {
    try {
      const converted = convertTavernCss(text, 40000).css;
      liveDecor = { key, css: converted, ready: Boolean(converted), busy: false };
    } catch {
      liveDecor = { key, css: '', ready: false, busy: false };
    }
    try { onReady?.(); } catch { /* 回调里的重绘失败不影响面板 */ }
  };
  const idle = window.requestIdleCallback;
  if (idle) idle(run, { timeout: 2000 }); else setTimeout(run, 240);
}

export function tavernReadingTheme(mode = 'prose', { background = false, font = true } = {}) {
  const colors = tavernColors(), typography = chatTypography();
  const image = background ? tavernChatBackground() : '';
  const tokens = mode === 'phone'
    ? { ...(colors.paper ? { background: colors.paper } : {}), ...(colors.ink ? { color: colors.ink } : {}), ...(font ? { fontFamily: tavernFontFamily() } : {}), bubble: colors.bubble, ownBubble: colors.ownBubble }
    : { ...(colors.paper ? { background: colors.paper } : {}), ...(colors.ink ? { color: colors.ink } : {}), ...(font ? { fontFamily: tavernFontFamily() } : {}), ...(typography.fontSize ? { fontSize: typography.fontSize } : {}), ...(typography.lineHeight ? { lineHeight: typography.lineHeight } : {}) };
  for (const key of Object.keys(tokens)) if (!tokens[key]) delete tokens[key];
  // 卡片使用“跟随酒馆”时，题眼字色也取酒馆的强调色；纸面透明时让酒馆背景透出来。
  const rules = [];
  const root = mode === 'phone' ? '.phone-chapter' : '.prose-chapter';
  const declarations = [
    safeCssValue(colors.quote) && `--prose-quote-color:${safeCssValue(colors.quote)}`,
    safeCssValue(colors.em) && `--prose-em-color:${safeCssValue(colors.em)}`,
    image && `background-image:linear-gradient(${colors.paper || 'rgba(255,255,255,.82)'},${colors.paper || 'rgba(255,255,255,.82)'}),url("${image}");background-size:cover;background-position:center`,
  ].filter(Boolean);
  if (declarations.length) rules.push(`${root}{${declarations.join(';')}}`);
  const decor = tavernDecorCss();
  if (decor) rules.push(decor);
  return { id: tavernThemeId(mode), name: '跟随酒馆', mode, tokens, css: rules.join('\n') };
}

/* ---------------- 酒馆美化主题 JSON → 瞬息阅读主题 ---------------- */

import { parse, walk, generate } from './reading-vendor.js';
import { compileThemeCss, parseThemeCss } from './theme-css.js';

function insideKeyframes(node) {
  let parent = node.parent;
  while (parent) {
    if (parent.type === 'Atrule') return /keyframes/i.test(parent.name);
    parent = parent.parent;
  }
  return false;
}

// 只接受本来就指向聊天内容的开头；其余一律视为酒馆界面规则丢弃。
const ACCEPT_SELECTOR = [
  [/^#chat(?=$|[.:>+~\s[,])/i, '.chapter'],
  [/^\.mes_text(?=$|[.:>+~\s[,])/i, '.paragraph'],
  [/^\.mes_block_wrap(?=$|[.:>+~\s[,])/i, '.paper'],
  [/^\.mes_block(?=$|[.:>+~\s[,])/i, '.paper'],
  [/^\.last_mes(?=$|[.:>+~\s[,])/i, '.paragraph'],
  // 整条消息的装饰（头图、线圈、气泡角标）是画在 .mes 这一层上的，对应阅读区的整章。
  [/^\.mes(?=$|[.:>+~\s[,])/i, '.chapter'],
  [/^\.message(?=$|[.:>+~\s[,])/i, '.message'],
  [/^body(?=$|[.:>+~\s[,])/i, '.chapter'],
];
// 改写到阅读区后仍带界面 id、图标类或 :has() 的选择器会让样式跑偏，直接丢弃。
const REJECT_SELECTOR = /#(?!chat)|\.fa-|\.drawer|:has\(|\[class\*=/i;

// 酒馆里消息常见「外层气泡 .mes_block 包正文 .mes_text」。阅读区是「章节 > 段落」，
// 所以把内层包装换成对应的阅读节点，让原本挂在整条消息上的头图、线圈、角标落到整章，
// 气泡里的文字规则落到段落上。
const INNER_WRAPPER = /\.mes_text\b|\.mes_block_wrap\b|\.mes_block\b|\.last_mes\b|\.mesAvatarWrapper\b|\.mes_avatar_wrapper\b|\.mes\b/g;

function mapSelectorPart(part) {
  const text = part.trim();
  if (!text || /^:root\b/i.test(text)) return '';
  const rule = ACCEPT_SELECTOR.find(([pattern]) => pattern.test(text));
  if (!rule) return '';
  const mapped = text.replace(rule[0], rule[1]).replace(/[>+]/g, ' ')
    .replace(INNER_WRAPPER, inner => {
      if (/^\.mes_text|^\.last_mes/.test(inner)) return '.paragraph';
      if (/^\.mes_block/.test(inner)) return '.paper';
      if (/^\.mesAvatarWrapper|^\.mes_avatar_wrapper/.test(inner)) return ' ';
      return '.chapter';
    })
    .replace(/\s+/g, ' ').trim()
    .replace(/\.paragraph\s+\.paragraph\b/g, '.paragraph')
    .replace(/\.chapter\s+\.chapter\b/g, '.chapter');
  return REJECT_SELECTOR.test(mapped) ? '' : mapped;
}

// 酒馆美化里的装饰大量写成 var(--xxx)，变量定义通常挂在 :root / body / #chat 上。
// 这些选择器转不到阅读区，但值本身可以直接搬到 .chapter 上，让装饰重新拿到颜色与图片。
function collectCustomProps(css) {
  const vars = new Map();
  const text = String(css || '');
  // 值里可能带 url(...) 或 \A 这类转义换行，先整体吃掉 url(...) 与转义序列，再按分号切分。
  const rule = /--([A-Za-z0-9_-]+)\s*:\s*((?:url\(\s*[^)]*\)|\\.|[^;{}<>\\])+)/gi;
  let match;
  while ((match = rule.exec(text))) {
    let value = match[2].replace(/\/\*[\s\S]*?\*\//g, '').trim();
    if (!value || value.length > 800 || /expression\s*\(/i.test(value)) continue;
    // 字符串引号不配对的变量不能挂出去，否则会把整条样式表拖进字符串里失效。
    const dq = (value.match(/"/g) || []).length;
    const sq = (value.match(/'/g) || []).length;
    if (dq % 2 || sq % 2) continue;
    const important = /!important$/i.test(value);
    if (important) value = value.replace(/!important$/i, '').trim();
    vars.set(`--${match[1]}`, value + (important ? '!important' : ''));
  }
  return vars;
}

// 个别主题的 quotes / content 写法引号嵌套不规范，经解析器重生成后引号不配对，
// 会把整条样式表后面的规则都拖进字符串里失效。这里按顶层规则逐条校验，引号不配对的整条剔除。
function dropBrokenRules(css) {
  const out = [];
  let i = 0;
  const n = css.length;
  while (i < n) {
    let depth = 0, brace = -1, inStr = null, j = i;
    for (; j < n; j++) {
      const ch = css[j];
      if (inStr) { if (ch === '\\') { j++; continue; } if (ch === inStr) inStr = null; continue; }
      if (ch === '"' || ch === "'") { inStr = ch; continue; }
      if (ch === '{') { if (depth === 0) brace = j; depth++; }
      else if (ch === '}') { depth--; if (depth === 0) break; }
    }
    if (brace < 0) { out.push(css.slice(i)); break; }
    const rule = css.slice(i, j + 1);
    const body = css.slice(brace + 1, j);
    const dq = (body.match(/"/g) || []).length;
    const sq = (body.match(/'/g) || []).length;
    if (dq % 2 === 0 && sq % 2 === 0) out.push(rule);
    i = j + 1;
  }
  return out.join('');
}

// 逐条校验：能通过阅读区校验的规则留下，个别过不了（老式转义、奇怪属性）就单条剔除，
// 避免一条坏规则让整套装饰全部作废。
function dropInvalidRules(css) {
  const text = String(css || '');
  if (!text.trim()) return '';
  const kept = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    let depth = 0, inStr = null, j = i, open = -1;
    for (; j < n; j++) {
      const ch = text[j];
      if (inStr) { if (ch === '\\') { j++; continue; } if (ch === inStr) inStr = null; continue; }
      if (ch === '"' || ch === "'") { inStr = ch; continue; }
      if (ch === '{') { if (depth === 0) open = j; depth++; }
      else if (ch === '}') { depth--; if (depth === 0) break; }
    }
    if (open < 0) break;
    const rule = text.slice(i, j + 1).trim();
    if (rule) { try { parseThemeCss(rule); kept.push(rule); } catch { /* 单条坏规则丢弃 */ } }
    i = j + 1;
  }
  return kept.join('\n');
}

// 大份酒馆样式（几百 KB）里绝大多数是界面规则。先按顶层切分，只把可能对应聊天内容的块送去解析，
// 既省掉解析开销，也避免界面规则里的怪写法拖累整份转换。
function prefilterTavernCss(text) {
  const source = String(text || '').replace(/\/\*[\s\S]*?\*\//g, '');
  const hit = /#chat\b|\.mes(?![a-z])|^body\b|\.message\b/i;
  const out = [];
  let i = 0;
  const n = source.length;
  while (i < n) {
    let depth = 0, inStr = null, j = i, open = -1;
    for (; j < n; j++) {
      const ch = source[j];
      if (inStr) { if (ch === '\\') { j++; continue; } if (ch === inStr) inStr = null; continue; }
      if (ch === '"' || ch === "'") { inStr = ch; continue; }
      if (ch === '{') { if (depth === 0) open = j; depth++; }
      else if (ch === '}') { depth--; if (depth === 0) break; }
    }
    if (open < 0) break;
    const rule = source.slice(i, j + 1);
    if (hit.test(rule.slice(0, open)) || /^@media/i.test(rule.trim()) && hit.test(rule)) out.push(rule);
    i = j + 1;
  }
  return out.join('\n');
}

// 「读正文，不读标头」：酒馆美化常把整张角色档案大图挂在 .mes::before 上（铃兰是 350px），
// 搬到阅读区就是每节顶上重复一张横幅，还占掉半屏。这里只摘掉这类带背景图的 ::before 标头条，
// 纸卡、线圈、引用、日期行、竖线这些正文装饰照常保留。
function stripHeaderArt(css) {
  let out = '', i = 0, removed = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open < 0) { out += css.slice(i); break; }
    const selector = css.slice(i, open);
    let depth = 0, end = open;
    for (; end < css.length; end++) {
      const ch = css[end];
      if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (!depth) break; }
    }
    const block = css.slice(open, end + 1);
    const isHeader = /\.chapter\s*::before\s*(?:,|\{)/.test(selector + '{') && /background-image/i.test(block);
    if (isHeader) { removed++; i = end + 1; continue; }
    out += selector + block;
    i = end + 1;
  }
  return { css: out, removed };
}

// 结构级皮肤：不再把酒馆选择器翻译成阅读区选择器，而是保留原始规则，
// 由阅读区直接按 #chat/.mes/.mes_block/.mes_text 这层结构渲染。
// 只留正文相关的顶层规则，摘掉标头大图、聊天部件和会隐藏正文的声明，最后按长度兜底。
export function scopeTavernCss(css, limit = 26000) {
  let source = prefilterTavernCss(css);
  if (!source) return '';
  source = dropChatChrome(source);
  let out = '', i = 0;
  while (i < source.length) {
    const open = source.indexOf('{', i);
    if (open < 0) break;
    const selector = source.slice(i, open);
    let depth = 0, end = open;
    for (; end < source.length; end++) {
      const ch = source[end];
      if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (!depth) break; }
    }
    const block = source.slice(open, end + 1);
    i = end + 1;
    if (/^@/.test(selector.trim())) continue;
    if (/display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0(?!\.)/i.test(block)) continue;
    const sel = selector.replace(/#chat\b/g, '.tavern-chat').trim();
    if (!sel) continue;
    out += `${sel}${block}`;
  }
  if (out.length > limit) {
    const cut = out.slice(0, limit), last = cut.lastIndexOf('}');
    out = last > 0 ? cut.slice(0, last + 1) : '';
  }
  return out;
}

const CHROME_SELECTOR = /\.avatar|\bavatar\b|swipe_|textarea|\bbutton\b|mes_edit|extraMesButtonsHint|mesIDDisplay|tokenCounter|mes_timer|\.name_text/i;

// 酒馆聊天区的按钮、头像、编辑框、楼层号在阅读区本来就不存在，留着只会把 CSS 撑爆、
// 触发长度截断把真正的正文装饰挤掉。这里整条丢掉这些界面部件的规则。
function dropChatChrome(css) {
  let out = '', i = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open < 0) { out += css.slice(i); break; }
    const selector = css.slice(i, open);
    let depth = 0, end = open;
    for (; end < css.length; end++) {
      const ch = css[end];
      if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (!depth) break; }
    }
    if (!CHROME_SELECTOR.test(selector)) out += selector + css.slice(open, end + 1);
    i = end + 1;
  }
  return out;
}

// 把酒馆自定义 CSS 里能对应到阅读区选择器的规则转成主题 CSS；其余界面规则丢弃。
export function convertTavernCss(css, limit = 28000) {
  const warnings = [];
  let source = String(css || '');
  if (!source.trim()) return { css: '', warnings, kept: 0 };
  if (source.length > 60000) source = prefilterTavernCss(source);
  source = source.replace(/@import[^;]*;/gi, '');
  let ast;
  // 酒馆美化里常有浏览器能容忍的小毛病，这里按可恢复方式解析，最后由主题校验兜底。
  try { ast = parse(source, { context: 'stylesheet', parseCustomProperty: true }); }
  catch { return { css: '', warnings: ['原美化 CSS 里有无法解析的写法，已只套用配色与字体。'], kept: 0 }; }
  // 装饰常写成 var(--xxx)：先把所有作用域里的自定义属性收集起来，稍后挂到章节根上，
  // 否则 :root 被丢弃后这些变量全部失效，整套美化就只剩底色和字体。
  const vars = collectCustomProps(source);
  walk(ast, (node, item, list) => {
    if (node.type === 'Atrule' && /^(?:import|charset)$/i.test(node.name)) { list.remove(item); return; }
    if (node.type !== 'Rule' || insideKeyframes(node)) return;
    try {
      const parts = node.prelude?.children?.toArray?.() || [];
      const kept = parts.map(selector => mapSelectorPart(generate(selector))).filter(Boolean);
      if (!kept.length) { list.remove(item); return; }
      node.prelude = parse(kept.join(','), { context: 'selectorList' });
    } catch { list.remove(item); }
  });
  let result = '';
  try { result = generate(ast); } catch { return { css: '', warnings: ['原美化 CSS 转换失败，已只套用配色与字体。'], kept: 0 }; }
  // 逐条校验太贵：整套主题库有几百个，每个主题几百条规则，会在打开美化页时明显卡顿。
  // 改成先整份过校验，过不了才在 dropInvalidRules 里逐条拆，正常主题几乎零额外开销。
  // 阅读区的 HTML 校验不允许尖括号，组合符已在选择器里换成后代选择器。
  result = result.replace(/<\/style/gi, '');
  // 这个 vendor 解析器不暴露声明节点，装饰图只能按生成后的规则文本重新定位：
  // 丢掉角色档案大头图，把聊天标题的线圈改挂到整章顶部，并修正去掉内层包装后残留的空格。
  result = result
    .replace(/\.paragraph::after(?=[^{]*\{[^}]*var\(\s*--coil-url\s*\))/g, '.chapter::after')
    .replace(/\s+::/g, '::')
    // 引号字符装饰在阅读区无关紧要，且是最容易让解析器引号错乱的声明，直接移除。
    .replace(/quotes\s*:[^;}]*/gi, '')
    // 酒馆里那些「只在编辑态显示」的 .mes_text 会带 display:none，搬到阅读区会把正文整段藏掉。
    .replace(/display\s*:\s*none\s*(?:!important)?\s*(?:;|(?=\}))|visibility\s*:\s*hidden\s*(?:!important)?\s*(?:;|(?=\}))|opacity\s*:\s*0\s*(?:!important)?\s*(?:;|(?=\}))?/gi, '')
  ;
  result = dropBrokenRules(result);
  // 整份校验会因个别规则里的怪写法（转义、老式属性）一起失败，退回“只到配色”。
  // 正常能过校验的主题不做逐条拆解，只有整份过不了时才逐条试，坏规则单条剔除。
  const validCss = text => { try { parseThemeCss(text); return true; } catch { return false; } };
  if (!validCss(result)) result = dropInvalidRules(result);
  const header = stripHeaderArt(result);
  result = header.css;
  // 标头大图摘掉后，原美化给头像/头图预留的上百像素还会留在正文上方；把这些间距变量压回正常值。
  if (header.removed) {
    result = `.chapter{--mes-block-padding-top:0px;--header-to-text-distance:0px;--chat-top-padding:24px;--coil-pos-y:-6px}` + result;
  }
  // Case No.13 这类会把整张证据板挂在 .chapter::after 上并铺满整章（inset 全 0），
  // 阅读区里就成了图片压着正文；整条丢掉，只留纸卡本身。
  result = result.replace(/\.chapter::after\{[^}]*(?:inset\s*:\s*0|top\s*:\s*0[^}]*bottom\s*:\s*0)[^}]*\}/gi, '');
  // 酒馆里正文列宽是聊天区的固定像素，搬到阅读区会把一行挤成几个字；改成跟着阅读区走。
  result = `.chapter{--mes-block-width:100%!important;--chat-width:100%!important}` + result;
  result = dropChatChrome(result);
  // 酒馆里 .mes 的百分比内边距是按头像/大图位置算的，搬到阅读区会把正文推到半屏以下，直接归零。
  result = result.replace(/(\.chapter\{)([^}]*)\}/g, (all, head, body) => head + body.replace(/(padding|margin):[^;}]*%/gi, (m, prop) => `${prop}:0`) + '}');
  // 有整幅贴图的主题会把 .chapter 设成透明，正文直接压在图上；Case No.13 这类把证据板挂在
  // .chapter::after 上，也要算进来。给正文补一层半透明纸面，既保留贴图又不影响阅读。
  if (/\.chapter[^{]*\{[^}]*background-image[^}]*url\(/i.test(result) || /\.chapter[^{]*::after[^{]*\{[^}]*background-image/i.test(result)) {
    result += '.paper{position:relative;z-index:1;background:color-mix(in srgb,var(--reader-bg) 90%,transparent);backdrop-filter:blur(2px)}';
  }
  // 变量定义挂在 .chapter 上，正文与小手机章节共用同一套类名，装饰里的 var() 才拿得到值。
  // 个别变量值（非 base64 的 svg data URI 等）通不过主题校验；按单个变量校验，坏变量丢弃，
  // 避免一个坏变量把整套变量定义全部带崩（晨计主题的 5 个 toast 图标变量曾让 82 个变量全部失效）。
  const okVars = new Map();
  for (const [key, value] of vars) {
    try { parseThemeCss(`.chapter{${key}:${value}}`); okVars.set(key, value); } catch { /* 单个坏变量丢弃 */ }
  }
  const varBlock = okVars.size ? `.chapter{position:relative;${[...okVars].map(([key, value]) => `${key}:${value}`).join(';')}}` : '';
  if (varBlock) result = (dropInvalidRules(varBlock) ? varBlock : '') + result;
  if (result.length > limit && varBlock.length <= limit - 60) {
    const cut = result.lastIndexOf('}', limit);
    result = cut > 0 ? result.slice(0, cut + 1) : '';
    warnings.push('原美化 CSS 较长，已按完整规则截取，可在主题里继续精简。');
  } else if (result.length > limit) {
    result = '';
    warnings.push('原美化 CSS 的变量定义过长，已跳过装饰转换，只套用配色与字体。');
  }
  if (result) {
    try { parseThemeCss(result); } catch (e) { return { css: '', warnings: [...warnings, '转换出的装饰样式未通过校验：' + (e?.message || '').slice(0, 120)], kept: 0 }; }
  }
  const kept = (result.match(/\}/g) || []).length;
  if (!kept) warnings.push('这份美化主要写的是酒馆界面，没有可套用到阅读区的规则，已只套用配色与字体。');
  return { css: result, warnings, kept };
}

const name = raw => String(raw?.name || raw?.display_name || '酒馆美化').replace(/[<>]/g, '').trim().slice(0, 40) || '酒馆美化';

// 识别 SillyTavern 主题／美化 JSON（带颜色字段或 custom_css，而不是瞬息自己的 tokens 格式）。
export function isTavernThemeJson(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  if (raw.tokens || raw.format === 'shunxi-reading-themes') return false;
  return typeof raw.custom_css === 'string' || typeof raw.main_text_color === 'string' || typeof raw.blur_tint_color === 'string';
}

export function convertTavernTheme(raw, mode = 'prose', { withCss = false } = {}) {

  // 转换出来的装饰样式必须能通过瞬息自己的主题校验，通不过就只保留配色。
  const verify = css => {
    try { compileThemeCss(css, tokens.fontFamily); return true; } catch { return false; }
  };
  const ink = parseColor(raw.main_text_color), tint = parseColor(raw.blur_tint_color), chatTint = parseColor(raw.chat_tint_color);
  // 半透明的 chat 底色要压在不透明的 tint 上，而不是按文字明暗去猜黑白：
  // Case No.13 的文字是 173 灰、chat 底色是白色 50%，以前会压成中灰，正文看起来就“不是那套”。
  const under = tint && tint.a > 0.95 ? tint : (ink && luminance(ink) > 0.5 ? { r: 0, g: 0, b: 0, a: 1 } : { r: 255, g: 255, b: 255, a: 1 });
  const paper = flatten(chatTint && chatTint.a > 0.05 ? chatTint : tint, under);
  const tokens = {};
  if (paper) tokens.background = cssColor(paper);
  let foreground = ink ? flatten(ink, paper) : null;
  // 主题的正文色在酒馆里有壁纸和模糊层垫着，搬到纯色纸面上可能变成浅灰压浅灰；对比不足时回退到黑白。
  if (foreground && paper && contrastRatio(foreground, paper) < 3.6) {
    const dark = { r: 43, g: 43, b: 43, a: 1 }, light = { r: 242, g: 242, b: 242, a: 1 };
    foreground = contrastRatio(dark, paper) >= contrastRatio(light, paper) ? dark : light;
  }
  if (foreground) tokens.color = cssColor(foreground);
  const own = parseColor(raw.user_mes_blur_tint_color), other = parseColor(raw.bot_mes_blur_tint_color);
  // 夜间主题的气泡色叠到浅色底上会变成白底白字，所以先校验对比度，不合格就用正文色相对纸面推一档气泡色。
  const textColor = foreground || flatten(ink || under, paper);
  const toneBubble = (weight, fallbackPaper) => {
    const base = paper || fallbackPaper;
    const target = textColor && luminance(textColor) > 0.5 ? { r: 0, g: 0, b: 0, a: 1 } : { r: 255, g: 255, b: 255, a: 1 };
    return cssColor(flatten(mixChannels(base, target, weight), base));
  };
  const bubbleToken = (color, weight) => {
    const flat = color && color.a > 0.05 ? flatten(color, paper) : null;
    if (flat && textColor && contrastRatio(flat, textColor) >= 3) return cssColor(flat);
    return toneBubble(weight, { r: 249, g: 248, b: 246, a: 1 });
  };
  if (paper && textColor) {
    tokens.bubble = bubbleToken(other, 0.09);
    tokens.ownBubble = bubbleToken(own, 0.17);
  }
  const scale = Number(raw.font_scale);
  if (Number.isFinite(scale) && scale > 0 && scale <= 2 && mode === 'prose') tokens.fontSize = `${clamp(Math.round(17 * scale), 11, 22)}px`;
  const warnings = [];
  let css = '';
  const accent = [];
  const quote = parseColor(raw.quote_text_color), italic = parseColor(raw.italics_text_color);
  if (quote && paper) accent.push(`--prose-quote-color:${cssColor(flatten(quote, paper))}`);
  if (italic && paper) accent.push(`--prose-em-color:${cssColor(flatten(italic, paper))}`);
  if (withCss && typeof raw.custom_css === 'string') {
    const converted = convertTavernCss(raw.custom_css);
    warningPush(warnings, converted.warnings);
    css = converted.css;
  }
  if (accent.length) css = `${mode === 'phone' ? '.phone-chapter' : '.prose-chapter'}{${accent.join(';')}}${css}`;
  if (css && !verify(css)) {
    css = accent.length ? `${mode === 'phone' ? '.phone-chapter' : '.prose-chapter'}{${accent.join(';')}}` : '';
    warnings.push('转换出来的装饰样式没有通过校验，已只套用配色、字体与强调色。');
  }
  return { name: name(raw), mode, tokens, css, warnings };
}
const warningPush = (list, items) => { for (const item of items || []) if (item && !list.includes(item)) list.push(item); };
