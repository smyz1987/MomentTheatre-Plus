import { cardToken, cardFrame, readerBridge } from './regex-card.js';
import { mergePhoneAppearance, phoneAppearance } from './phone-appearance.js';
import { builtInSticker, STICKER_URLS, phoneIcon, phoneFilledIcon, virtualMap } from './phone-assets.js';
import { PHONE_CSS } from './phone-style.js';
import { PROSE_CSS } from './prose.js';
import { compileThemeCss, trimFonts } from './theme-css.js';
import { scopeCss } from './scope-css.js';
import { renderRegexProse } from './preset-regex.js';
import { emptyProseIssue, originalProse } from './prose-diagnostics.js';
import { effectiveFont, tavernFontLinks } from './tavern-look.js';
import { readableMixedSegments, sanitizeCardHtml, hasMixedBlocks, normalizeCustomCards, MIXED_CAPS } from './mixed-format.js';

// 阅读区里 CSS 的 background-image 拿不到酒馆美化的装饰图（沙箱文档会忽略这类外部/内联图），
// 所以把主题里的线圈单独取出来，用真正的 <img> 放进章节，跟着主题变量定位。
function themeImage(themeCss, name) {
  const match = String(themeCss || '').match(new RegExp(`--${name}:\\s*url\\((?:'|")?([^'")]+)`, 'i'));
  return match ? match[1].trim() : '';
}

// 主题的 body / #chat 底色会被转换到 .chapter 上。阅读区把同一个纯色再铺到整页，
// 放大或全屏时章节两侧才是同一块聊天底色，而不是面板的白底。
// 半透明底色（如夜间主题的 rgba(0,0,0,.35)）在沙箱里没有壁纸可叠，按原色不透明铺开。
function solidColor(value) {
  const text = String(value || '').replace(/!important/i, '').trim();
  if (!text || /^(?:transparent|none|inherit|initial|unset|currentcolor)$/i.test(text)) return '';
  if (/url\(|gradient|image-set|var\(/i.test(text)) return '';
  const hex = text.match(/^#(?:[0-9a-f]{3,8})$/i);
  if (hex) {
    const digits = text.slice(1);
    if (digits.length === 4) return '#' + digits.slice(0, 3);
    if (digits.length === 8) return '#' + digits.slice(0, 6);
    return text.toLowerCase();
  }
  const rgb = text.match(/^rgba?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)\s*[,\s]\s*([\d.]+)/i);
  if (rgb) return `rgb(${Math.round(+rgb[1])}, ${Math.round(+rgb[2])}, ${Math.round(+rgb[3])})`;
  const hsl = text.match(/^hsla?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)%\s*[,\s]\s*([\d.]+)%/i);
  if (hsl) return `hsl(${Math.round(+hsl[1])}, ${Math.round(+hsl[2])}%, ${Math.round(+hsl[3])}%)`;
  return /^[a-z]{3,20}$/i.test(text) ? text : '';
}
function pageBackground(themeCss) {
  const text = String(themeCss || '');
  const pick = test => {
    let found = '';
    for (const rule of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const parts = rule[1].split(',').map(part => part.trim()).filter(Boolean);
      if (!parts.length || parts.some(part => !test(part))) continue;
      const declaration = rule[2].match(/background(?:-color)?\s*:\s*([^;}]+)/i);
      if (!declaration) continue;
      const color = solidColor(declaration[1]);
      if (color) found = color;
    }
    return found;
  };
  return pick(part => /^\.chapter(?:\.(?:prose-chapter|phone-chapter|mixed-chapter))?$/.test(part))
    || pick(part => /^body$/i.test(part))
    || '';
}

