import { mount } from './src/app.js';
import { TavernHost } from './src/host.js';

let starting = false;
async function start() {
  if (starting || document.getElementById('shunxi-plus-root')) return;
  starting = true;
  let host;
  try {
    host = new TavernHost(() => globalThis.SillyTavern.getContext(), import.meta.url);
    await host.initialize();
    await mount(host);
  } catch (error) {
    host?.dispose();
    console.error('[瞬息] 初始化失败', error);
    globalThis.toastr?.error(error.message, '瞬息初始化失败');
    starting = false;
  }
}
const context = globalThis.SillyTavern?.getContext?.();
if (context?.eventSource && context?.eventTypes?.APP_READY) {
  // APP_READY 在 SillyTavern 1.15–1.18 是粘性事件，晚订阅也会补发一次。
  context.eventSource.on(context.eventTypes.APP_READY, start);
} else console.error('[瞬息] 请作为 SillyTavern 1.15～1.18 原生扩展安装。');

// 1.19 起不再重放已经发生的 APP_READY，只挂监听会一直等不到启动。
// 这里补一次兜底：页面就绪后若仍未挂载就自己启动；start 内有幂等保护。
const kick = () => {
  if (!document.getElementById('shunxi-plus-root')) start();
};
if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', kick, { once: true });
else setTimeout(kick, 600);
