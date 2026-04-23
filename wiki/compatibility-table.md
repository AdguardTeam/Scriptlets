# Scriplets and Redirects compatibility tables

- [Scriptlets](#scriptlets)
- [Redirects](#redirects)


## <a id="scriptlets"></a> Scriptlets compatibility table

| AdGuard | uBO | Adblock Plus |
|---|---|---|
| [abort-current-inline-script](../wiki/about-scriptlets.md#abort-current-inline-script) | abort-current-script.js (abort-current-script, acs, acs.js, abort-current-inline-script, abort-current-inline-script.js, acis, acis.js) | abort-current-inline-script |
| [abort-on-property-read](../wiki/about-scriptlets.md#abort-on-property-read) | abort-on-property-read.js (abort-on-property-read, aopr, aopr.js) | abort-on-property-read |
| [abort-on-property-write](../wiki/about-scriptlets.md#abort-on-property-write) | abort-on-property-write.js (abort-on-property-write, aopw, aopw.js) | abort-on-property-write |
| [abort-on-stack-trace](../wiki/about-scriptlets.md#abort-on-stack-trace) | abort-on-stack-trace.js (abort-on-stack-trace, aost, aost.js) |  |
| [adjust-setInterval](../wiki/about-scriptlets.md#adjust-setInterval) | adjust-setInterval.js (adjust-setInterval, nano-setInterval-booster, nano-setInterval-booster.js, nano-sib, nano-sib.js) |  |
| [adjust-setTimeout](../wiki/about-scriptlets.md#adjust-setTimeout) | adjust-setTimeout.js (adjust-setTimeout, nano-setTimeout-booster, nano-setTimeout-booster.js, nano-stb, nano-stb.js) |  |
| [call-nothrow](../wiki/about-scriptlets.md#call-nothrow) | call-nothrow.js (call-nothrow) |  |
| [close-window](../wiki/about-scriptlets.md#close-window) | close-window.js (window-close-if.js, window-close-if) |  |
| [debug-current-inline-script](../wiki/about-scriptlets.md#debug-current-inline-script) |  |  |
| [debug-on-property-read](../wiki/about-scriptlets.md#debug-on-property-read) |  |  |
| [debug-on-property-write](../wiki/about-scriptlets.md#debug-on-property-write) |  |  |
| [amazon-apstag](../wiki/about-scriptlets.md#amazon-apstag) | amazon-apstag.js (amazon-apstag) |  |
| [didomi-loader](../wiki/about-scriptlets.md#didomi-loader) |  |  |
| [dir-string](../wiki/about-scriptlets.md#dir-string) |  |  |
| [disable-newtab-links](../wiki/about-scriptlets.md#disable-newtab-links) | disable-newtab-links.js |  |
| [evaldata-prune](../wiki/about-scriptlets.md#evaldata-prune) | evaldata-prune.js (evaldata-prune) |  |
| [fingerprintjs2](../wiki/about-scriptlets.md#fingerprintjs2) | fingerprint2.js (fingerprint2) |  |
| [fingerprintjs3](../wiki/about-scriptlets.md#fingerprintjs3) | fingerprintjs3.js (fingerprintjs3) |  |
| [freewheel-admanager](../wiki/about-scriptlets.md#freewheel-admanager) |  |  |
| [gemius](../wiki/about-scriptlets.md#gemius) |  |  |
| [google-analytics](../wiki/about-scriptlets.md#google-analytics) | google-analytics_analytics.js (google-analytics_analytics) |  |
| [google-analytics-ga](../wiki/about-scriptlets.md#google-analytics-ga) | google-analytics-ga.js (google-analytics-ga) |  |
| [google-ima3](../wiki/about-scriptlets.md#google-ima3) |  |  |
| [google-ima3-dai](../wiki/about-scriptlets.md#google-ima3-dai) |  |  |
| [googlesyndication-adsbygoogle](../wiki/about-scriptlets.md#googlesyndication-adsbygoogle) |  |  |
| [googletagservices-gpt](../wiki/about-scriptlets.md#googletagservices-gpt) | googletagservices_gpt.js (ubo-googletagservices_gpt.js, ubo-googletagservices_gpt) |  |
| [json-prune](../wiki/about-scriptlets.md#json-prune) | json-prune.js (json-prune) | json-prune |
| [log](../wiki/about-scriptlets.md#log) |  | log |
| [log-addEventListener](../wiki/about-scriptlets.md#log-addEventListener) |  |  |
| [log-eval](../wiki/about-scriptlets.md#log-eval) |  |  |
| [log-on-stack-trace](../wiki/about-scriptlets.md#log-on-stack-trace) |  |  |
| [m3u-prune](../wiki/about-scriptlets.md#m3u-prune) | m3u-prune.js (m3u-prune) |  |
| [matomo](../wiki/about-scriptlets.md#matomo) |  |  |
| [metrika-yandex-watch](../wiki/about-scriptlets.md#metrika-yandex-watch) |  |  |
| [metrika-yandex-tag](../wiki/about-scriptlets.md#metrika-yandex-tag) |  |  |
| [naver-wcslog](../wiki/about-scriptlets.md#naver-wcslog) |  |  |
| [noeval](../wiki/about-scriptlets.md#noeval) | noeval.js (noeval) |  |
| [nowebrtc](../wiki/about-scriptlets.md#nowebrtc) | nowebrtc.js (nowebrtc) |  |
| [no-protected-audience](../wiki/about-scriptlets.md#no-protected-audience) |  |  |
| [no-topics](../wiki/about-scriptlets.md#no-topics) |  |  |
| [pardot-1.0](../wiki/about-scriptlets.md#pardot-1.0) |  |  |
| [prebid](../wiki/about-scriptlets.md#prebid) |  |  |
| [prevent-addEventListener](../wiki/about-scriptlets.md#prevent-addEventListener) | addEventListener-defuser.js (addEventListener-defuser, aeld, aeld.js, prevent-addEventListener, prevent-addEventListener.js) | prevent-listener |
| [prevent-adfly](../wiki/about-scriptlets.md#prevent-adfly) |  |  |
| [prevent-bab](../wiki/about-scriptlets.md#prevent-bab) | nobab.js (nobab) |  |
| [prevent-canvas](../wiki/about-scriptlets.md#prevent-canvas) | prevent-canvas.js (prevent-canvas) |  |
| [prevent-constructor](../wiki/about-scriptlets.md#prevent-constructor) |  |  |
| [prevent-element-src-loading](../wiki/about-scriptlets.md#prevent-element-src-loading) |  |  |
| [prevent-eval-if](../wiki/about-scriptlets.md#prevent-eval-if) | noeval-if.js (prevent-eval-if.js, prevent-eval-if, noeval-if) |  |
| [prevent-fab-3.2.0](../wiki/about-scriptlets.md#prevent-fab-3.2.0) | nofab.js |  |
| [prevent-fetch](../wiki/about-scriptlets.md#prevent-fetch) | prevent-fetch.js (prevent-fetch, no-fetch-if, no-fetch-if.js) |  |
| [prevent-innerHTML](../wiki/about-scriptlets.md#prevent-innerHTML) | prevent-innerHTML.js (prevent-innerHTML) |  |
| [prevent-navigation](../wiki/about-scriptlets.md#prevent-navigation) |  |  |
| [prevent-xhr](../wiki/about-scriptlets.md#prevent-xhr) | no-xhr-if.js (no-xhr-if, prevent-xhr, prevent-xhr.js) |  |
| [prevent-popads-net](../wiki/about-scriptlets.md#prevent-popads-net) |  |  |
| [prevent-refresh](../wiki/about-scriptlets.md#prevent-refresh) | prevent-refresh.js (refresh-defuser.js, refresh-defuser) |  |
| [prevent-requestAnimationFrame](../wiki/about-scriptlets.md#prevent-requestAnimationFrame) | no-requestAnimationFrame-if.js (no-requestAnimationFrame-if.js, no-requestAnimationFrame-if, norafif.js, norafif) |  |
| [prevent-setInterval](../wiki/about-scriptlets.md#prevent-setInterval) | prevent-setInterval.js (prevent-setInterval, no-setInterval-if.js, no-setInterval-if, nosiif.js, nosiif, setInterval-defuser.js, setInterval-defuser) |  |
| [prevent-setTimeout](../wiki/about-scriptlets.md#prevent-setTimeout) | no-setTimeout-if.js (no-setTimeout-if, nostif, nostif.js, prevent-setTimeout, prevent-setTimeout.js, setTimeout-defuser, setTimeout-defuser.js) |  |
| [prevent-window-open](../wiki/about-scriptlets.md#prevent-window-open) | no-window-open-if.js (no-window-open-if, nowoif, nowoif.js, prevent-window-open, prevent-window-open.js, window.open-defuser, window.open-defuser.js) |  |
| [remove-attr](../wiki/about-scriptlets.md#remove-attr) | remove-attr.js (ra.js, ra, remove-attr) |  |
| [remove-class](../wiki/about-scriptlets.md#remove-class) | remove-class.js (rc.js, rc, remove-class) |  |
| [remove-cookie](../wiki/about-scriptlets.md#remove-cookie) | remove-cookie.js (remove-cookie, cookie-remover, cookie-remover.js) | cookie-remover |
| [remove-node-text](../wiki/about-scriptlets.md#remove-node-text) | remove-node-text.js (remove-node-text, rmnt, rmnt.js) |  |
| [remove-request-query-parameter](../wiki/about-scriptlets.md#remove-request-query-parameter) |  | strip-fetch-query-parameter |
| [scorecardresearch-beacon](../wiki/about-scriptlets.md#scorecardresearch-beacon) |  |  |
| [set-attr](../wiki/about-scriptlets.md#set-attr) | set-attr.js (set-attr) |  |
| [set-constant](../wiki/about-scriptlets.md#set-constant) | set-constant.js (set-constant, set, set.js) | override-property-read |
| [set-cookie](../wiki/about-scriptlets.md#set-cookie) | set-cookie.js (set-cookie) |  |
| [set-cookie-reload](../wiki/about-scriptlets.md#set-cookie-reload) | set-cookie.js (set-cookie) |  |
| [set-local-storage-item](../wiki/about-scriptlets.md#set-local-storage-item) | set-local-storage-item.js (set-local-storage-item) |  |
| [set-popads-dummy](../wiki/about-scriptlets.md#set-popads-dummy) |  |  |
| [set-session-storage-item](../wiki/about-scriptlets.md#set-session-storage-item) | set-session-storage-item.js (set-session-storage-item) |  |
| [spoof-css](../wiki/about-scriptlets.md#spoof-css) | spoof-css.js |  |
| [xml-prune](../wiki/about-scriptlets.md#xml-prune) | xml-prune.js (xml-prune) |  |
| [remove-in-shadow-dom](../wiki/about-scriptlets.md#remove-in-shadow-dom) |  |  |
| [inject-css-in-shadow-dom](../wiki/about-scriptlets.md#inject-css-in-shadow-dom) |  |  |
| [hide-in-shadow-dom](../wiki/about-scriptlets.md#hide-in-shadow-dom) |  |  |
|  | webrtc-if.js (webrtc-if) |  |
|  | overlay-buster.js (overlay-buster) |  |
|  | alert-buster.js (alert-buster) |  |
| [href-sanitizer](../wiki/about-scriptlets.md#href-sanitizer) | href-sanitizer.js (href-sanitizer) |  |
|  |  | abort-on-iframe-property-read |
|  |  | abort-on-iframe-property-write |
|  |  | freeze-element |
|  |  | json-override |
|  |  | simulate-mouse-event |
|  |  | hide-if-contains |
|  |  | hide-if-contains-image |
|  |  | hide-if-contains-image-hash |
|  |  | hide-if-contains-similar-text |
|  |  | hide-if-contains-visible-text |
|  |  | hide-if-contains-and-matches-style |
|  |  | hide-if-graph-matches |
|  |  | hide-if-has-and-matches-style |
|  |  | hide-if-labelled-by |
|  |  | hide-if-matches-xpath |
|  |  | hide-if-matches-computed-xpath |
|  |  | hide-if-shadow-contains |
|  |  | debug |
|  |  | trace |
|  |  | race |
|  | window.name-defuser.js (window.name-defuser) |  |
|  | trusted-set-constant.js (trusted-set.js, trusted-set) |  |
|  | trusted-set-cookie.js (trusted-set-cookie) |  |
|  | trusted-set-local-storage-item.js (trusted-set-local-storage-item) |  |
|  | trusted-replace-fetch-response.js (trusted-replace-fetch-response) |  |
| [json-prune-fetch-response](../wiki/about-scriptlets.md#json-prune-fetch-response) | json-prune-fetch-response.js (json-prune-fetch-response) |  |
| [json-prune-xhr-response](../wiki/about-scriptlets.md#json-prune-xhr-response) | json-prune-xhr-response.js (json-prune-xhr-response) |  |
|  | trusted-replace-xhr-response.js (trusted-replace-xhr-response) |  |
|  | multiup.js |  |
|  | trusted-set-cookie-reload.js |  |
|  | trusted-click-element.js (trusted-click-element) |  |
|  | trusted-prune-inbound-object.js (trusted-prune-inbound-object) |  |
|  | trusted-prune-outbound-object.js (trusted-prune-outbound-object) |  |
|  | trusted-set-session-storage-item.js (trusted-set-session-storage-item) |  |
|  | trusted-replace-node-text.js (trusted-rpnt.js, trusted-rpnt, replace-node-text.js, replace-node-text, rpnt.js, rpnt) |  |
|  | remove-cache-storage-item.js |  |
|  | trusted-replace-argument.js |  |
|  | trusted-replace-outbound-text.js |  |
|  | trusted-suppress-native-method.js (trusted-suppress-native-method) |  |
|  | trusted-prevent-xhr.js |  |
|  | trusted-prevent-dom-bypass.js |  |
|  | trusted-override-element-method.js |  |


## <a id="redirects"></a> Redirects compatibility table

| AdGuard | uBO | Adblock Plus |
|---|---|---|
| [1x1-transparent.gif](../wiki/about-redirects.md#1x1-transparent.gif) | 1x1.gif | 1x1-transparent-gif |
| [2x2-transparent.png](../wiki/about-redirects.md#2x2-transparent.png) | 2x2.png | 2x2-transparent-png |
| [3x2-transparent.png](../wiki/about-redirects.md#3x2-transparent.png) | 3x2.png | 3x2-transparent-png |
| [32x32-transparent.png](../wiki/about-redirects.md#32x32-transparent.png) | 32x32.png | 32x32-transparent-png |
| [amazon-apstag](../wiki/about-redirects.md#amazon-apstag) | amazon_apstag.js |  |
| [ati-smarttag](../wiki/about-redirects.md#ati-smarttag) |  |  |
| [click2load.html](../wiki/about-redirects.md#click2load.html) | click2load.html |  |
| [didomi-loader](../wiki/about-redirects.md#didomi-loader) |  |  |
| [fingerprintjs2](../wiki/about-redirects.md#fingerprintjs2) | fingerprint2.js |  |
| [fingerprintjs3](../wiki/about-redirects.md#fingerprintjs3) | fingerprint3.js |  |
| [freewheel-admanager](../wiki/about-redirects.md#freewheel-admanager) |  |  |
| [google-analytics](../wiki/about-redirects.md#google-analytics) | google-analytics_analytics.js |  |
| [google-analytics-ga](../wiki/about-redirects.md#google-analytics-ga) | google-analytics_ga.js |  |
| [google-ima3](../wiki/about-redirects.md#google-ima3) | google-ima.js |  |
| [google-ima3-dai](../wiki/about-redirects.md#google-ima3-dai) |  |  |
| [googlesyndication-adsbygoogle](../wiki/about-redirects.md#googlesyndication-adsbygoogle) | googlesyndication_adsbygoogle.js |  |
| [googletagservices-gpt](../wiki/about-redirects.md#googletagservices-gpt) | googletagservices_gpt.js |  |
| [gemius](../wiki/about-redirects.md#gemius) |  |  |
| [matomo](../wiki/about-redirects.md#matomo) |  |  |
| [metrika-yandex-watch](../wiki/about-redirects.md#metrika-yandex-watch) |  |  |
| [metrika-yandex-tag](../wiki/about-redirects.md#metrika-yandex-tag) |  |  |
| [naver-wcslog](../wiki/about-redirects.md#naver-wcslog) |  |  |
| [noeval](../wiki/about-redirects.md#noeval) | noeval-silent.js |  |
| [noopcss](../wiki/about-redirects.md#noopcss) | noop.css | blank-css |
| [noopframe](../wiki/about-redirects.md#noopframe) | noop.html | blank-html |
| [noopjs](../wiki/about-redirects.md#noopjs) | noop.js | blank-js |
| [noopjson](../wiki/about-redirects.md#noopjson) | noop.json |  |
| [nooptext](../wiki/about-redirects.md#nooptext) | noop.txt | blank-text |
| [noopmp3-0.1s](../wiki/about-redirects.md#noopmp3-0.1s) | noop-0.1s.mp3 | blank-mp3 |
| [noopmp4-1s](../wiki/about-redirects.md#noopmp4-1s) | noop-1s.mp4 | blank-mp4 |
| [noopvmap-1.0](../wiki/about-redirects.md#noopvmap-1.0) | noop-vmap1.xml |  |
| [noopvast-2.0](../wiki/about-redirects.md#noopvast-2.0) | noop-vast2.xml |  |
| [noopvast-3.0](../wiki/about-redirects.md#noopvast-3.0) | noop-vast3.xml |  |
| [noopvast-4.0](../wiki/about-redirects.md#noopvast-4.0) | noop-vast4.xml |  |
| [pardot-1.0](../wiki/about-redirects.md#pardot-1.0) |  |  |
| [prebid](../wiki/about-redirects.md#prebid) |  |  |
| [prebid-ads](../wiki/about-redirects.md#prebid-ads) | prebid-ads.js |  |
| [prevent-bab](../wiki/about-redirects.md#prevent-bab) | nobab.js |  |
| [prevent-bab2](../wiki/about-redirects.md#prevent-bab2) | nobab2.js |  |
| [prevent-fab-3.2.0](../wiki/about-redirects.md#prevent-fab-3.2.0) | nofab.js |  |
| [prevent-popads-net](../wiki/about-redirects.md#prevent-popads-net) | popads.js |  |
| [scorecardresearch-beacon](../wiki/about-redirects.md#scorecardresearch-beacon) | scorecardresearch_beacon.js |  |
| [set-popads-dummy](../wiki/about-redirects.md#set-popads-dummy) | popads-dummy.js |  |
|  | amazon_ads.js |  |
|  | ampproject_v0.js |  |
|  | chartbeat.js |  |
|  | doubleclick_instream_ad_status.js |  |
| [empty](../wiki/about-redirects.md#empty) | empty |  |
|  | google-analytics_cx_api.js |  |
|  | google-analytics_inpage_linkid.js |  |
|  | hd-main.js |  |
|  | outbrain-widget.js |  |
|  | noeval.js |  |
|  | noop-0.5s.mp3 |  |
|  | sensors-analytics.js |  |
|  | nitropay_ads.js |  |
|  | adthrive_abd.js |  |