export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export { PHONE_TYPES, parsePhone } from './phone-format.js';
import { parsePhone, resolveMessageStickers } from './phone-format.js';
// 混合章节里正文与小手机交替出现，需要一点点间距与居中，不改变原有正文样式。
const MIXED_READER_CSS = '.mixed-chapter{padding-bottom:10px}.mixed-phone{display:flex;justify-content:center;margin:26px 0}.mixed-phone .phone{margin:0 auto}.mixed-card{margin:26px 0}.mixed-card .regex-card,.mixed-card iframe{width:100%}.mixed-chapter .paragraph{margin:0 0 1em}';
export function safeImage(value) {
  try { const u = new URL(value); return ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password || /^data:image\/(png|jpeg|gif|webp);base64,/i.test(value) ? value : ''; } catch { return ''; }
}
// 繁体中文指示字（这些字形在简体里写作另一形）与简体指示字，用于判定"非简体中文"行。
const TRADITIONAL_CHARS = '們個學會來時說對開關門長東車馬鳥雲語書體點華萬與專業區處備復豐嚴廳愛寶護發應誰親錢後裡認識關係覺得準動檢歷買賣張讓證據轉廢廣帶幫幹幾從憂藝藥虧無聲為願顯聽舊葉齊龍飛貴費樂標機構樣歲歡';
const SIMPLIFIED_CHARS = '们个学会来时说对开关门长东车马鸟云语书体点华万与专业区处备复丰严厅爱宝护发应谁亲钱后里认关系觉得准动检历买卖张让证转废广带帮干从忧艺药亏无为声愿显听旧叶齐龙飞贵费乐标机构样岁欢';
export function isForeignLine(line) {
  const text = String(line ?? '');
  if (!text.trim()) return false;
  // 韩文／日文假名／西里尔文出现即为外语。
  if (/[\uAC00-\uD7AF\u3040-\u30FF\u31F0-\u31FF\u0400-\u04FF]/.test(text)) return true;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  const han = (text.match(/[\u3400-\u9fff\uf900-\ufaff]/g) || []).length;
  // 拉丁字母成词且不亚于汉字（"I love you"），视为外语；"加了AKB48很好玩"不算。
  if (latin >= 2 && latin >= han) return true;
  const trad = [...TRADITIONAL_CHARS].filter(c => text.includes(c)).length;
  const simp = [...SIMPLIFIED_CHARS].filter(c => text.includes(c)).length;
  // 繁体指示字出现而简体指示字没有，视为繁体（=外语）。
  return trad >= 1 && trad > simp;
}
function phoneHtml(messages, characterName, appearance, chapterNumber, layout = 'classic', charHandle = '', options = {}) {
  const look = phoneAppearance(appearance);
  const group = messages[0]?.group || '', label = messages[0]?.label || '';
  characterName = group || look.remark || label || characterName;
  const skin = ['guardian', 'wechat', 'qq'].includes(layout) ? layout : '';
  // 头像来源优先级：自选头像 > 酒馆头像（美化页可关）> 默认占位；群聊对方用首字头像。
  const tavern = options.tavernAvatars || {};
  const userSrc = look.userAvatar || (look.useTavernAvatar ? String(tavern.user || '') : '');
  const charSrc = look.charAvatar || (look.useTavernAvatar && !group ? String(tavern.char || '') : '');
  const escAttr = url => url.replace(/[\"\\<>]/g, c => '\\' + c.charCodeAt(0).toString(16) + ' ');
  // Large data URLs can exceed the browser's custom-property value limit.
  // One scoped image declaration per side avoids that limit and duplication per message.
  const avatars = [['.own', userSrc], [':not(.own)', charSrc]].filter(([, url]) => url).map(([side, url]) => `${group ? '.phone.phone-group' : '.phone:not(.phone-group)'} .message${side} .message-avatar{background-image:url("${escAttr(url)}")!important}`).join('');
  const skinBgRules = [];
  // 顶栏头像跟随同一来源（群聊保持群名，不覆盖）。
  if (!group && charSrc) skinBgRules.push(`.phone .skin-header .header-avatar{background-image:url("${escAttr(charSrc)}")!important}`);
  // 梦境白磨砂浓度滑杆与低性能模式：通过 CSS 变量传给主题。
  if (skin === 'guardian') {
    const vars = [];
    if (look.frost) vars.push(`--skin-frost:${look.frost}`);
    if (look.perf) vars.push('--skin-filter:none');
    if (vars.length) skinBgRules.push(`.phone{${vars.join(';')}}`);
  }
  // 用户自选背景：Guardian 系覆盖装饰层（并隐藏默认水印装饰），其余皮肤覆盖屏幕背景。
  if (look.background) {
    const bg = look.background.replace(/["\\<>]/g, c => '\\' + c.charCodeAt(0).toString(16) + ' ');
    if (skin === 'guardian') {
      skinBgRules.push(`.phone .phone-screen::before{background-image:url("${bg}")!important;background-size:cover!important;background-position:center!important;background-repeat:no-repeat!important}`);
      skinBgRules.push(`.phone .phone-screen::after{display:none!important}`);
    } else {
      skinBgRules.push(`.phone .phone-screen{background-image:url("${bg}")!important;background-size:cover!important;background-position:center!important;background-repeat:no-repeat!important}`);
      skinBgRules.push(`.phone .messages{background:transparent!important}`);
    }
  }
  const skinOverrides = `${avatars || skinBgRules.length ? `<style>${scopeChapterCss([...(avatars ? [avatars] : []), ...skinBgRules], chapterNumber)}</style>` : ''}`;
  const clock = messages.find(m => m.time)?.time?.match(/\d{1,2}:\d{2}/)?.[0] || '09:41';
  // 皮肤标题栏：Guardian 是居中标题＋花体副题＋定位图标；微信是返回＋头像＋名字＋通话图标；
  // QQ 是返回＋头像＋名字＋@句柄，右侧两套图标由主题 CSS 决定显示哪一套。
  const header = !skin
    ? `<div class="phone-header" style="display:grid!important;grid-template-columns:24px minmax(0,1fr) 24px!important;column-gap:8px!important;padding-inline:17px!important;direction:ltr!important"><span class="phone-back" aria-hidden="true" style="grid-column:1!important;grid-row:1!important;text-align:left!important">‹</span><div class="phone-contact" style="grid-column:2!important;grid-row:1!important;text-align:center!important;min-width:0!important;width:100%!important;margin-inline:0!important;position:static!important;transform:none!important" title="${escapeHtml(characterName)}">${escapeHtml(characterName)}</div></div>`
    : skin === 'guardian'
      ? `<div class="phone-header skin-header skin-guardian-header"><span class="phone-back" aria-hidden="true">${phoneIcon('back')}</span><div class="phone-contact-wrap"><div class="phone-contact" title="${escapeHtml(characterName)}">${escapeHtml(characterName)}</div><div class="phone-subtitle">Own the moment</div></div><span class="header-icon" aria-hidden="true">${phoneFilledIcon('pin-orbit-f')}</span></div>`
      : skin === 'wechat'
        ? `<div class="phone-header skin-header skin-wechat-header"><span class="phone-back" aria-hidden="true">${phoneIcon('back')}</span><span class="header-avatar" aria-hidden="true"></span><div class="phone-contact" title="${escapeHtml(characterName)}">${escapeHtml(characterName)}</div><span class="header-icons" aria-hidden="true">${phoneFilledIcon('call-f')}${phoneFilledIcon('video-f')}</span></div>`
        : `<div class="phone-header skin-header skin-qq-header"><span class="phone-back" aria-hidden="true">${phoneIcon('back')}</span><span class="header-avatar" aria-hidden="true"></span><div class="phone-contact-wrap"><div class="phone-contact" title="${escapeHtml(characterName)}">${escapeHtml(characterName)}</div><div class="phone-subtitle">@${escapeHtml(charHandle || characterName)}</div></div><span class="header-icons icons-alt" aria-hidden="true">${phoneIcon('wifi')}${phoneIcon('gear')}</span><span class="header-icons icons-main" aria-hidden="true">${phoneFilledIcon('call-f')}${phoneFilledIcon('video-f')}</span></div>`;
  // 皮肤装饰底栏。
  const footer = !skin
    ? `<div class="phone-footer" aria-hidden="true"><span class="phone-input"></span>${phoneIcon('plus')}</div>`
    : skin === 'guardian'
      ? `<div class="phone-footer skin-footer" aria-hidden="true"><span class="footer-caption">: loves</span><span class="phone-input"></span><span class="footer-caption">letter</span></div>`
      : skin === 'wechat'
        ? `<div class="phone-footer skin-footer" aria-hidden="true">${phoneFilledIcon('camera-f')}${phoneFilledIcon('image-f')}${phoneIcon('mic')}<span class="phone-input"><span class="footer-emoji">${phoneFilledIcon('emoji-f')}</span></span>${phoneFilledIcon('thumb-f')}</div>`
        : `<div class="phone-footer skin-footer" aria-hidden="true"><span class="footer-set footer-set-mono" aria-hidden="true">${phoneFilledIcon('pin-f')}${phoneFilledIcon('image-slim')}${phoneFilledIcon('camera-f')}</span><span class="footer-set footer-set-main" aria-hidden="true">${phoneFilledIcon('camera-f')}${phoneFilledIcon('image-slim')}${phoneFilledIcon('mic-f')}</span><span class="phone-input"><span class="footer-burst">${phoneIcon('burst')}</span><span class="footer-emoji">${phoneFilledIcon('emoji-f')}</span></span><span class="footer-voice">${phoneFilledIcon('mic-holder')}</span><span class="footer-thumb">${phoneFilledIcon('thumb-f')}</span></div>`;
  return `${skinOverrides}<div class="phone${group ? ' phone-group' : ''}${skin ? ' phone-skin-' + skin : ''}"><div class="phone-screen"><div class="phone-status"><span>${escapeHtml(clock)}</span><span class="phone-island" aria-hidden="true"></span><span class="phone-battery" aria-hidden="true"><i></i></span></div>${header}<div class="messages" tabindex="0" role="region" aria-label="手机消息，可在屏幕内滚动">${messages.map((m, index) => {
    const senderName = m.sender === 'user' ? '你' : m.sender === 'system' ? '系统' : m.speaker || '角色';
    const body = escapeHtml(m.text);
    let inner = body;
    // 对方说外语（韩/日/俄文、拉丁字母、繁体中文）时的"翻译版本"格式，三种皮肤通用：
    // 外文原文行 → 虚线分隔 → 简体中文译文行；纯简体输出不出现分隔。
    // 微信皮肤另外把「开头的旁白行降为灰色小字。
    if (m.sender !== 'user' && m.type === 'text') {
      let prevForeign = false;
      inner = m.text.split('\n').map(line => {
        const trimmed = line.trim();
        const narration = /^[「『]/.test(trimmed);
        const foreign = isForeignLine(line);
        const dashed = !narration && !foreign && prevForeign && trimmed ? '<span class="foreign-dash"></span>' : '';
        prevForeign = foreign;
        if (narration) return dashed + `<span class="narration-line">${escapeHtml(line)}</span>`;
        if (dashed) return dashed + `<span class="translate-line">${escapeHtml(line)}</span>`;
        return dashed + `<span class="foreign-line">${escapeHtml(line)}</span>`;
      }).join('\n');
    }
    if (m.type === 'voice') inner = `<details class="voice"><summary class="voice-bar"><span class="voice-wave" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span>${escapeHtml(m.duration || '语音')}</span><span class="voice-hint"><span class="voice-closed">转文字</span><span class="voice-open">收起</span></span></summary><div class="voice-transcript">${body || '暂无转写文字'}</div></details>`;
    if (m.type === 'transfer') inner = `<div class="transfer-card"><div class="transfer-main">${phoneIcon('transfer')}<div><strong style="--amount-size:${Math.max(11, Math.min(16, Math.floor(160 / (m.amount.length + 1))))}px">${escapeHtml(/^[¥￥$€£]/.test(m.amount) ? m.amount : '￥' + m.amount)}</strong><span>${escapeHtml(m.status || '待收款')}</span></div></div>${body ? `<p class="transfer-note">${body}</p>` : ''}<div class="transfer-foot">转账</div></div>`;
    if (m.type === 'image') {
      const src = safeImage(m.url);
      inner = src ? `<img class="message-image" src="${escapeHtml(src)}" alt="${body || '图片'}" loading="lazy" referrerpolicy="no-referrer">` : `<div class="image-description">${phoneIcon('image')}<span>${body || '一张图片'}</span></div>`;
    }
    if (m.type === 'sticker') {
      const key = m.sticker || m.text, src = safeImage(m.url || STICKER_URLS[key]);
      inner = src ? `<img class="sticker-image" src="${escapeHtml(src)}" alt="${body || '表情包'}" loading="lazy" referrerpolicy="no-referrer">` : `<div class="sticker-built-in" role="img" aria-label="${escapeHtml(m.text || key || '表情包')}">${builtInSticker(key) || `<span class="sticker-fallback">${body || escapeHtml(key) || '表情包'}</span>`}</div>`;
    }
    if (m.type === 'location') inner = `<div class="location-card"><div class="location-caption"><strong>${escapeHtml(m.title || m.text || '虚拟定位')}</strong><small>${escapeHtml(m.address || '虚拟地点')}</small></div>${virtualMap()}</div>`;
    if (m.type === 'share') {
      const thumb = safeImage(m.thumbnail);
      inner = `<div class="share-card"><strong>${escapeHtml(m.title || '网页分享')}</strong><div class="share-description"><span>${escapeHtml(m.description || m.text)}</span>${thumb ? `<img src="${escapeHtml(thumb)}" alt="分享缩略图" loading="lazy" referrerpolicy="no-referrer">` : `<span class="share-thumbnail">${phoneIcon('share')}</span>`}</div><div class="share-source">${phoneIcon('share')}<span>${escapeHtml(m.source || '网页分享')}</span></div></div>`;
    }
    if (['call', 'video'].includes(m.type)) inner = `<span class="call-record">${phoneIcon(m.type)}<span>${escapeHtml(m.status && m.status !== '发起' ? m.status : '发起')}${m.type === 'call' ? '语音' : '视频'}通话${m.duration ? ' · ' + escapeHtml(m.duration) : ''}</span></span>`;
    if (m.type === 'retract') inner = `<div class="retracted-message"><span class="retract-notice">${escapeHtml(group ? senderName : m.sender === 'user' ? '你' : '对方')}撤回了一条消息</span><span class="retract-original">${body}</span></div>`;
    if (group && m.sender === 'system') return `<div class="group-event">${inner}${m.time ? `<time class="message-time">${escapeHtml(m.time)}</time>` : ''}</div>`;
    // 皮肤聊天区：微信在会话开头和间隔 5 分钟以上时显示居中分隔行（对齐示意图顶部的
    // 「周日 16:50」）；Guardian 只在真正的间隔处显示分隔行；QQ 不显示时间戳，
    // 只在我方消息下显示"已读"。
    const toMin = t => { const mm = t?.match(/(\d{1,2}):(\d{2})/); return mm ? +mm[1] * 60 + +mm[2] : null; };
    const curMin = toMin(m.time), prevMin = toMin(messages[index - 1]?.time);
    let gap = curMin !== null && prevMin !== null ? curMin - prevMin : null;
    if (gap !== null && gap < 0) gap += 1440;
    const showDivider = curMin !== null && (skin === 'wechat' ? prevMin === null || gap >= 5 : prevMin !== null && gap >= 5);
    const divider = (skin === 'wechat' || skin === 'guardian') && showDivider ? `<div class="time-divider">${escapeHtml(m.time)}</div>` : '';
    const lastOfRun = messages[index + 1]?.sender !== m.sender || (messages[index + 1]?.group || '') !== (m.group || '');
    const firstOfRun = (messages[index - 1]?.sender || '') !== m.sender || (messages[index - 1]?.group || '') !== (m.group || '');
    // Guardian 的已读回执带原始时间（时间加粗），QQ 只写"已读"且只出现在我方消息组末尾。
    const receipt = skin === 'guardian' && m.sender === 'user' && lastOfRun ? `<span class="read-receipt">${m.time ? `<b>${escapeHtml(m.time)}</b> ` : ''}已读</span>` : skin === 'qq' && m.sender === 'user' && lastOfRun ? `<span class="read-receipt">已读</span>` : '';
    const inlineTime = skin === 'guardian' && m.type === 'text' && m.time ? `<time class="bubble-time">${escapeHtml(m.time)}</time>` : '';
    const belowTime = m.time && !inlineTime && (!skin || skin === 'guardian') ? `<time class="message-time">${escapeHtml(m.time)}</time>` : '';
    // 微信风格里对方文本消息没有气泡，只是带下划线的原文（示意图中的外文原文格式）。
    const bubbleCls = skin === 'wechat' && m.sender !== 'user' && (m.type || 'text') === 'text' ? 'bubble plain' : 'bubble';
    // 引用回复：微信是「丨 名字：内容」竖线引用、QQ 是弯箭头小字，两种皮肤都放在
    // 消息下方（对照示意图）；QQ 引用行同时携带箭头与「〞」两种符号，由配色主题决定显示哪个。
    const replyText = m.reply ? escapeHtml(m.reply) : '';
    // 经典皮肤（无皮肤）的引用行：朴素「名字：内容」灰字。
    const quoteClassic = !skin && m.reply ? `<span class="quote-line">${escapeHtml(m.replyName || (m.sender === 'user' ? characterName : '你'))}：${replyText}</span>` : '';
    const quoteWechat = skin === 'wechat' && m.reply ? `<span class="quote-line quote-wechat">${escapeHtml(m.replyName || (m.sender === 'user' ? characterName : '你'))}：${replyText}</span>` : '';
    const quoteQq = skin === 'qq' && m.reply ? `<span class="quote-line quote-qq"><span class="quote-text">${replyText}</span><span class="quote-mark" aria-hidden="true">〞</span><span class="quote-arrow" aria-hidden="true">${phoneFilledIcon('reply-f')}</span></span>` : '';
    const nameAvatar = group && m.sender !== 'user';
    const hue = Array.from(senderName).reduce((hash, char) => (hash * 31 + char.codePointAt(0)) % 360, 0);
    // 同组连续消息：cont=与上一条同发送者，tail=与下一条同发送者（气泡衔接角收小用）。
    const prevSame = (messages[index - 1]?.sender || '') === m.sender && (messages[index - 1]?.group || '') === (m.group || '') && index > 0;
    const cont = prevSame ? ' cont' : '';
    const tail = lastOfRun ? '' : ' tail';
    // 合并消息的头像位置：QQ 与 Guardian 都是"一组只显示一个"，QQ 在组尾、Guardian 在组首，
    // 其余行用透明占位保持对齐；微信对方每条都带头像、我方不显示头像。
    const avatarGhost = skin === 'qq' ? !lastOfRun : skin === 'guardian' ? !firstOfRun : false;
    const avatar = skin === 'wechat' && m.sender === 'user' ? '' : `<span class="message-avatar${nameAvatar ? ' name-avatar' : ''}${avatarGhost ? ' avatar-ghost' : ''}" role="img" aria-label="${escapeHtml(nameAvatar ? senderName + '的头像' : m.sender === 'user' ? '我方头像' : '对方头像')}"${nameAvatar ? ` style="background-image:none!important;background-color:hsl(${hue} 35% 85%)!important;color:#292a27!important;display:flex!important;align-items:center;justify-content:center;font:500 15px/1 system-ui"` : ''}>${nameAvatar ? escapeHtml(Array.from(senderName)[0] || '友') : ''}</span>`;
    const quoteBelow = quoteClassic || quoteWechat || quoteQq;
    return `${divider}<div class="message ${m.sender === 'user' ? 'own' : ''}${cont}${tail}" data-type="${m.type}">${avatar}<div class="message-content">${nameAvatar ? `<span class="message-sender">${escapeHtml(senderName)}</span>` : ''}<div class="${bubbleCls}">${inner}${inlineTime}</div>${belowTime}${quoteBelow}${receipt}</div></div>`;
  }).join('')}</div>${footer}<div class="phone-home" aria-hidden="true"></div></div></div>`;
}
// @scope 在部分浏览器版本里整块不生效，主题样式会全部丢失。这里改成给每条规则加章节前缀。
export function scopeChapterCss(css, id) {
  return scopeCss(css, `[data-chapter="${id}"]`, ['chapter', 'prose-chapter', 'phone-chapter', 'mixed-chapter']);
}
export function renderReader(story, theme, chapterIndex = null, themeForChapter = null, onWarnings = null, options = {}) {
  const chapters = chapterIndex === null ? story.chapters : [story.chapters[chapterIndex]].filter(Boolean);
  const phoneOnly = chapterIndex !== null && (chapters[0]?.mode || story.mode) === 'phone';
  const proseOnly = chapters.length > 0 && chapters.every(ch => (ch.mode || story.mode) === 'prose');
  const firstProse = chapters.findIndex(chapter => (chapter.mode || story.mode) !== 'phone');
  const nonce = cardToken(); let cards = 0, bookCards = 0;
  // 字体只在本次渲染里解析一次：默认跟随酒馆全局字体，主题写明具体字体时优先主题。
  const followFont = options.followFont !== false;
  // 「卡片脚本」默认关：关闭时模型写的脚本在渲染前就被剥掉；开启后只在不透明源沙箱里执行。
  const cardScripts = options.cardScripts === true;
  // 阅读字号缩放：1 与原来完全一致，只放大/缩小瞬息自己的阅读区文字。
  const readScale = (() => { const value = Number(options.readScale); return Number.isFinite(value) && value >= 0.8 && value <= 1.4 ? Math.round(value * 100) / 100 : 1; })();
  const fontCache = new Map();
  // 整页底色取主题自己的聊天底色；没有纯色规则时，用比纸面略深一档的同色系垫底，
  // 否则纸卡和页面同色，全屏看就是一张平白，跟酒馆里“灰底上浮着浅纸卡”的层次对不上。
  const pageBg = pageBackground(theme.css) || (theme.tokens?.background ? `color-mix(in srgb, ${theme.tokens.background} 86%, #8c8c8c)` : '');
  const resolveFont = themeFont => {
    const key = String(themeFont || '');
    if (!fontCache.has(key)) fontCache.set(key, effectiveFont(themeFont, followFont));
    return fontCache.get(key);
  };
  const names = { character: story.snapshot?.character?.name, persona: story.snapshot?.persona?.name };
  // 混合章节里的一段小手机：沿用原有消息解析与手机外壳，只是嵌入正文流里。
  const mixedPhone = (text, chapter, n, layout) => {
    try {
      const messages = resolveMessageStickers(parsePhone(text, names), chapter.stickerSnapshot);
      if (!messages.length) return '<p class="diagnostic">这一段小手机没有可显示的有效消息。</p>';
      const conversations = [];
      for (const message of messages) {
        if (!conversations.length || (conversations.at(-1)[0].group || '') !== (message.group || '')) conversations.push([]);
        conversations.at(-1).push(message);
      }
      return conversations.map(rows => phoneHtml(rows, names.character || '角色', mergePhoneAppearance(options?.phoneAppearance, chapter.phoneAppearance), n, layout, options.charHandle || '', options)).join('');
    } catch (error) { return `<p class="diagnostic">${escapeHtml(error.message)}</p>`; }
  };
  const body = chapters.map((chapter, index) => {
    const n = chapterIndex === null ? index + 1 : chapterIndex + 1;
    const mode = chapter.mode || story.mode, selectedTheme = chapter.readingTheme || themeForChapter?.(chapter) || theme, t = selectedTheme.tokens || {};
    const builtinProse = ['prose-stamp','prose-galaxy','prose-gufeng','prose-y2k'].includes(selectedTheme.id);
    // 结构级皮肤：选中酒馆某一套时，正文改成 #chat > .mes > .mes_block > .mes_text 结构，
    // 直接吃那套主题的原始规则；没有原始规则时仍走转换版，保证不白屏。
    const native = typeof selectedTheme.native === 'string' ? selectedTheme.native : '';
    const chapterFont = resolveFont(t.fontFamily);
    const compiled = compileThemeCss(selectedTheme.css || '', chapterFont, n);
    // 旧主题可能存过十几 MB 的内嵌字体，渲染前先裁掉超大的 @font-face。
    compiled.fonts = trimFonts(compiled.fonts);
    compiled.css = trimFonts(compiled.css);
    // 小手机皮肤布局：手机章节直接取当前手机主题；混合章节用 options.phoneTheme
    // 指定的手机主题（正文主题与手机主题独立），把皮肤 CSS 一并注入本章作用域。
    const skinTheme = mode === 'phone' ? selectedTheme : mode === 'mixed' ? options.phoneTheme || null : null;
    const phoneLayout = ['guardian', 'wechat', 'qq'].includes(skinTheme?.layout) ? skinTheme.layout : 'classic';
    let phoneSkinCss = '';
    if (mode === 'mixed' && options.phoneTheme) {
      const skinCompiled = compileThemeCss(options.phoneTheme.css || '', options.phoneTheme.tokens?.fontFamily, n + 1000);
      phoneSkinCss = trimFonts(`${skinCompiled.fonts}\n${skinCompiled.css}`);
    }
    const vars = `--reader-bg:${t.background || '#F9F8F6'};--reader-ink:${t.color || '#1C1C1C'};--reader-font:${compiled.fontFamily};--reader-size:${t.fontSize || '17px'};--reader-scale:${readScale};--reader-leading:${t.lineHeight || '1.9'};--bubble:${t.bubble || '#fff'};--own-bubble:${t.ownBubble || '#E3E1DB'}`;
    let content;
    // 正文／小手机章节里也可能出现世界书带来的卡片：世界书常用自己的包裹标签（<orange> 等），
    // 先把这类“标签内是真的 HTML”的片段归一成卡片，再判断要不要走卡片渲染；没卡片时仍是纯正文。
    const bodySource = mode === 'html' ? chapter.content : normalizeCustomCards(chapter.content);
    if (mode === 'mixed' || (mode !== 'html' && hasMixedBlocks(bodySource))) {
      const segments = readableMixedSegments(bodySource);
      const chapterCards = segments.filter(segment => segment.kind === 'html').length;
      // 整篇一起渲染时还有多少张卡片的余量；导出 HTML 时不设限。
      const bookRoom = chapterIndex === null && options.bookCap !== false ? Math.max(0, MIXED_CAPS.bookBlocks - bookCards) : Infinity;
      // 超限的卡片统一在第一次出现的位置提示一次，后面不再逐张重复同样的说明。
      const droppedCards = segments.filter(segment => segment.kind === 'overflow').length + Math.max(0, chapterCards - bookRoom);
      let droppedShown = false, chapterRendered = 0;
      const dropped = () => {
        if (droppedShown) return '';
        droppedShown = true;
        return `<p class="diagnostic">这一节还有 ${droppedCards} 张网页卡片未展开（单节最多 ${MIXED_CAPS.blocks} 张、整篇一起读最多 ${MIXED_CAPS.bookBlocks} 张；导出 HTML 不受这两个上限影响）。</p>`;
      };
      content = segments.map((segment, order) => {
        if (segment.kind === 'overflow') return dropped();
        if (segment.kind === 'phone') return `<div class="mixed-phone">${mixedPhone(segment.text, chapter, n, phoneLayout)}</div>`;
        if (segment.kind === 'html') {
          if (chapterRendered >= bookRoom) return dropped();
          const html = sanitizeCardHtml(segment.text, { scripts: cardScripts });
          if (!html) return '';
          bookCards++; chapterRendered++; cards++;
          return `<div class="mixed-card">${cardFrame(html, '', [], nonce, cardToken(), '网页卡片', cardScripts ? { scripts: true } : {})}</div>`;
        }
        const rendered = renderRegexProse(segment.text, chapter.readingRegex, story.snapshot || {}, n, nonce);
        cards += rendered.cards || 0;
        if (rendered.warnings.length) { onWarnings?.(rendered.warnings); return rendered.html + rendered.warnings.map(w => `<p class="diagnostic">${escapeHtml(w)}</p>`).join(''); }
        return rendered.html;
      }).join('');
      if (!content.trim()) content = '<p class="diagnostic">这一节没有可显示的内容，原文已保留，可打开编辑修正。</p>';
    } else if (mode === 'phone') {
      try {
        const messages = resolveMessageStickers(parsePhone(chapter.content, { character: story.snapshot?.character?.name, persona: story.snapshot?.persona?.name }), chapter.stickerSnapshot);
        if (!messages.length) throw new Error('没有可显示的有效消息，原文已保留，可打开编辑修正。');
        const conversations = [];
        for (const message of messages) {
          if (!conversations.length || (conversations.at(-1)[0].group || '') !== (message.group || '')) conversations.push([]);
          conversations.at(-1).push(message);
        }
        content = conversations.map(rows => phoneHtml(rows, story.snapshot?.character?.name || '角色', mergePhoneAppearance(options?.phoneAppearance, chapter.phoneAppearance), n, phoneLayout, options.charHandle || '', options)).join('');
      }
      catch (error) { content = `<p class="diagnostic">${escapeHtml(error.message)}</p>`; }
    } else {
      const rendered = renderRegexProse(chapter.content, chapter.readingRegex, story.snapshot || {}, n, nonce);
      cards += rendered.cards || 0;
      content = rendered.html;
      const issue = emptyProseIssue(chapter, rendered);
      if (issue) {
        options.onEmpty?.(issue, n);
        if (options.rawChapters?.includes(n)) content = `<pre class="paragraph raw-prose">${escapeHtml(originalProse(chapter))}</pre>`;
        else if (options.emptyNotice !== false) content = `<p class="diagnostic">${escapeHtml(issue.message)}请在瞬息中打开这篇作品，选择直接阅读原文，或从编辑中查看。</p>`;
      }
      if (rendered.warnings.length) {
        onWarnings?.(rendered.warnings);
        content += rendered.warnings.map(w => `<p class="diagnostic">${escapeHtml(w)}</p>`).join('');
      }
    }
    const heading = mode === 'phone' ? '' : index === firstProse ? `<h1 class="prose-title">${escapeHtml(story.title)}</h1>` : '';
    // 酒馆主题的头图是绝对定位的，原样式只留 210px 间距，阅读区容易被头图压住正文。
    const headerHeight = (compiled.css.match(/\.chapter::before\{[^}]*?height:([^!;}]+)/) || [])[1];
    // 头图按视口宽度收一收：桌面保持主题原高度，窄屏（手机）自动缩小，避免占掉半屏。
    const headerSize = headerHeight ? `min(${headerHeight.trim()}, 60vw)` : '';
    // 有原始规则时按酒馆消息结构落正文，主题的楼层线、纸卡、日期行都画在 .mes/.mes_text 上。
    const bodyHtml = native && mode !== 'phone'
      ? `<div class="tavern-chat"><div class="mes"><div class="mes_block"><div class="mes_text">${content}</div></div></div></div>`
      : content;
    return `<section class="chapter ${mode === 'phone' ? 'phone-chapter' : 'prose-chapter'}${mode === 'mixed' ? ' mixed-chapter' : ''}" data-chapter="${n}" style="${escapeHtml(vars)}"><style>${compiled.fonts}\n${scopeChapterCss([compiled.css, native, phoneSkinCss, builtinProse ? '.prose-chapter{max-width:none!important;width:100%}' : '', mode === 'prose' ? `.prose-chapter,.paragraph{font-size:calc(14px * ${readScale})!important}.prose-title{font-size:calc(26px * ${readScale})!important}` : '', '.paper{position:relative}', '.paper{left:auto!important;right:auto!important;margin-left:auto!important;margin-right:auto!important;transform:none!important;float:none!important}', '.tavern-chat,.mes,.mes_block,.mes_text{box-sizing:border-box!important;max-width:100%!important;margin-left:0!important;margin-right:0!important;padding-left:0!important;padding-right:0!important;left:auto!important;right:auto!important;float:none!important;transform:none!important}', '.paragraph,.prose-title,.chapter h1,.chapter h2,.mes_text{text-indent:0!important;margin-left:0!important;padding-left:0!important}', '.chapter .paragraph,.chapter .prose-title,.chapter .mes_text,.chapter h1,.chapter h2,.chapter .paper .paragraph,.chapter .paper .mes_text{text-indent:0!important;padding-left:0!important;margin-left:0!important;letter-spacing:normal!important}', '.chapter .paper{padding-left:0!important;padding-right:0!important;text-indent:0!important;margin-left:0!important;margin-right:0!important;left:0!important;right:auto!important;transform:none!important}', '.chapter.prose-chapter,.chapter.phone-chapter,.chapter.mixed-chapter{padding-left:0!important;padding-right:0!important}', 'html,body{overflow-x:hidden;max-width:100%}', 'main{max-width:100%!important;width:100%!important;margin:0 auto!important}', '.chapter.prose-chapter,.chapter.phone-chapter,.chapter.mixed-chapter{box-sizing:border-box!important;width:100%!important;max-width:min(620px,100%)!important;position:relative!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;height:auto!important;overflow:hidden!important;pointer-events:auto!important;margin-left:auto!important;margin-right:auto!important}', '.chapter.prose-chapter .paper,.chapter.mixed-chapter .paper{width:100%!important;max-width:100%!important;box-sizing:border-box!important;padding-top:0!important}', headerSize ? `.chapter::before{height:${headerSize}!important}` : '', headerSize ? `.chapter{padding-top:calc(${headerSize} + 20px)!important}` : ''].filter(Boolean).join('\n'), n)}</style>${mode !== 'phone' ? `<div class="paper">${heading}${bodyHtml}</div>` : `${heading}${content}`}</section>`;
  }).join('');
  // Static prose stays inert; scripted cards get only the trusted resize/error bridge.
  // 酒馆用 @import 载入的网络字体不会自动进入沙箱阅读区，这里把同一批字体样式表再挂一次。
  const fontLinks = tavernFontLinks().map(href => `<link rel="stylesheet" href="${escapeHtml(href)}" referrerpolicy="no-referrer">`).join('');
  const doc = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; ${cards ? `script-src 'nonce-${nonce}'; frame-src about:; ` : ''}style-src 'unsafe-inline' https:; img-src 'self' https: http: data:; font-src https: http: data:; base-uri 'none'; form-action 'none'">${cards ? `<meta name="shunxi-reader" content="${nonce}">` : ''}${fontLinks}<title>${escapeHtml(story.title)}</title><style>
*{box-sizing:border-box;scrollbar-width:thin;scrollbar-color:#aaa69c55 transparent}::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-thumb{background:#aaa69c66;border-radius:8px}body{margin:0;padding:20px;background:${pageBg || 'transparent'};color:${theme.tokens?.color || '#282724'};font:17px/1.9 ${escapeHtml(resolveFont(theme.tokens?.fontFamily))};overflow-wrap:anywhere}main{max-width:720px;margin:auto}h2{font-family:inherit;font-weight:400}h1{font-family:inherit;font-weight:400;font-size:1.6em;margin:0 0 20px}h2{font-size:1em;opacity:.65;margin:0 0 18px}.chapter{padding:24px;background:var(--reader-bg);color:var(--reader-ink);font-family:var(--reader-font);font-size:calc(var(--reader-size) * var(--reader-scale,1));line-height:var(--reader-leading)}.paragraph{white-space:pre-wrap;margin:0 0 1em}.chapter+.chapter{border-top:1px solid #8883;margin-top:30px}pre{white-space:pre-wrap;font:inherit}.phone{width:min(320px,100%);height:600px;background:color-mix(in srgb,var(--reader-bg) 85%,#999);border:2px solid #aaa5;border-radius:43px;padding:7px;position:relative;margin:auto;box-shadow:inset 0 0 0 3px #fff6,0 8px 24px #0000000a}.phone:before,.phone:after{content:'';position:absolute;top:110px;width:3px;height:40px;background:#a9a9a9;border-radius:2px}.phone:before{left:-5px;box-shadow:0 49px 0 #a9a9a9}.phone:after{right:-5px;top:145px;height:54px}.phone-screen{height:100%;border-radius:34px;overflow:hidden;background:var(--reader-bg);display:flex;flex-direction:column;min-height:0}.phone-status{flex-shrink:0;height:48px;padding:14px 18px 0;display:flex;justify-content:space-between;align-items:flex-start;font:600 11px/1.5 system-ui;position:relative}.phone-island{position:absolute;top:11px;left:50%;transform:translateX(-50%);width:80px;height:24px;background:#111;border-radius:20px}.phone-island:after{content:'';position:absolute;right:8px;top:7px;width:10px;height:10px;background:#202025;border-radius:50%}.phone-signals{display:flex;align-items:center;gap:5px;letter-spacing:1px}.phone-signals i{display:block;width:17px;height:9px;border:1px solid currentColor;border-radius:2px;position:relative}.phone-signals i:before{content:'';position:absolute;inset:1px 3px 1px 1px;background:currentColor}.phone-header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 17px 12px;border-bottom:1px solid #8883;font:500 14px/1.5 system-ui;text-align:center;flex-shrink:0}.phone-header small{display:block;font-size:9px;opacity:.45;font-weight:400}.phone-back{font:24px/1 system-ui}.messages{min-height:0;flex:1;overflow-y:auto;overscroll-behavior:contain;padding:10px 13px 22px;outline-offset:-3px}.message{display:flex;flex-direction:column;align-items:flex-start;margin:14px 0}.own{align-items:flex-end}.bubble{background:var(--bubble);padding:9px 12px;max-width:88%;border:1px solid #8882;border-radius:13px 13px 13px 3px;color:inherit;white-space:pre-wrap;font-size:14px;line-height:1.65}.own .bubble{background:var(--own-bubble);border-radius:13px 13px 3px 13px}.message small{font-size:10px;margin:0 0 5px;opacity:.6}.message-label{display:block;font-size:10px;margin-bottom:6px;opacity:.6}.bubble p{margin:8px 0 0}.bubble img{display:block;max-width:100%;height:auto}.timestamp{text-align:center;font-size:10px;opacity:.5}.phone-footer{height:44px;display:flex;align-items:center;gap:10px;padding:6px 16px;border-top:1px solid #8882;flex-shrink:0}.phone-input{height:27px;border:1px solid #8883;background:var(--bubble);border-radius:16px;flex:1}.phone-home{width:94px;height:4px;border-radius:8px;background:currentColor;opacity:.3;margin:6px auto 9px;flex-shrink:0}summary{cursor:pointer}summary:focus-visible{outline:2px solid currentColor}details p{white-space:pre-wrap}.diagnostic{border:1px solid currentColor;padding:12px;font-size:13px}.phone-reader{padding:14px;overflow:hidden}.phone-reader main>h1{display:none}.phone-reader .chapter{padding:0;background:transparent}.phone-reader .chapter>h2{position:absolute;width:1px;height:1px;clip-path:inset(50%);overflow:hidden}.phone-reader .phone{height:calc(100dvh - 28px);max-height:620px}.phone-reader .diagnostic,.phone-reader pre{position:relative;overflow:auto;max-height:85vh}.phone-chapter{padding-left:10px;padding-right:10px}@media(max-width:400px){body{padding:14px}.chapter{padding:14px}.phone-reader .chapter{padding:0}}
${MIXED_READER_CSS}
${PHONE_CSS}
${PROSE_CSS}
.prose-reader{padding:0;overflow:hidden}.prose-reader main{max-width:860px;height:100dvh;overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#7c776b66 transparent}.prose-reader main::-webkit-scrollbar{width:5px;height:5px}.prose-reader main::-webkit-scrollbar-track{background:transparent}.prose-reader main::-webkit-scrollbar-thumb{background:#7c776b66;border-radius:8px}@media print{.prose-reader{overflow:visible}.prose-reader main{height:auto;overflow:visible}}
.preset-markup{max-width:100%;overflow-wrap:anywhere}.preset-markup img{max-width:100%;height:auto}
</style></head><body class="${phoneOnly ? 'phone-reader' : proseOnly ? 'prose-reader' : ''}"><main>${body || '<p>尚无内容</p>'}</main>${cards ? readerBridge(nonce) : ''}</body></html>`;
  return trimFonts(doc);
}
