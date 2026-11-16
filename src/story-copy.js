// 番外复制：一种给“读”的纯文本，一种给“用”的完整源码（保留 <小手机> / <瞬息-html> 标记）。
import { parsePhoneReport } from './phone-format.js';
import { parseMixed } from './mixed-format.js';

const names = story => ({ character: story.snapshot?.character?.name, persona: story.snapshot?.persona?.name });
const cleanProse = text => String(text || '')
  .replace(/<shunxi-title>[\s\S]*?<\/shunxi-title>/gi, '')
  .replace(/<[^>]*>/g, '')
  .replace(/[*~]{2}/g, '')
  .replace(/[ \t]+\n/g, '\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

function senderLabel(message) {
  if (message.sender === 'system') return '系统';
  if (message.sender === 'user') return '你';
  return message.speaker || message.groupMembers?.[message.sender] || '对方';
}

function messageLine(message) {
  const body = String(message.text || '').trim();
  switch (message.type) {
    case 'voice': return `${senderLabel(message)}：${body ? `（语音 ${message.duration || ''}）${body}` : `（语音 ${message.duration || ''}）`}`;
    case 'image': return `${senderLabel(message)}：[图片]${body}`;
    case 'sticker': return `${senderLabel(message)}：[表情]${body || message.sticker || ''}`;
    case 'transfer': return `${senderLabel(message)}：[转账 ¥${message.amount || ''}]${body}`;
    case 'location': return `${senderLabel(message)}：[定位]${message.title || body}${message.address ? ' · ' + message.address : ''}`;
    case 'share': return `${senderLabel(message)}：[分享]${message.title || body}${message.source ? ' · ' + message.source : ''}`;
    case 'call':
    case 'video': return `${senderLabel(message)}：[${message.type === 'call' ? '语音' : '视频'}通话 ${message.status || ''}${message.duration ? ' ' + message.duration : ''}]`;
    case 'retract': return `${senderLabel(message)}：撤回了一条消息${body ? `（原内容：${body}）` : ''}`;
    default: return `${senderLabel(message)}：${body}`;
  }
}

function phonePlainText(content, story) {
  let messages = [];
  try { messages = parsePhoneReport(content, names(story)).messages || []; } catch { messages = []; }
  if (!messages.length) return cleanProse(content);
  const lines = [];
  let group = null;
  for (const message of messages) {
    const current = message.group || '';
    if (current !== group) { if (current) lines.push(`【${current}】`); group = current; }
    lines.push(messageLine(message));
  }
  return lines.join('\n').trim();
}

// 网页卡片在纯文本里只留可读文字，避免把样式整段粘出去。
function htmlPlainText(html) {
  // 先去掉脚本与样式，避免把代码当成正文带出去。
  const source = String(html || '').replace(/<(?:script|style|template)\b[\s\S]*?<\/(?:script|style|template)>/gi, '');
  if (typeof DOMParser === 'function') {
    try {
      const doc = new DOMParser().parseFromString(source, 'text/html');
      return (doc.body?.textContent || '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    } catch { /* Fall through to the plain strip below. */ }
  }
  return cleanProse(source);
}

export function chapterPlainText(chapter, story) {
  const mode = chapter?.mode || story?.mode || 'prose';
  const content = chapter?.content || '';
  if (mode === 'phone') return phonePlainText(content, story);
  if (mode === 'html') return htmlPlainText(content);
  if (mode === 'mixed') {
    return parseMixed(content).map(segment => {
      if (segment.kind === 'phone') return phonePlainText(segment.text, story);
      if (segment.kind === 'html') return htmlPlainText(segment.text);
      return cleanProse(segment.text);
    }).filter(Boolean).join('\n\n');
  }
  return cleanProse(content);
}

export function chapterSourceText(chapter, story) {
  const mode = chapter?.mode || story?.mode || 'prose';
  const content = String(chapter?.content || '');
  if (mode === 'phone') return content.trim() ? `<小手机>\n${content.trim()}\n</小手机>` : '';
  return content.trim();
}

export function storyPlainText(story, { all = true, chapterIndex = 0 } = {}) {
  const chapters = all ? story.chapters : [story.chapters[chapterIndex]].filter(Boolean);
  const body = chapters.map(chapter => chapterPlainText(chapter, story)).filter(Boolean).join('\n\n');
  if (!body) return story.title || '';
  return all ? `${story.title}\n\n${body}` : body;
}

export function storySourceText(story, { all = true, chapterIndex = 0 } = {}) {
  const chapters = all ? story.chapters : [story.chapters[chapterIndex]].filter(Boolean);
  return chapters.map(chapterSourceText_pick => chapterSourceText(chapterSourceText_pick, story)).filter(Boolean).join('\n\n');
}
