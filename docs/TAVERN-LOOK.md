# 跟随酒馆外观

1.3.0 让番外的阅读区和瞬息面板跟酒馆走，同时保留主题作者自己的选择。

## 字体

- 默认开：阅读区与面板的字体取酒馆当前字体。读取顺序是 `#chat` 的实际计算字体 → 根变量 `--mainFontFamily` → 系统默认。
- 主题本身写明了具体字体时，以主题为准；只有主题用的是 `system-ui`／`sans-serif` 这类通用字体栈才会被替换成酒馆字体。这样既跟随酒馆，又不会把作者特意配的字体盖掉。
- 开关在设置 → 外观：`字体跟随酒馆`。关掉即回到原版固定字体。

## 配色

美化页的正文风格、小手机风格列表末尾多了「跟随酒馆（实时）」：

- 纸面取 `--SmartThemeChatTintColor`，缺失时用 `--SmartThemeBlurTintColor` 与聊天背景合成；文字取 `--SmartThemeBodyColor`；引用与强调色取 `--SmartThemeQuoteColor`／`--SmartThemeEmColor`；气泡取 `--SmartThemeBotMesBlurTintColor`，我方气泡取 `--SmartThemeUserMesBlurTintColor`，透明或缺失时按文字与纸面调和出一个接近的浅色。
- 明确与否决都只看当前值，不缓存、不监听：每次渲染读取一次计算样式。没有挂全局 observer，也没有轮询和定时器。
- 生成章节时，「跟随酒馆」会冻结成该节的样式快照（存进 `readingTheme`），以后换肤不会改写旧章节。
- 设置 → 外观另有一个 `背景沿用酒馆聊天背景`（默认关）：开启后把 `#chat` 的 http(s) 背景图叠在纸面色下面，仅在「跟随酒馆」风格下生效，图片地址限长 26 万字符，本地 `data:` 地址不取。

## 导入酒馆美化 JSON

美化页「导入」现在认两种文件：

1. 瞬息自己的主题包（`format: shunxi-reading-themes` 或带 `tokens` 的对象）。
2. 酒馆美化包：带 `main_text_color`／`blur_tint_color`／`chat_tint_color`／`custom_css` 这类字段的那份 JSON。识别到这种文件时会弹一次确认：

- `配色`：只取颜色与 `font_scale`，不碰 `custom_css`。
- `配色 + 装饰`：额外把 `custom_css` 转成阅读区样式。

转换只保留本来指向聊天内容的选择器：`#chat`、`.mes_text`、`.mes_block`、`.last_mes`、`.mes`、`.message`、`body`，分别映射到 `.chapter`、`.paragraph`、`.message`。其余界面规则（`#top-bar`、`#send_textarea`、`.drawer-icon`、`#extensionsMenu`、`.fa-*` 等）、`#` 打头的其它 id、`:has()` 与 `[class*=]` 一律丢弃，`@import` 直接删掉。

转换后会逐条用阅读区自己的 CSS 校验过一遍：浏览器能容忍但阅读区不允许的写法（例如非 base64 的 `data:image/svg+xml`、不能被 `@scope` 包裹的规则）单独剔除，剩下的照常生效；实在整份都过不了，就只套配色与强调色，并在提示里说明。

导入后正文与小手机会各生成一份（`…·正文`／`…·小手机`），并自动选中。

## 性能边界

- 美化 CSS 只存在于番外阅读区的 iframe 里，绝不注入酒馆主界面，也不会改写酒馆的样式表。
- 导入时一次性转换完成，之后存库复用，不重新解析；转换结果上限约 2.8 万字符。
- 渲染时只读一次 `getComputedStyle`（面板字体一次、阅读区一次），没有事件监听、没有 MutationObserver、没有 setInterval。
- 阅读区背景图仅在开启跟随背景且是 http(s) 时才取，长度有上限，避免大 base64 卡住渲染。
## 酒馆主题库

不想先导出 JSON 时，美化页的「酒馆主题库」可以直接列出酒馆里已保存的美化：

- 点「读取主题库」时向酒馆发一次 `POST /api/settings/get`（酒馆设置本来就把 `data/<user>/themes/*.json` 一起下发）。除了名称与 `main_text_color`／`italics_text_color`／`quote_text_color`／`blur_tint_color`／`chat_tint_color`／`user_mes_blur_tint_color`／`bot_mes_blur_tint_color`／`shadow_color`／`border_color`／`font_scale` 这些配色字段，每套的 `custom_css` 会当场用 `convertTavernCss` 转成阅读区规则后只保留转换结果：整库约 20MB 原始 CSS 不留在内存，转换后约 2.3MB；426 套实测转换约 3 秒。
- 装饰规则把 `#chat` 映射成章节、`.mes_text`／`.mes_block*`／`.mes` 映射成段落、`body` 映射成章节，界面规则（顶栏、抽屉、输入框、`:has()` 等）丢弃；`@font-face` 与 https 图片保留，转换结果逐条过 `parseThemeCss` 校验。
- 美化页的「连装饰一起套上」开关控制是否并入这些装饰规则，默认开；关掉只套配色。
- 阅读区在沙箱 iframe 里渲染，酒馆用 `@import` 引来的网络字体不会自动进去，因此每份阅读区文档会额外挂上与酒馆相同的字体样式表（`fontsapi.zeoseven.com`／Google Fonts 等，最多 6 个），`style-src` 只对 https 样式表放行，其余仍是 `default-src 'none'`。
- 只读一次，结果缓存在实例里；再点一次按钮会强制重读，用来刷新新存的主题。除这次读取外不监听、不轮询，也不改动酒馆当前主题。
- 正文与小手机各有一个下拉：可以从酒馆库里各挑一套，和你酒馆当前在用的那套不一样也没问题；每种模式只保留最近选中的一套，不会让主题库越选越大。
- 选定的主题会转换成瞬息自己的阅读主题（沿用 `convertTavernTheme`），生成章节时照常冻结快照。气泡色会先做对比度检查，夜间主题不会出现白底白字。