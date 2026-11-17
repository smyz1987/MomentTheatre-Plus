// 有些浏览器版本对 @scope 支持不完整，整块样式会被直接忽略。
// 这里改成给每条规则手工加根选择器前缀，行为等价且兼容性更稳。
export function scopeCss(css, root, rootClasses = []) {
  const rootPattern = rootClasses.length ? new RegExp(`^(${rootClasses.map(name => `.${name}`).join('|')})\\b`) : null;
  const mapPart = part => {
    let text = part.trim();
    if (!text) return '';
    text = text.replace(/:scope\b/g, root);
    if (text.startsWith(root)) return text;
    const lead = rootPattern ? text.match(rootPattern) : null;
    if (lead) return `${root}${text}`;
    return `${root} ${text}`;
  };
  const mapSelector = selector => selector.split(',').map(mapPart).filter(Boolean).join(',');
  let out = '';
  let buffer = '';
  const frame = [];
  for (const ch of String(css || '')) {
    if (ch === '{') {
      const prelude = buffer.trim();
      buffer = '';
      const atRule = prelude.startsWith('@');
      const keyframes = atRule && /keyframes/i.test(prelude);
      const innerKeyframes = !atRule && frame.some(item => item.keyframes);
      frame.push({ keyframes });
      out += (atRule || innerKeyframes ? prelude : mapSelector(prelude)) + '{';
      continue;
    }
    if (ch === '}') {
      out += buffer + '}';
      buffer = '';
      frame.pop();
      continue;
    }
    if (ch === ';' && !frame.length) {
      out += ';';
      buffer = '';
      continue;
    }
    buffer += ch;
  }
  return out + buffer;
}
