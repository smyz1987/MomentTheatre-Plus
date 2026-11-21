export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
export const MAX_BACKGROUND_BYTES = 8 * 1024 * 1024;
export function avatarUrl(value) {
  if (typeof value !== 'string' || value.length > Math.ceil(MAX_AVATAR_BYTES / 3) * 4 + 100) return '';
  if (/^data:image\/(png|jpeg|gif|webp);base64,[a-z0-9+/]+=*$/i.test(value)) return value;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && value.length <= 8000 ? url.href : '';
  } catch { return ''; }
}
// 背景图允许更长的 data URI（本地上传最长边压到 1600px，通常数百 KB），直链不设长度上限。
export function backgroundUrl(value) {
  if (typeof value !== 'string' || value.length > MAX_BACKGROUND_BYTES) return '';
  if (/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/]+=*$/i.test(value)) return value;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}
export function phoneAppearance(value) {
  const frost = Number(value?.frost);
  return { remark: typeof value?.remark === 'string' ? value.remark.trim().slice(0, 120) : '', userAvatar: avatarUrl(value?.userAvatar), charAvatar: avatarUrl(value?.charAvatar), background: backgroundUrl(value?.background),
    // 梦境白磨砂浓度（0.15–0.95）与低性能模式（关闭磨砂模糊），仅 Guardian 系皮肤消费
    frost: Number.isFinite(frost) && frost >= 0.15 && frost <= 0.95 ? Math.round(frost * 100) / 100 : '',
    perf: value?.perf === true,
    // 「使用酒馆头像」默认开启：未自选头像时，小手机直接用酒馆的角色／人设头像
    useTavernAvatar: value?.useTavernAvatar !== false };
}

export async function avatarFile(file) {
  if (!file || !['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type)) throw new Error('请选择 PNG、JPG、GIF 或 WebP 图片。');
  if (file.size > MAX_AVATAR_BYTES) throw new Error('头像图片请小于 2 MB。');
  return await compressImage(file, 512, 0.94, '头像图片读取失败，请重新选择。', '图片尺寸过大，请先缩小后上传。', '头像压缩失败，请换一张图片重试。');
}

// 背景图本地上传：最长边压到 1600px（保画质），WebP 输出；不做头像那套 512px 压缩。
export async function backgroundFile(file) {
  if (!file || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('背景图请选择 PNG、JPG 或 WebP 图片。');
  if (file.size > MAX_BACKGROUND_BYTES) throw new Error('背景图片请小于 8 MB。');
  return await compressImage(file, 1600, 0.9, '背景图片读取失败，请重新选择。', '背景图片尺寸过大，请先缩小后上传。', '背景压缩失败，请换一张图片重试。');
}

async function compressImage(file, maxEdge, quality, readError, sizeError, compressError) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve; image.onerror = () => reject(new Error(readError)); image.src = url;
    });
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 40000000) throw new Error(sizeError);
    const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error(compressError);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    // Animated uploads become a small static avatar; transparent backgrounds stay transparent.
    const compressed = canvas.toDataURL('image/webp', quality);
    if (!/^data:image\/(webp|png);base64,/.test(compressed)) throw new Error(compressError);
    return compressed;
  } finally { URL.revokeObjectURL(url); }
}

export function checkAvatarImage(url) {
  if (!url) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const image = new Image(); image.referrerPolicy = 'no-referrer';
    const finish = error => { clearTimeout(timer); image.onload = image.onerror = null; if (error) { image.src = ''; reject(error); } else resolve(); };
    const timer = setTimeout(() => finish(new Error('头像加载超时，请检查图片直链或重新上传。')), 15000);
    image.onload = () => image.naturalWidth ? finish() : finish(new Error('图片没有可显示的内容。'));
    image.onerror = () => finish(new Error('图片无法加载，请使用可直接访问的图片链接或本地图片。'));
    image.src = url;
  });
}

// 阅读时的外观合成：章节快照优先（旧章节冻结的自定义头像保留），快照里为空的键用当前设置补齐，
// 让“修改头像与背景”的改动也能应用到已收藏的历史聊天。原始值先合并、最后统一校验，
// 避免 undefined 被规范化成 false/'' 后丢失“未设置”语义。
export function mergePhoneAppearance(base, override) {
  const raw = key => {
    const o = override && override[key];
    const b = base && base[key];
    const hasO = o !== undefined && o !== null && o !== '';
    return hasO ? o : (b !== undefined && b !== null && b !== '' ? b : key === 'useTavernAvatar' ? true : key === 'perf' ? false : '');
  };
  return phoneAppearance({ remark: raw('remark'), userAvatar: raw('userAvatar'), charAvatar: raw('charAvatar'), background: raw('background'), frost: raw('frost'), perf: raw('perf'), useTavernAvatar: raw('useTavernAvatar') });
}
