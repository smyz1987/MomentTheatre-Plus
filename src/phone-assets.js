// Phone UI icons; the original placeholder cat stickers have been removed.
export const STICKER_URLS = Object.freeze({});
export function builtInSticker() { return ''; }
const paths = {
  plus: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  back: '<path d="m15 4.5-7.5 7.5L15 19.5"/>',
  transfer: '<circle cx="12" cy="12" r="10"/><path d="M6 8h11m-3-3 3 3-3 3M18 16H7m3-3-3 3 3 3"/>',
  call: '<path d="M5 3h4l2 5-3 2a15 15 0 0 0 6 6l2-3 5 2v4c0 2-2 3-4 2C8 19 4 15 2 7 1 5 3 3 5 3Z"/>',
  video: '<rect x="2" y="5" width="13" height="14" rx="3"/><path d="m15 10 7-4v12l-7-4"/>',
  image: '<rect x="2" y="3" width="20" height="18" rx="3"/><circle cx="8" cy="9" r="2"/><path d="m3 18 6-5 4 3 4-5 5 5"/>',
  share: '<rect x="4" y="2" width="16" height="20" rx="3"/><path d="M8 7h8M8 12h8M8 17h5"/>',
  arrow: '<path d="m9 5 7 7-7 7"/>',
  down: '<path d="m6.5 9 5.5 5.5L17.5 9"/>',
  doubleDown: '<path d="m6.5 6 5.5 5.5L17.5 6M6.5 12.5 12 18l5.5-5.5"/>',
  camera: '<path d="M4.5 7.5h2.6l1.4-2h6.9l1.4 2h2.7a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V9a1.5 1.5 0 0 1 1.5-1.5Z"/><circle cx="12" cy="13.5" r="3.4"/>',
  mic: '<rect x="9.2" y="3" width="5.6" height="10.5" rx="2.8"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"/>',
  emoji: '<circle cx="12" cy="12" r="9"/><path d="M8.6 14.2a4.6 4.6 0 0 0 6.8 0"/><path d="M9.1 9.8h.01M14.9 9.8h.01" stroke-width="2"/>',
  thumb: '<path d="M7.5 11v9M7.5 11l3.8-6.8c1.3.2 2.2 1.2 2.2 2.6L12.8 10h5.3a1.8 1.8 0 0 1 1.8 2.2l-1.4 5.8a2 2 0 0 1-2 1.5H7.5"/>',
  pin: '<path d="M12 21s-7-5.8-7-11a7 7 0 0 1 14 0c0 5.2-7 11-7 11Z"/><circle cx="12" cy="10" r="2.6"/>',
  wifi: '<path d="M4.6 9.4a12.6 12.6 0 0 1 14.8 0M8 12.8a8 8 0 0 1 8 0"/><path d="M10.7 15.9a3.6 3.6 0 0 1 2.8-.9"/><circle cx="12.1" cy="17.6" r="1.3"/>',
  gear: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="5"/><circle cx="19" cy="12" r="1.9" fill="currentColor" stroke="none"/><circle cx="16.9" cy="16.9" r="1.9" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.9" fill="currentColor" stroke="none"/><circle cx="7.1" cy="16.9" r="1.9" fill="currentColor" stroke="none"/><circle cx="5" cy="12" r="1.9" fill="currentColor" stroke="none"/><circle cx="7.1" cy="7.1" r="1.9" fill="currentColor" stroke="none"/><circle cx="12" cy="5" r="1.9" fill="currentColor" stroke="none"/><circle cx="16.9" cy="7.1" r="1.9" fill="currentColor" stroke="none"/>',
  burst: '<path d="M12 3.2v2.8M12 18v2.8M3.2 12H6M18 12h2.8M5.8 5.8l2 2M16.2 16.2l2 2M18.2 5.8l-2 2M7.8 16.2l-2 2"/>',
  undo: '<path d="m8.5 13.5-4-4 4-4"/><path d="M4.5 9.5H14a6 6 0 0 1 6 6v4"/>',
};
// 实心风格的图标（微信/QQ 皮肤底栏与顶栏用的填充版本）。
const filledPaths = {
  'call-f': '<path d="M5.1 3.3c-1 0-1.9.8-1.8 1.8C4 13 11 20 18.9 20.7c1 .1 1.8-.8 1.8-1.8v-3.2c0-.9-.6-1.6-1.4-1.8l-3.2-.8c-.7-.2-1.4.1-1.8.7l-.9 1.3a14.2 14.2 0 0 1-4.9-4.9l1.3-.9c.6-.4.9-1.1.7-1.8l-.8-3.2a1.9 1.9 0 0 0-1.8-1.3H5.1Z"/>',
  'video-f': '<path d="M3.2 5.6h10.6a2.2 2.2 0 0 1 2.2 2.2v8.4a2.2 2.2 0 0 1-2.2 2.2H3.2A2.2 2.2 0 0 1 1 16.2V7.8a2.2 2.2 0 0 1 2.2-2.2Zm13.9 4.2 4.3-2.9a.8.8 0 0 1 1.3.7v8.8a.8.8 0 0 1-1.3.7l-4.3-2.9v-4.4Z"/>',
  'camera-f': '<path fill-rule="evenodd" d="M4 8h3.1l1.3-1.9A2 2 0 0 1 10.1 5h3.8a2 2 0 0 1 1.7.9L16.9 8H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Zm8 2.4a4.1 4.1 0 1 0 0 8.2 4.1 4.1 0 0 0 0-8.2Z"/>',
  'image-f': '<path fill-rule="evenodd" d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm2.6 4a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4Zm-2.9 10h17.2l-5.6-7-4.4 5.3-2.8-2.8-4.4 4.5Z"/>',
  'mic-f': '<path d="M12 2.6a3.3 3.3 0 0 1 3.3 3.3v5.8a3.3 3.3 0 0 1-6.6 0V5.9A3.3 3.3 0 0 1 12 2.6Zm-7.2 9a1 1 0 0 1 2 0 5.2 5.2 0 0 0 10.4 0 1 1 0 0 1 2 0 7.3 7.3 0 0 1-6.2 7.2v2.3a1 1 0 0 1-2 0v-2.3a7.3 7.3 0 0 1-6.2-7.2Z"/>',
  'emoji-f': '<path fill-rule="evenodd" d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20ZM8.8 9a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6Zm6.4 0a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6Zm-6.6 3.8a1 1 0 0 0-.4 1.4 4.5 4.5 0 0 0 7.6 0 1 1 0 0 0-1.6-1.1 2.5 2.5 0 0 1-4.4 0 1 1 0 0 0-1.2-.3Z"/>',
  'thumb-f': '<path d="M2.8 11.2a1.7 1.7 0 0 1 1.7-1.7h1.7v10H4.5a1.7 1.7 0 0 1-1.7-1.7v-6.6Zm4.9-1.1 2.7-5.5A2.3 2.3 0 0 1 13.1 6.7v1.8h4.6a1.9 1.9 0 0 1 1.9 2.3l-1.2 6a2.3 2.3 0 0 1-2.2 1.8H7.7V10.1Z"/>',
  'pin-f': '<path fill-rule="evenodd" d="M12 21.5S4.8 15 4.8 9.9a7.2 7.2 0 0 1 14.4 0C19.2 15 12 21.5 12 21.5Zm0-14.1a2.9 2.9 0 1 0 0 5.8 2.9 2.9 0 0 0 0-5.8Z"/>',
  'image-slim': '<rect x="3.2" y="4.2" width="17.6" height="15.6" rx="2.4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M6.2 17.6c1.6-2 3-3.8 4.4-3.8 1.2 0 1.9 1 2.8 2 .8-1 1.6-2.2 2.8-2.2 1.3 0 2.6 1.7 4 3.6z"/><circle cx="8.3" cy="8.6" r="1.5"/>',
  'mic-holder': '<rect x="9.2" y="3.2" width="5.6" height="11.4" rx="2.8"/><path d="M5.8 11.6a6.2 6.2 0 0 0 12.4 0" fill="none" stroke="currentColor" stroke-width="2"/>',
  'pin-orbit-f': '<path fill-rule="evenodd" d="M12 18.6S5.4 12.9 5.4 8.6a6.6 6.6 0 0 1 13.2 0c0 4.3-6.6 10-6.6 10Zm0-13a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 0 0 0-5.4Z"/><ellipse cx="12" cy="20.3" rx="5.6" ry="1.9" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  // QQ 风格引用回复的实心弯箭头（指向左上的回折箭头）。
  'reply-f': '<path d="M10.6 4.3c.6-.6 1.7-.2 1.7.7v2.5h.7c5.3 0 8.6 3.3 9.6 8.4.3 1.7-.1 3.3-1 4.7-.5.8-1.8.4-1.7-.6.1-.6.1-1.2 0-1.8-.5-3.1-2.7-5-6.2-5h-1.4v2.5c0 .9-1.1 1.3-1.7.7l-6.3-5.6a1 1 0 0 1 0-1.5l6.3-5.6Z"/>',
};
export function phoneIcon(name) {
  return `<svg class="phone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.image}</svg>`;
}
export function phoneFilledIcon(name) {
  return `<svg class="phone-icon" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">${filledPaths[name] || paths.image}</svg>`;
}
export function virtualMap() {
  return '<svg class="virtual-map" viewBox="0 0 260 112" role="img" aria-label="虚拟地图与定位标志"><rect width="260" height="112" fill="#e8e9e3"/><path d="M0 72Q55 42 110 91T260 69" stroke="#c5d9dd" stroke-width="24" fill="none"/><path d="M12 8h49v32H12zM167 4h64v27h-64zM154 76h43v27h-43z" fill="#d1dbc9"/><path d="M84-10 110 124M-10 51 280 35M183-10 165 124" stroke="#fff" stroke-width="12"/><path d="M84-10 110 124" stroke="#e9cb91" stroke-width="5"/><path d="M16 95 73 80M214 57 244 95" stroke="#fff" stroke-width="7"/><circle cx="132" cy="58" r="23" fill="#718a721a"/><path d="M132 79s-14-15-14-25a14 14 0 0 1 28 0c0 10-14 25-14 25Z" fill="#668572" stroke="#fff" stroke-width="2"/><circle cx="132" cy="54" r="5" fill="#fff"/></svg>';
}
