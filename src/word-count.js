// 目标字数按“可读文字”统计：中文字逐字，英文按单词，数字串按一个词。
// HTML 标签、属性、CSS、脚本和链接都不计入，避免代码长度把达标数字撑大。
export function countReadableWords(text) {
  let source = String(text ?? '');
  source = source
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/https?:\/\/[^\s<>"']+/gi, ' ')
    .replace(/&(?:#\d+|#x[\da-f]+|[a-z][a-z\d]*);/gi, ' ');
  const cjk = source.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu) || [];
  const words = source.match(/[A-Za-z]+(?:['’\-][A-Za-z]+)*/g) || [];
  const numbers = source.match(/\d+(?:[.,]\d+)*/g) || [];
  return cjk.length + words.length + numbers.length;
}
