// 依次打光的新手引导：只读界面，不改数据；每一步切换页面并把光圈落到对应控件上。
// 全部尺寸按视口计算，滚动或缩放时重新测量一次，不挂轮询。
export const TOUR_STEPS = [
  { key: 'nav', tab: 'generate', anchor: '[data-tour="nav"]', title: '五个页面',
    text: '番外、剧本、故事、美化、设置。点这里切换，下面按顺序带一遍。' },
  { key: 'prompt', tab: 'generate', anchor: '[data-tour="prompt"]', title: '写下设定',
    text: '这里写这篇番外想要什么，写完在右边选生成方式。' },
  { key: 'modes', tab: 'generate', anchor: '[data-tour="modes"]', title: '四种生成方式',
    text: '正文、混合、小手机、HTML。混合可以在同一节里穿插：正文照常写，小手机用「<小手机>…</小手机>」包住，网页卡片用「<瞬息-html>…</瞬息-html>」包住。' },
  { key: 'import', tab: 'generate', anchor: '[data-tour="import"]', title: '从外部导入',
    text: 'txt、md、html 都能导入，也可以直接粘贴。整份 HTML 会当成一张网页卡片，结果显示在下面的番外区。' },
  { key: 'copy', tab: 'generate', anchor: '[data-tour="copy-text"]', title: '复制',
    text: '「文本」只给能直接读的结果，「源码」保留特殊格式标记，重新导入还能渲染。' },
  { key: 'theme-import', tab: 'themes', anchor: '[data-tour="theme-import"]', title: '导入酒馆美化',
    text: '直接读酒馆那种 JSON 美化包；想让它跟着酒馆实时变，就选「跟随酒馆」。' },
  { key: 'look', tab: 'settings', anchor: '[data-tour="look"]', title: '外观',
    text: '字体默认跟随酒馆全局字体；还能让背景沿用聊天背景、给网页卡片开脚本（默认关）、调整阅读字号。' },
  { key: 'done', tab: 'settings', anchor: '[data-tour="look"]', title: '介绍完了',
    text: '设置里可以随时重新观看这段介绍。' },
];

export function startTour({ shadow, goto, onFinish } = {}) {
  const steps = TOUR_STEPS;
  let index = 0, closed = false, frame = 0, timer = 0, target = null;
  // 隐藏标签页里 requestAnimationFrame 会被节流，用一次短超时兜底，保证引导一定能画出来。
  const soon = fn => {
    let done = false;
    const run = () => { if (done || closed) return; done = true; cancelAnimationFrame(frame); clearTimeout(timer); fn(); };
    cancelAnimationFrame(frame); clearTimeout(timer);
    frame = requestAnimationFrame(run);
    timer = setTimeout(run, 150);
  };
  const layer = document.createElement('div');
  layer.className = 'tour-layer';
  layer.setAttribute('role', 'dialog');
  layer.setAttribute('aria-modal', 'false');
  layer.setAttribute('aria-label', '功能介绍');
  const ring = document.createElement('div');
  ring.className = 'tour-ring';
  const card = document.createElement('div');
  card.className = 'tour-card';
  const title = document.createElement('h2');
  const text = document.createElement('p');
  const counter = document.createElement('small');
  const actions = document.createElement('div');
  actions.className = 'actions';
  const prev = document.createElement('button');
  prev.type = 'button'; prev.textContent = '上一步';
  const next = document.createElement('button');
  next.type = 'button'; next.className = 'primary';
  const skip = document.createElement('button');
  skip.type = 'button'; skip.className = 'text-button'; skip.textContent = '跳过';
  actions.append(skip, prev, next);
  card.append(counter, title, text, actions);
  layer.append(ring, card);

  const place = () => {
    if (!target || !target.isConnected) { ring.style.display = 'none'; card.classList.add('tour-card-floating'); card.style.left = '50%'; card.style.top = '16%'; card.style.transform = 'translateX(-50%)'; return; }
    const box = target.getBoundingClientRect();
    const pad = 6;
    ring.style.display = '';
    ring.style.left = `${Math.max(0, box.left - pad)}px`;
    ring.style.top = `${Math.max(0, box.top - pad)}px`;
    ring.style.width = `${Math.min(window.innerWidth, box.width + pad * 2)}px`;
    ring.style.height = `${Math.min(window.innerHeight, box.height + pad * 2)}px`;
    card.classList.remove('tour-card-floating');
    card.style.transform = '';
    const cardBox = card.getBoundingClientRect();
    const below = box.bottom + 12;
    const fits = below + cardBox.height < window.innerHeight - 8;
    card.style.top = `${fits ? below : Math.max(8, box.top - cardBox.height - 12)}px`;
    const left = Math.min(Math.max(8, box.left), Math.max(8, window.innerWidth - cardBox.width - 8));
    card.style.left = `${left}px`;
  };

  const show = () => {
    const step = steps[index];
    if (!step) return finish(true);
    // 文案同步写入，保证每次点击都立刻前进；定位也先同步量一次，
    // 这样即使页面在后台（定时器被节流）光圈也不会停在上一步。
    counter.textContent = `${index + 1} / ${steps.length}`;
    title.textContent = step.title;
    text.textContent = step.text;
    prev.hidden = index === 0;
    next.textContent = index === steps.length - 1 ? '完成' : '下一步';
    if (typeof goto === 'function' && step.tab) goto(step.tab);
    target = shadow?.querySelector?.(step.anchor) || document.querySelector(step.anchor);
    if (target) { target.scrollIntoView?.({ block: 'center', behavior: 'auto' }); place(); return; }
    // 目标还没进 DOM（切页面后异步挂载的情况），等一帧再补一次；页面在后台时用超时兜底。
    soon(() => {
      target = shadow?.querySelector?.(step.anchor) || document.querySelector(step.anchor);
      if (!target) { index++; if (index < steps.length) return show(); return finish(true); }
      target.scrollIntoView?.({ block: 'center', behavior: 'auto' });
      place();
    });
  };

  const cleanup = () => {
    if (closed) return;
    closed = true;
    cancelAnimationFrame(frame);
    clearTimeout(timer);
    window.removeEventListener('resize', place);
    document.removeEventListener('scroll', place, true);
    layer.remove();
  };

  function finish(completed) {
    if (closed) return;
    cleanup();
    onFinish?.(completed === true);
  }

  // 每步间隔至少 120ms 才接受点击，避免连点两下跳过一整步。
  let shownAt = Date.now();
  const move = delta => {
    if (Date.now() - shownAt < 120) return;
    const nextIndex = index + delta;
    if (nextIndex < 0) return;
    if (nextIndex >= steps.length) return finish(true);
    index = nextIndex;
    shownAt = Date.now();
    show();
  };
  prev.onclick = () => move(-1);
  next.onclick = () => move(1);
  skip.onclick = () => finish(false);
  layer.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.stopPropagation(); finish(false); }
    if (event.key === 'Enter' && event.target === next) next.click();
  });

  window.addEventListener('resize', place);
  document.addEventListener('scroll', place, true);
  (shadow || document.body).append(layer);
  show();
  return { close: () => finish(false), next: () => next.click() };
}

export const TOUR_STEP_COUNT = TOUR_STEPS.length;
