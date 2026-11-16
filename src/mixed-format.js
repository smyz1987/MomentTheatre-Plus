// 混合番外：正文、小手机与网页卡片在同一节内任意穿插。
// 这一段只做纯文本分节，不接触 DOM，渲染仍交给原有的正文／小手机／卡片流程。

const PHONE_OPEN = /<\s*小手机\s*>/i;
const PHONE_CLOSE = /<\s*\/\s*小手机\s*>/i;
// 网页卡片使用 <瞬息-html>，同时兼容模型常见的几种写法。
const HTML_OPEN = /<\s*(?:瞬息[-_]?html|shunxi[-_]?html|网页卡片|html卡片)\s*>/i;
const HTML_CLOSE = /<\s*\/\s*(?:瞬息[-_]?html|shunxi[-_]?html|网页卡片|html卡片)\s*>/i;

export const MIXED_MARKERS = { phone: '<小手机>', html: '<瞬息-html>' };
export const MIXED_HTML_PLACEHOLDER = '（此处是一张已渲染的网页卡片，内容从略）';
// 保护上限：一节里最多渲染这么多张卡片，避免长番外把阅读区拖慢。
export const MIXED_CAPS = { blocks: 12, blockChars: 60000, totalHtmlChars: 240000 };

const countText = text => Array.from(String(text || '').replace(/[^\p{L}\p{N}]/gu, '')).length;
const trimBlock = text => String(text || '').replace(/^\s*\n/, '').replace(/\n\s*$/, '');

// 返回按出现顺序排列的分段：[{ kind: 'prose' | 'phone' | 'html', text, closed }]
export function parseMixed(content) {
  const source = String(content ?? '');
  const segments = [];
  const push = (kind, text, closed = true) => {
    if (!text) return;
    const last = segments.at(-1);
    if (last && last.kind === 'prose' && kind === 'prose') { last.text += text; return; }
    segments.push({ kind, text, closed });
  };
  let cursor = 0;
  while (cursor < source.length) {
    const rest = source.slice(cursor);
    const phone = PHONE_OPEN.exec(rest), html = HTML_OPEN.exec(rest);
    const candidates = [];
    if (phone) candidates.push({ kind: 'phone', at: cursor + phone.index, width: phone[0].length });
    if (html) candidates.push({ kind: 'html', at: cursor + html.index, width: html[0].length });
    if (!candidates.length) { push('prose', rest); break; }
    candidates.sort((a, b) => a.at - b.at);
    const next = candidates[0];
    push('prose', source.slice(cursor, next.at));
    const start = next.at + next.width, tail = source.slice(start);
    const close = (next.kind === 'phone' ? PHONE_CLOSE : HTML_CLOSE).exec(tail);
    const end = close ? start + close.index : source.length;
    push(next.kind, trimBlock(source.slice(start, end)), Boolean(close));
    cursor = close ? start + close.index + close[0].length : source.length;
  }
  return segments;
}

export const hasMixedBlocks = content => parseMixed(content).some(segment => segment.kind !== 'prose');

// 混合番外的字数按“可读文字”估算：网页卡片里的样式与标签不算，小手机里的对话文字算。
export function mixedWordCount(content) {
  return parseMixed(content).reduce((total, segment) => {
    if (segment.kind === 'html') return total;
    return total + countText(segment.kind === 'phone' ? segment.text.replace(/^\s*\[[^\]]*\]\s*/gm, '') : segment.text);
  }, 0);
}

// 续写与摘要请求只需要知道“这一节发生过什么”，不需要整段卡片 HTML。
export function stripMixedForHistory(content, max = 200000) {
  const parts = parseMixed(content).map(segment => {
    if (segment.kind === 'html') return MIXED_HTML_PLACEHOLDER;
    if (segment.kind === 'phone') return `${MIXED_MARKERS.phone}\n${segment.text.slice(0, 8000)}\n</小手机>`;
    return segment.text;
  });
  const joined = parts.join('\n\n');
  return joined.length > max ? joined.slice(0, max) + '\n…（后文已省略）' : joined;
}

export function mixedStats(content) {
  const segments = parseMixed(content);
  return {
    prose: segments.filter(s => s.kind === 'prose').length,
    phones: segments.filter(s => s.kind === 'phone').length,
    cards: segments.filter(s => s.kind === 'html').length,
  };
}

// 渲染前先按上限裁剪卡片，避免异常回复堆积成大量 iframe。
export function readableMixedSegments(content) {
  const segments = parseMixed(content);
  let blocks = 0, htmlChars = 0;
  return segments.flatMap(segment => {
    if (segment.kind !== 'html') return [segment];
    if (blocks >= MIXED_CAPS.blocks || htmlChars >= MIXED_CAPS.totalHtmlChars) return [{ kind: 'overflow', text: '' }];
    const text = segment.text.slice(0, MIXED_CAPS.blockChars);
    blocks++, htmlChars += text.length;
    return [{ ...segment, text }];
  });
}

// 模型写的网页卡片一律按静态装饰处理：剥离脚本、内嵌框架、表单与事件属性，
// 卡片本身仍跑在单独的沙箱 iframe 里，双重拦截。
const BLOCKED_TAGS = 'script|iframe|object|embed|applet|frame|frameset|form|input|button|textarea|select|link|meta|base|noscript';
export function sanitizeCardHtml(html) {
  let out = String(html ?? '');
  out = out.replace(/<!doctype[^>]*>/gi, '').replace(/<\/?(?:html|head|body|main)[^>]*>/gi, '');
  out = out.replace(new RegExp(`<(${BLOCKED_TAGS})\\b[\\s\\S]*?<\\/\\1>`, 'gi'), '');
  out = out.replace(new RegExp(`<\\/?(${BLOCKED_TAGS})\\b[^>]*>`, 'gi'), '');
  out = out.replace(/\son[a-z-]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  out = out.replace(/\b(href|src|action|formaction)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, (match) => /javascript\s*:/i.test(match) ? '' : match);
  out = out.replace(/@import[^;]*;/gi, '');
  return out.trim();
}
