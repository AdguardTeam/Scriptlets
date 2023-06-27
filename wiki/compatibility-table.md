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
| [adjust-setInterval](../wiki/about-scriptlets.md#adjust-setInterval) | nano-setInterval-booster.js (nano-sib.js) |  |
| [adjust-setTimeout](../wiki/about-scriptlets.md#adjust-setTimeout) | nano-setTimeout-booster.js (nano-stb.js) |  |
| [close-window](../wiki/about-scriptlets.md#close-window) | window-close-if.js |  |
| [debug-current-inline-script](../wiki/about-scriptlets.md#debug-current-inline-script) |  |  |
| [debug-on-property-read](../wiki/about-scriptlets.md#debug-on-property-read) |  |  |
| [debug-on-property-write](../wiki/about-scriptlets.md#debug-on-property-write) |  |  |
| [dir-string](../wiki/about-scriptlets.md#dir-string) |  |  |
| [disable-newtab-links](../wiki/about-scriptlets.md#disable-newtab-links) | disable-newtab-links.js |  |
| [evaldata-prune](../wiki/about-scriptlets.md#evaldata-prune) | evaldata-prune.js |  |
| [json-prune](../wiki/about-scriptlets.md#json-prune) | json-prune.js | json-prune |
| [log](../wiki/about-scriptlets.md#log) |  | log |
| [log-addEventListener](../wiki/about-scriptlets.md#log-addEventListener) | addEventListener-logger.js (aell.js) (removed) |  |
| [log-eval](../wiki/about-scriptlets.md#log-eval) |  |  |
| [log-on-stack-trace](../wiki/about-scriptlets.md#log-on-stack-trace) |  |  |
| [m3u-prune](../wiki/about-scriptlets.md#m3u-prune) | m3u-prune.js |  |
| [noeval](../wiki/about-scriptlets.md#noeval) |  |  |
| [nowebrtc](../wiki/about-scriptlets.md#nowebrtc) | nowebrtc.js |  |
| [no-topics](../wiki/about-scriptlets.md#no-topics) |  |  |
| [prevent-addEventListener](../wiki/about-scriptlets.md#prevent-addEventListener) | addEventListener-defuser.js (aeld.js) |  |
| [prevent-adfly](../wiki/about-scriptlets.md#prevent-adfly) | adfly-defuser.js |  |
| [prevent-bab](../wiki/about-scriptlets.md#prevent-bab) |  |  |
| [prevent-eval-if](../wiki/about-scriptlets.md#prevent-eval-if) | noeval-if.js |  |
| [prevent-fab-3.2.0](../wiki/about-scriptlets.md#prevent-fab-3.2.0) |  |  |
| [prevent-fetch](../wiki/about-scriptlets.md#prevent-fetch) | no-fetch-if.js |  |
| [prevent-xhr](../wiki/about-scriptlets.md#prevent-xhr) | no-xhr-if.js |  |
| [prevent-popads-net](../wiki/about-scriptlets.md#prevent-popads-net) |  |  |
| [prevent-refresh](../wiki/about-scriptlets.md#prevent-refresh) | refresh-defuser.js |  |
| [prevent-requestAnimationFrame](../wiki/about-scriptlets.md#prevent-requestAnimationFrame) | no-requestAnimationFrame-if.js (norafif.js) |  |
| [prevent-setInterval](../wiki/about-scriptlets.md#prevent-setInterval) | no-setInterval-if.js (nosiif.js) |  |
| [prevent-setTimeout](../wiki/about-scriptlets.md#prevent-setTimeout) | no-setTimeout-if.js (nostif.js, setTimeout-defuser.js) |  |
| [prevent-window-open](../wiki/about-scriptlets.md#prevent-window-open) |  |  |
| [remove-attr](../wiki/about-scriptlets.md#remove-attr) | remove-attr.js (ra.js) |  |
| [remove-class](../wiki/about-scriptlets.md#remove-class) | remove-class.js (rc.js) |  |
| [remove-cookie](../wiki/about-scriptlets.md#remove-cookie) | cookie-remover.js |  |
| [remove-node-text](../wiki/about-scriptlets.md#remove-node-text) | remove-node-text.js (rmnt.js) |  |
| [set-attr](../wiki/about-scriptlets.md#set-attr) |  |  |
| [set-constant](../wiki/about-scriptlets.md#set-constant) | set-constant.js (set.js) | override-property-read |
| [set-local-storage-item](../wiki/about-scriptlets.md#set-local-storage-item) | set-local-storage-item.js |  |
| [set-popads-dummy](../wiki/about-scriptlets.md#set-popads-dummy) |  |  |
| [set-session-storage-item](../wiki/about-scriptlets.md#set-session-storage-item) |  |  |
| [xml-prune](../wiki/about-scriptlets.md#xml-prune) | xml-prune.js |  |
|  | webrtc-if.js |  |
|  | overlay-buster.js |  |
|  | alert-buster.js |  |
|  | gpt-defuser.js (removed) |  |
|  | golem.de.js |  |
|  | upmanager-defuser.js (removed) |  |
|  | smartadserver.com.js (removed) |  |
|  | damoh-defuser.js (removed) |  |
|  | twitch-videoad.js (removed) |  |
|  | href-sanitizer.js |  |
|  | call-nothrow.js |  |
|  |  | trace |
|  |  | hide-if-shadow-contains |
|  |  | hide-if-contains |
|  |  | hide-if-contains-visible-text |
|  |  | hide-if-contains-and-matches-style |
|  |  | hide-if-has-and-matches-style |
|  |  | hide-if-contains-image |
|  |  | strip-fetch-query-parameter |
|  |  | hide-if-contains-image-hash |
|  |  | ml-hide-if-graph-matches |
|  |  | debug |
|  |  | hide-if-labelled-by |
|  |  | hide-if-matches-xpath |
|  |  | profile |
|  |  | freeze-element |
|  |  | prepareInjection |
|  |  | commitInjection |
|  |  | abort-on-iframe-property-read |
|  |  | abort-on-iframe-property-write |
|  | no-floc.js (removed) |  |
|  | window.name-defuser.js |  |
|  | spoof-css.js |  |
|  | replace-node-text.js (rpnt.js, sed.js) |  |
|  | trusted-set-constant.js (trusted-set.js) |  |
|  | set-cookie.js |  |
|  | no-window-open-if.js (nowoif.js) |  |
|  | trusted-set-cookie.js |  |
|  | trusted-set-local-storage-item.js |  |


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
| [fingerprintjs2](../wiki/about-redirects.md#fingerprintjs2) | fingerprint2.js |  |
| [fingerprint3js](../wiki/about-redirects.md#fingerprint3js) | fingerprint3.js |  |
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
| [noopjson](../wiki/about-redirects.md#noopjson) |  |  |
| [nooptext](../wiki/about-redirects.md#nooptext) | noop.txt | blank-text |
| [noopmp3-0.1s](../wiki/about-redirects.md#noopmp3-0.1s) | noop-0.1s.mp3 | blank-mp3 |
| [noopmp4-1s](../wiki/about-redirects.md#noopmp4-1s) | noop-1s.mp4 | blank-mp4 |
| [noopvmap-1.0](../wiki/about-redirects.md#noopvmap-1.0) | noop-vmap1.0.xml |  |
| [noopvast-2.0](../wiki/about-redirects.md#noopvast-2.0) |  |  |
| [noopvast-3.0](../wiki/about-redirects.md#noopvast-3.0) |  |  |
| [pardot-1.0](../wiki/about-redirects.md#pardot-1.0) |  |  |
| [noopvast-4.0](../wiki/about-redirects.md#noopvast-4.0) |  |  |
| [prebid-ads](../wiki/about-redirects.md#prebid-ads) | prebid-ads.js |  |
| [prevent-bab](../wiki/about-redirects.md#prevent-bab) | nobab.js |  |
| [prevent-bab2](../wiki/about-redirects.md#prevent-bab2) | nobab2.js |  |
| [prevent-fab-3.2.0](../wiki/about-redirects.md#prevent-fab-3.2.0) | nofab.js |  |
| [prevent-popads-net](../wiki/about-redirects.md#prevent-popads-net) | popads.js |  |
| [scorecardresearch-beacon](../wiki/about-redirects.md#scorecardresearch-beacon) | scorecardresearch_beacon.js |  |
| [set-popads-dummy](../wiki/about-redirects.md#set-popads-dummy) | popads-dummy.js |  |
|  | addthis_widget.js |  |
|  | amazon_ads.js |  |
|  | ampproject_v0.js |  |
|  | chartbeat.js |  |
|  | doubleclick_instream_ad_status.js |  |
| [empty](../wiki/about-redirects.md#empty) | empty |  |
|  | google-analytics_cx_api.js |  |
|  | google-analytics_inpage_linkid.js |  |
|  | hd-main.js |  |
|  | ligatus_angular-tag.js |  |
|  | monkeybroker.js |  |
|  | outbrain-widget.js |  |
|  | window.open-defuser.js |  |
|  | noeval.js |  |
|  | mxpnl_mixpanel.js |  |
|  | noop-0.5s.mp3 |  |
