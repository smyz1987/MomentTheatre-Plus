// Cache only public reading assets. Never include credentials or API responses.
const MAX_BYTES = 64 * 1024 * 1024, TTL = 7 * 86400000;
export class ReaderAssets {
  constructor() { this.pending = new Map(); this.bytes = 0; this.memory = new Map(); }
  async database() {
    return this.db ||= new Promise(resolve => {
      try {
        // v2：图片改为压缩后内联，旧库里的原始大图会让装饰规则超长，换库名自然失效。
        const request = indexedDB.open('shunxi-plus-reading-assets-v4', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('assets', { keyPath: 'url' });
        request.onsuccess = () => resolve(request.result);
        request.onerror = request.onblocked = () => resolve(null);
      } catch { resolve(null); }
    });
  }
  async cached(url) {
    const db = await this.database();
    if (!db) return null;
    return new Promise(resolve => {
      const request = db.transaction('assets').objectStore('assets').get(url);
      request.onsuccess = () => resolve(request.result?.time > Date.now() - TTL ? request.result : null);
      request.onerror = () => resolve(null);
    });
  }
  async persist(entry) {
    const db = await this.database(); if (!db) return;
    await new Promise(resolve => {
      const transaction = db.transaction('assets', 'readwrite'), store = transaction.objectStore('assets');
      const request = store.getAll();
      request.onsuccess = () => {
        const existing = request.result.filter(e => e.url !== entry.url).sort((a, b) => b.time - a.time);
        let total = entry.size;
        for (const item of existing) {
          total += item.size;
          if (total > MAX_BYTES || item.time < Date.now() - TTL) store.delete(item.url);
        }
        store.put(entry);
      };
      transaction.oncomplete = transaction.onerror = transaction.onabort = () => resolve();
    });
  }
  async load(url) {
    if (this.memory.has(url)) return this.memory.get(url).data;
    if (this.pending.has(url)) return this.pending.get(url);
    const promise = (async () => {
      try {
        let entry = await this.cached(url);
        if (!entry) {
          const response = await fetch(url, { mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'force-cache', signal: AbortSignal.timeout(12000) });
          if (!response.ok || Number(response.headers.get('content-length')) > 24 * 1024 * 1024) return url;
          const blob = await response.blob();
          if (blob.size > 24 * 1024 * 1024 || !/^(image\/|font\/|application\/(octet-stream|font|x-font))/i.test(blob.type)) return url;
          // 过大的装饰图（主题里的头图、壁纸动辄 1 MB）内联后单条 CSS 规则会超长而整条失效，
          // 这里按显示尺寸压到 720px 以内再转 data URI，透明背景保留。
          let source = blob;
          if (/^image\//i.test(blob.type) && blob.type !== 'image/svg+xml') {
            try {
              const bitmap = await createImageBitmap(blob);
              const scale = Math.min(1, 720 / Math.max(bitmap.width, bitmap.height));
              if (scale < 1 || blob.size > 160 * 1024) {
                const canvas = new OffscreenCanvas(Math.max(1, Math.round(bitmap.width * scale)), Math.max(1, Math.round(bitmap.height * scale)));
                canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
                const compact = await canvas.convertToBlob({ type: 'image/webp', quality: 0.86 });
                if (compact.size < blob.size) source = compact;
              }
              bitmap.close?.();
            } catch { /* 解码失败就按原图内联 */ }
          }
          const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(source); });
          entry = { url, data, size: data.length, time: Date.now() };
          await this.persist(entry);
        }
        while (this.bytes + entry.size > MAX_BYTES && this.memory.size) {
          const [key, item] = this.memory.entries().next().value; this.memory.delete(key); this.bytes -= item.size;
        }
        this.memory.set(url, entry); this.bytes += entry.size;
        return entry.data;
      } catch { return url; }
    })();
    this.pending.set(url, promise);
    try { return await promise; } finally { this.pending.delete(url); }
  }
  async prepare(html) {
    // Card srcdoc has already been escaped; leave its independent assets intact.
    // Replacing URLs inside it as plain HTML could corrupt scripts or quoting.
    const cards = [];
    html = html.replace(/<iframe\b[^>]*data-regex-card=[^>]*><\/iframe>/gi, card => {
      const token = 'SHUNXI_CARD_ASSET_' + cards.length + '_END'; cards.push({token,card}); return token;
    });
    const urls = [...new Set(html.match(/https?:[^\s"'()<>]+/g) || [])].slice(0, 32), replacements = new Map();
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(4, urls.length) }, async () => {
      while (next < urls.length) { const original = urls[next++]; replacements.set(original, await this.load(original.replaceAll('&amp;', '&'))); }
    }));
    // CSS 里的 url(...) 单独处理：data URI 含分号，塞回未加引号的 url() 或 var() 里会把
    // 自定义属性截断（--x:url(data:image/png;base64,…) 只到第一个分号），必须加引号。
    let prepared = html.replace(/url\(\s*(['"]?)(https?:[^)"']*?)\1\s*\)/gi, (whole, quote, url) => {
      const data = replacements.get(url.trim().replaceAll('&amp;', '&'));
      return data && data.startsWith('data:') ? `url("${data}")` : whole;
    });
    prepared = prepared.replace(/https?:[^\s"'()<>]+/g, url => replacements.get(url) || url);
    for (const {token,card} of cards) prepared = prepared.replace(token, () => card);
    return prepared;
  }
}
