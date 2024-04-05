# Scriplets and Redirects compatibility tables

- [Scriptlets](#scriptlets)
- [Redirects](#redirects)


## <a id="scriptlets"></a> Scriptlets compatibility table

| AdGuard | uBO | Adblock Plus |
|---|---|---|
| [abort-current-inline-script](../wiki/about-scriptlets.md#abort-current-inline-script) | abort-current-script.js (acs.js, abort-current-inline-script.js, acis.js) | abort-current-inline-script |
| [abort-on-property-read](../wiki/about-scriptlets.md#abort-on-property-read) | abort-on-property-read.js (aopr.js) | abort-on-property-read |
| [abort-on-property-write](../wiki/about-scriptlets.md#abort-on-property-write) | abort-on-property-write.js (aopw.js) | abort-on-property-write |
| [abort-on-stack-trace](../wiki/about-scriptlets.md#abort-on-stack-trace) | abort-on-stack-trace.js (aost.js) |  |
| [adjust-setInterval](../wiki/about-scriptlets.md#adjust-setInterval) | adjust-setInterval.js (nano-setInterval-booster.js, nano-sib.js) |  |
| [adjust-setTimeout](../wiki/about-scriptlets.md#adjust-setTimeout) | adjust-setTimeout.js (nano-setTimeout-booster.js, nano-stb.js) |  |
| [call-nothrow](../wiki/about-scriptlets.md#call-nothrow) | call-nothrow.js |  |
| [close-window](../wiki/about-scriptlets.md#close-window) | close-window.js (window-close-if.js) |  |
| [debug-current-inline-script](../wiki/about-scriptlets.md#debug-current-inline-script) |  |  |
| [debug-on-property-read](../wiki/about-scriptlets.md#debug-on-property-read) |  |  |
| [debug-on-property-write](../wiki/about-scriptlets.md#debug-on-property-write) |  |  |
| [amazon-apstag](../wiki/about-scriptlets.md#amazon-apstag) |  |  |
| [didomi-loader](../wiki/about-scriptlets.md#didomi-loader) |  |  |
| [dir-string](../wiki/about-scriptlets.md#dir-string) |  |  |
| [disable-newtab-links](../wiki/about-scriptlets.md#disable-newtab-links) | disable-newtab-links.js |  |
| [evaldata-prune](../wiki/about-scriptlets.md#evaldata-prune) | evaldata-prune.js |  |
| [fingerprintjs2](../wiki/about-scriptlets.md#fingerprintjs2) |  |  |
| [fingerprintjs3](../wiki/about-scriptlets.md#fingerprintjs3) |  |  |
| [gemius](../wiki/about-scriptlets.md#gemius) |  |  |
| [google-analytics](../wiki/about-scriptlets.md#google-analytics) |  |  |
| [google-analytics-ga](../wiki/about-scriptlets.md#google-analytics-ga) |  |  |
| [google-ima3](../wiki/about-scriptlets.md#google-ima3) |  |  |
| [googlesyndication-adsbygoogle](../wiki/about-scriptlets.md#googlesyndication-adsbygoogle) |  |  |
| [googletagservices-gpt](../wiki/about-scriptlets.md#googletagservices-gpt) |  |  |
| [json-prune](../wiki/about-scriptlets.md#json-prune) | json-prune.js | json-prune |
| [log](../wiki/about-scriptlets.md#log) |  | log |
| [log-addEventListener](../wiki/about-scriptlets.md#log-addEventListener) | addEventListener-logger.js (aell.js) (removed) |  |
| [log-eval](../wiki/about-scriptlets.md#log-eval) |  |  |
| [log-on-stack-trace](../wiki/about-scriptlets.md#log-on-stack-trace) |  |  |
| [m3u-prune](../wiki/about-scriptlets.md#m3u-prune) | m3u-prune.js |  |
| [matomo](../wiki/about-scriptlets.md#matomo) |  |  |
| [metrika-yandex-watch](../wiki/about-scriptlets.md#metrika-yandex-watch) |  |  |
| [metrika-yandex-tag](../wiki/about-scriptlets.md#metrika-yandex-tag) |  |  |
| [naver-wcslog](../wiki/about-scriptlets.md#naver-wcslog) |  |  |
| [noeval](../wiki/about-scriptlets.md#noeval) |  |  |
| [nowebrtc](../wiki/about-scriptlets.md#nowebrtc) | nowebrtc.js |  |
| [no-protected-audience](../wiki/about-scriptlets.md#no-protected-audience) |  |  |
| [no-topics](../wiki/about-scriptlets.md#no-topics) |  |  |
| [pardot-1.0](../wiki/about-scriptlets.md#pardot-1.0) |  |  |
| [prebid](../wiki/about-scriptlets.md#prebid) |  |  |
| [prevent-addEventListener](../wiki/about-scriptlets.md#prevent-addEventListener) | addEventListener-defuser.js (aeld.js, prevent-addEventListener.js) | prevent-listener |
| [prevent-adfly](../wiki/about-scriptlets.md#prevent-adfly) | adfly-defuser.js (removed) |  |
| [prevent-bab](../wiki/about-scriptlets.md#prevent-bab) |  |  |
| [prevent-element-src-loading](../wiki/about-scriptlets.md#prevent-element-src-loading) |  |  |
| [prevent-eval-if](../wiki/about-scriptlets.md#prevent-eval-if) | noeval-if.js (prevent-eval-if.js) |  |
| [prevent-fab-3.2.0](../wiki/about-scriptlets.md#prevent-fab-3.2.0) |  |  |
| [prevent-fetch](../wiki/about-scriptlets.md#prevent-fetch) | prevent-fetch.js (no-fetch-if.js) |  |
| [prevent-xhr](../wiki/about-scriptlets.md#prevent-xhr) | no-xhr-if.js (prevent-xhr.js) |  |
| [prevent-popads-net](../wiki/about-scriptlets.md#prevent-popads-net) |  |  |
| [prevent-refresh](../wiki/about-scriptlets.md#prevent-refresh) | prevent-refresh.js (refresh-defuser.js) |  |
| [prevent-requestAnimationFrame](../wiki/about-scriptlets.md#prevent-requestAnimationFrame) | no-requestAnimationFrame-if.js (norafif.js, prevent-requestAnimationFrame.js) |  |
| [prevent-setInterval](../wiki/about-scriptlets.md#prevent-setInterval) | no-setInterval-if.js (nosiif.js, prevent-setInterval.js, setInterval-defuser.js) |  |
| [prevent-setTimeout](../wiki/about-scriptlets.md#prevent-setTimeout) | no-setTimeout-if.js (nostif.js, prevent-setTimeout.js, setTimeout-defuser.js) |  |
| [prevent-window-open](../wiki/about-scriptlets.md#prevent-window-open) | no-window-open-if.js (nowoif.js, prevent-window-open.js, window.open-defuser.js) |  |
| [remove-attr](../wiki/about-scriptlets.md#remove-attr) | remove-attr.js (ra.js) |  |
| [remove-class](../wiki/about-scriptlets.md#remove-class) | remove-class.js (rc.js) |  |
| [remove-cookie](../wiki/about-scriptlets.md#remove-cookie) | remove-cookie.js (cookie-remover.js) | cookie-remover |
| [remove-node-text](../wiki/about-scriptlets.md#remove-node-text) | remove-node-text.js (rmnt.js) |  |
| [scorecardresearch-beacon](../wiki/about-scriptlets.md#scorecardresearch-beacon) |  |  |
| [set-attr](../wiki/about-scriptlets.md#set-attr) | set-attr.js |  |
| [set-constant](../wiki/about-scriptlets.md#set-constant) | set-constant.js (set.js) | override-property-read |
| [set-cookie](../wiki/about-scriptlets.md#set-cookie) | set-cookie.js |  |
| [set-cookie-reload](../wiki/about-scriptlets.md#set-cookie-reload) | set-cookie-reload.js |  |
| [set-local-storage-item](../wiki/about-scriptlets.md#set-local-storage-item) | set-local-storage-item.js |  |
| [set-popads-dummy](../wiki/about-scriptlets.md#set-popads-dummy) |  |  |
| [set-session-storage-item](../wiki/about-scriptlets.md#set-session-storage-item) | set-session-storage-item.js |  |
| [spoof-css](../wiki/about-scriptlets.md#spoof-css) | spoof-css.js |  |
| [xml-prune](../wiki/about-scriptlets.md#xml-prune) | xml-prune.js |  |
|  | webrtc-if.js |  |
|  | overlay-buster.js |  |
|  | alert-buster.js |  |
|  | golem.de.js (removed) |  |
| [href-sanitizer](../wiki/about-scriptlets.md#href-sanitizer) | href-sanitizer.js |  |
|  |  | abort-on-iframe-property-read |
|  |  | abort-on-iframe-property-write |
|  |  | freeze-element |
|  |  | json-override |
|  |  | simulate-mouse-event |
|  |  | strip-fetch-query-parameter |
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
|  | window.name-defuser.js |  |
|  | trusted-set-constant.js (trusted-set.js) |  |
|  | trusted-set-cookie.js |  |
|  | trusted-set-local-storage-item.js |  |
|  | trusted-replace-fetch-response.js (trusted-rpfr.js) |  |
| [json-prune-fetch-response](../wiki/about-scriptlets.md#json-prune-fetch-response) | json-prune-fetch-response.js |  |
| [json-prune-xhr-response](../wiki/about-scriptlets.md#json-prune-xhr-response) | json-prune-xhr-response.js |  |
|  | trusted-replace-xhr-response.js |  |
|  | multiup.js |  |
|  | prevent-canvas.js |  |
|  | trusted-set-cookie-reload.js |  |
|  | trusted-click-element.js |  |
|  | trusted-prune-inbound-object.js |  |
|  | trusted-prune-outbound-object.js |  |
|  | trusted-set-session-storage-item.js |  |
|  | trusted-replace-node-text.js (trusted-rpnt.js, replace-node-text.js, rpnt.js) |  |
|  | remove-cache-storage-item.js |  |
|  | trusted-replace-argument.js |  |
|  | trusted-replace-outbound-text.js |  |


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
| [google-analytics](../wiki/about-redirects.md#google-analytics) | google-analytics_analytics.js |  |
| [google-analytics-ga](../wiki/about-redirects.md#google-analytics-ga) | google-analytics_ga.js |  |
| [google-ima3](../wiki/about-redirects.md#google-ima3) | google-ima.js |  |
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
| [noopvmap-1.0](../wiki/about-redirects.md#noopvmap-1.0) | noop-vmap1.0.xml |  |
| [noopvast-2.0](../wiki/about-redirects.md#noopvast-2.0) |  |  |
| [noopvast-3.0](../wiki/about-redirects.md#noopvast-3.0) |  |  |
| [noopvast-4.0](../wiki/about-redirects.md#noopvast-4.0) |  |  |
| [pardot-1.0](../wiki/about-redirects.md#pardot-1.0) |  |  |
| [prebid](../wiki/about-redirects.md#prebid) |  |  |
| [prebid-ads](../wiki/about-redirects.md#prebid-ads) | prebid-ads.js |  |
| [prevent-bab](../wiki/about-redirects.md#prevent-bab) | nobab.js |  |
| [prevent-bab2](../wiki/about-redirects.md#prevent-bab2) | nobab2.js |  |
| [prevent-fab-3.2.0](../wiki/about-redirects.md#prevent-fab-3.2.0) | nofab.js |  |
| [prevent-popads-net](../wiki/about-redirects.md#prevent-popads-net) | popads.js |  |
| [scorecardresearch-beacon](../wiki/about-redirects.md#scorecardresearch-beacon) | scorecardresearch_beacon.js |  |
| [set-popads-dummy](../wiki/about-redirects.md#set-popads-dummy) | popads-dummy.js |  |
|  | addthis_widget.js (removed) |  |
|  | amazon_ads.js |  |
|  | ampproject_v0.js |  |
|  | chartbeat.js |  |
|  | doubleclick_instream_ad_status.js |  |
| [empty](../wiki/about-redirects.md#empty) | empty |  |
|  | google-analytics_cx_api.js |  |
|  | google-analytics_inpage_linkid.js |  |
|  | hd-main.js |  |
|  | ligatus_angular-tag.js (removed) |  |
|  | monkeybroker.js (removed) |  |
|  | outbrain-widget.js |  |
|  | window.open-defuser.js (removed) |  |
|  | noeval.js |  |
|  | mxpnl_mixpanel.js (removed) |  |
|  | noop-0.5s.mp3 |  |
