import { USER_AVATAR, CHAR_AVATAR } from './avatar-data.js';
// Shared by the sandboxed reader, theme preview, and exported reading files.
export const PHONE_CSS = `
html{color-scheme:light}
.phone-group .message-sender{font:11px/1.5 var(--reader-font, system-ui);opacity:.65;margin:0 0 4px;max-width:100%;overflow-wrap:anywhere}.phone-group .group-event{text-align:center;font-size:12px;opacity:.6;margin:14px 0}.phone-group .group-event .call-record{justify-content:center}.phone+.phone{margin-top:20px}
body.phone-reader,.phone-chapter{background:transparent!important}
.phone{--user-avatar:url("${USER_AVATAR}");--char-avatar:url("${CHAR_AVATAR}");--avatar-size:32px;--message-gap:8px}
.message{flex-direction:row;align-items:flex-start;gap:var(--message-gap);margin:18px 0}.message.own{flex-direction:row-reverse;align-items:flex-start}
.message-avatar{display:block;width:var(--avatar-size);height:var(--avatar-size);flex:0 0 var(--avatar-size);border-radius:50%;background:#8882 var(--char-avatar) center/cover no-repeat}.own .message-avatar{background-image:var(--user-avatar)}.message-avatar.avatar-ghost{visibility:hidden}
.quote-line{display:block;font:12px/1.6 var(--reader-font, system-ui),sans-serif;opacity:.72;margin:3px 2px;overflow-wrap:anywhere}
.quote-wechat{border-left:3px solid currentColor;padding-left:6px}

.foreign-dash{display:block;border-top:1px dashed #b5b5b5;margin:9px 0 7px;height:0}
.footer-set{display:flex;align-items:center}
.footer-emoji{display:none;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:#3d3d3d;color:#fff}
.footer-emoji .phone-icon{width:18px;height:18px}
.footer-voice{display:none;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;background:#ececec;color:#9a9a9a}
.footer-voice .phone-icon{width:18px;height:18px}
.footer-thumb{display:none;align-items:center}
.message-content{max-width:calc(100% - 2 * (var(--avatar-size) + var(--message-gap)));min-width:0;display:flex;flex-direction:column;align-items:flex-start}.own .message-content{align-items:flex-end}.bubble{max-width:100%;min-width:0}
.message-time{display:block;font:10px/1.5 var(--reader-font, system-ui),sans-serif;opacity:.45;margin-top:4px}
.phone svg{display:block;width:22px;height:22px;flex-shrink:0}
.phone-contact{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.phone-battery{display:flex;align-items:center;height:18px}
.phone-battery i{display:block;width:19px;height:10px;border:1px solid currentColor;border-radius:3px;position:relative}
.phone-battery i:before{content:'';position:absolute;inset:2px;background:currentColor;border-radius:1px}
.phone-battery i:after{content:'';position:absolute;right:-3px;top:2px;width:2px;height:4px;background:currentColor;border-radius:1px;opacity:.5}
.phone-footer>svg{width:24px;height:24px;opacity:.65}
.message[data-type=voice] .bubble{min-width:0;width:190px;padding:0}
.voice>summary{list-style:none;display:flex;align-items:center;gap:10px;padding:10px 12px;font-size:12px}
.voice>summary::-webkit-details-marker{display:none}
.voice-wave{display:flex;align-items:center;gap:3px;height:18px}
.voice-wave i{display:block;background:currentColor;width:2px;height:6px;border-radius:2px}
.voice-wave i:nth-child(2){height:12px}.voice-wave i:nth-child(3){height:18px}.voice-wave i:nth-child(4){height:10px}
.voice-hint{margin-left:auto;opacity:.55;font-size:10px;white-space:nowrap}
.voice-open{display:none}.voice[open] .voice-open{display:inline}.voice[open] .voice-closed{display:none}
.voice-transcript{padding:10px 12px;border-top:1px solid #8883;font-size:13px;white-space:pre-wrap}
.message:is([data-type=transfer],[data-type=image],[data-type=sticker],[data-type=location],[data-type=share]) .bubble{padding:0;border:0;background:transparent;border-radius:10px;overflow:hidden}
.transfer-card{width:218px;max-width:100%;background:#e99b54;color:#fff;border-radius:9px;white-space:normal}
.transfer-main{display:flex;gap:12px;align-items:center;padding:15px 14px 10px}
.transfer-main>div{min-width:0}
.transfer-main>svg{width:32px;height:32px}.transfer-main strong{display:block;font:500 16px/1.4 system-ui,sans-serif}
.phone .transfer-main strong{font-size:var(--amount-size,16px)!important;white-space:nowrap;max-width:100%;overflow-x:auto;scrollbar-width:none;line-height:1.4}.transfer-main>div{flex:1;overflow:hidden}
.transfer-main span{font-size:11px;opacity:.85;display:block;margin-top:2px}
.bubble .transfer-note{margin:0;padding:0 14px 9px;font-size:11px;opacity:.9}
.transfer-foot{border-top:1px solid #fff4;font-size:10px;padding:4px 14px;opacity:.85}
.image-description{min-height:118px;width:204px;max-width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:var(--bubble);border:1px solid #8882;border-radius:9px;padding:18px 14px;text-align:center}
.image-description>svg{width:26px;height:26px;opacity:.4}.image-description>span{font-size:12px;opacity:.7;white-space:pre-wrap}
.bubble .message-image{max-height:260px;object-fit:contain;border-radius:9px}
.bubble .sticker-image{border-radius:10px;max-height:132px;max-width:min(132px,100%);object-fit:contain}
.sticker-built-in{max-width:132px;min-width:72px}.sticker-built-in>svg{width:116px;height:116px;max-width:100%}
.sticker-fallback{display:block;padding:12px 6px;font-size:17px}
.location-card,.share-card{width:222px;max-width:100%;background:var(--bubble);border:1px solid #8882;border-radius:9px;overflow:hidden;white-space:normal}
.location-caption{padding:10px 12px 8px}.location-caption strong{display:block;font-size:13px;font-weight:500;line-height:1.6}
.message .location-caption small{display:block;white-space:nowrap;text-overflow:ellipsis;overflow:hidden;margin:3px 0 0;opacity:.5;font-size:10px}
.location-card>svg{width:100%;height:92px;object-fit:cover}
.share-card{padding:12px 12px 0}.share-card>strong{display:block;font-size:14px;font-weight:500;line-height:1.65}
.share-description{display:flex;align-items:center;gap:10px;margin:10px 0;font-size:11px;opacity:.7;line-height:1.6}
.share-description>span:first-child{flex:1;min-width:0}.share-description>img,.share-thumbnail{width:44px;height:44px;object-fit:cover;flex-shrink:0;border-radius:5px}
.share-thumbnail{display:grid;place-items:center;background:#8881}.share-source{display:flex;align-items:center;gap:5px;border-top:1px solid #8882;padding:6px 0;font-size:10px;opacity:.6}
.share-source>svg{width:13px;height:13px}.call-record{display:flex;align-items:center;gap:8px;font-size:13px}.call-record>svg{width:18px;height:18px}
.retracted-message{display:flex;flex-direction:column;gap:6px;font:inherit}.retract-notice{font:inherit;opacity:.55}.retract-original{font:inherit;white-space:pre-wrap}
@media(max-width:300px){.transfer-main{gap:7px;padding:12px 10px 8px}.transfer-main>svg{width:24px;height:24px}.transfer-main strong{font-size:16px}.share-description{gap:6px}.share-description>img,.share-thumbnail{width:32px;height:32px}}
.phone.phone-skin-guardian,.phone.phone-skin-wechat,.phone.phone-skin-qq{width:min(430px,100%);height:740px}
.skin-header{display:flex!important;align-items:center;gap:9px;padding:6px 16px 12px;direction:ltr!important}
.skin-header .phone-back{flex:0 0 auto;display:flex;align-items:center;justify-content:center}
.skin-header .phone-back .phone-icon{width:22px;height:22px;stroke-width:2.4}
.skin-header .header-avatar{display:block;width:32px;height:32px;flex:0 0 32px;border-radius:50%;background-color:#8882;background-image:var(--char-avatar);background-position:center;background-size:cover;background-repeat:no-repeat}
.phone.phone-group .skin-header .header-avatar{display:none}
.skin-header .phone-contact-wrap{min-width:0}
.skin-header .phone-contact{min-width:0}
.skin-header .phone-contact-wrap .phone-contact{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.phone-subtitle{display:block;font:italic 400 11px/1.45 Georgia,'Times New Roman',serif;opacity:.72;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.header-icons{display:flex;align-items:center;gap:12px;flex:0 0 auto}
.header-icons .phone-icon{width:20px;height:20px}
.header-icon{display:flex;align-items:center;flex:0 0 auto}
.header-icon .phone-icon{width:20px;height:20px}
.skin-guardian-header .phone-back{flex:0 0 auto;text-align:left}
.skin-guardian-header .phone-contact-wrap{flex:1;text-align:center;min-width:0}
.skin-guardian-header .header-icon{flex:0 0 auto;justify-content:flex-end}
.skin-wechat-header .phone-back{flex:0 0 auto;text-align:left}
.skin-wechat-header .phone-contact{flex:0 1 auto;font-weight:600}
.skin-wechat-header .header-icons{flex:1;justify-content:flex-end}
.skin-qq-header .phone-contact-wrap{flex:1;text-align:left}
.skin-qq-header .phone-subtitle{font-style:normal;font-family:system-ui,sans-serif;font-size:10px;opacity:.55}
.skin-qq-header .header-icons.icons-alt{display:none}
.skin-footer{display:flex;align-items:center;gap:9px;padding:8px 14px}
.skin-footer .phone-icon{width:21px;height:21px;flex:0 0 auto;opacity:.85}
.skin-footer .phone-input{flex:1;height:30px;min-width:0}
.skin-footer .footer-caption{flex:0 0 auto;font:italic 400 13px/1.2 Georgia,serif;opacity:.78;white-space:nowrap}
.time-divider{text-align:center;font:400 11px/1.6 system-ui,sans-serif;opacity:.55;margin:13px 0 3px}
.read-receipt{display:block;font:400 10px/1.5 system-ui,sans-serif;opacity:.55;margin-top:3px}
.bubble-time{display:inline-block;margin-left:9px;font:400 11px/1.4 system-ui,sans-serif;opacity:.55;vertical-align:bottom;white-space:nowrap}
/* QQ 皮肤引用行：箭头／「〞」两种符号都写进 DOM，配色主题决定显示哪一个。
   对方引用是「内容 + 箭头」，我方镜像为「箭头 + 内容」（对照示意图）。 */
.quote-qq{display:flex;align-items:center;gap:8px;max-width:100%}
.message.own .quote-qq{flex-direction:row-reverse}
.quote-qq .quote-text{min-width:0;overflow-wrap:anywhere}
.quote-qq .quote-arrow,.quote-qq .quote-mark{display:none;flex:0 0 auto}
.quote-qq .quote-arrow .phone-icon{width:17px;height:17px}
.quote-qq .quote-mark{font:700 15px/1 Georgia,serif;letter-spacing:-2px}
/* 微信底栏输入槽为弹性容器，表情按钮贴右居中。 */
.phone .skin-footer .phone-input{display:flex;align-items:center}
/* 皮肤消息行间距由主题定义，这里只保证 cont 追加类可用。 */
/* 微信皮肤旁白行（「开头的演出说明）与消息行的结构。 */
.translate-line{display:block;min-width:0;overflow-wrap:anywhere}
.phone-skin-wechat .foreign-line,.phone-skin-wechat .narration-line,.phone-skin-wechat .translate-line{display:block;min-width:0;overflow-wrap:anywhere}
/* ==== 皮肤全屏化：参考图为整屏截图，去设备壳/侧键/滚动条/home 条 ==== */
.phone.phone-skin-guardian,.phone.phone-skin-wechat,.phone.phone-skin-qq{width:min(430px,100%)!important;height:740px!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}
.phone.phone-skin-guardian::before,.phone.phone-skin-guardian::after,.phone.phone-skin-wechat::before,.phone.phone-skin-wechat::after,.phone.phone-skin-qq::before,.phone.phone-skin-qq::after{display:none!important}
.phone.phone-skin-guardian .phone-screen,.phone.phone-skin-wechat .phone-screen,.phone.phone-skin-qq .phone-screen{border-radius:0!important;border:0!important;box-shadow:none!important}
.phone.phone-skin-guardian .phone-home,.phone.phone-skin-wechat .phone-home,.phone.phone-skin-qq .phone-home{display:none!important}
.phone.phone-skin-guardian .messages::-webkit-scrollbar,.phone.phone-skin-wechat .messages::-webkit-scrollbar,.phone.phone-skin-qq .messages::-webkit-scrollbar{display:none!important}
.phone.phone-skin-guardian .messages,.phone.phone-skin-wechat .messages,.phone.phone-skin-qq .messages{scrollbar-width:none!important}
.phone.phone-skin-guardian .message.own .message-content,.phone.phone-skin-wechat .message.own .message-content,.phone.phone-skin-qq .message.own .message-content{max-width:76%!important}
/* Guardian 皮肤：时间画在气泡内部右侧（加 !important 压过带作用域前缀的主题 padding），
   字号字重跟随气泡正文（对照示意图，时间与正文同字重）。 */
.phone.phone-skin-guardian .message[data-type=text] .bubble{position:relative;padding-right:58px!important}
.phone.phone-skin-guardian .bubble-time{position:absolute;right:14px;top:50%;transform:translateY(-50%);margin:0;font:inherit;opacity:1}
/* 同组连续消息：与上一条贴得更近（抵消上一条的下边距，组内 5px 级间距）。 */
.phone .message.cont{margin-top:-4px!important}
`;

