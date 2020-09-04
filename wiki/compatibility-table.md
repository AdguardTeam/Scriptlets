# <a id="scriptlets"></a> Scriptlets compatibility table

| AdGuard | uBO | Adblock Plus |
|---|---|---|
| abort-current-inline-script | abort-current-inline-script.js (acis.js) | abort-current-inline-script |
| abort-on-property-read | abort-on-property-read.js (aopr.js) | abort-on-property-read |
| abort-on-property-write | abort-on-property-write.js (aopw.js) | abort-on-property-write |
| adjust-setInterval | nano-setInterval-booster.js (nano-sib.js) |  |
| adjust-setTimeout | nano-setTimeout-booster.js (nano-stb.js) |  |
| debug-current-inline-script |  |  |
| debug-on-property-read |  |  |
| debug-on-property-write |  |  |
| dir-string |  | dir-string |
| disable-newtab-links | disable-newtab-links.js |  |
| json-prune | json-prune.js | json-prune |
| log-addEventListener | addEventListener-logger.js (aell.js) |  |
| log-eval |  |  |
| log |  | log |
| noeval |  |  |
| nowebrtc | nowebrtc.js |  |
| prevent-addEventListener | addEventListener-defuser.js (aeld.js) |  |
| prevent-adfly | adfly-defuser.js |  |
| prevent-bab |  |  |
| prevent-eval-if | noeval-if.js |  |
| prevent-fab-3.2.0 |  |  |
| prevent-popads-net |  |  |
| prevent-requestAnimationFrame | no-requestAnimationFrame-if.js (norafif.js) |  |
| prevent-setInterval | no-setInterval-if.js (nosiif.js) |  |
| prevent-setTimeout | no-setTimeout-if.js (nostif.js) |  |
| prevent-window-open |  |  |
| remove-attr | remove-attr.js (ra.js) |  |
| remove-class | remove-class.js (rc.js) |  |
| remove-cookie | cookie-remover.js |  |
| set-constant | set-constant.js (set.js) | override-property-read |
| set-popads-dummy |  |  |
|  | setInterval-defuser.js (sid.js) |  |
|  | setTimeout-defuser.js (std.js) |  |
|  | requestAnimationFrame-if.js (raf-if.js) |  |
|  | webrtc-if.js |  |
|  | overlay-buster.js |  |
|  | alert-buster.js |  |
|  | gpt-defuser.js |  |
|  | golem.de.js |  |
|  | upmanager-defuser.js |  |
|  | smartadserver.com.js |  |
|  | damoh-defuser.js |  |
|  | twitch-videoad.js |  |
|  | fingerprint2.js |  |
|  |  | trace |
|  |  | uabinject-defuser |
|  |  | hide-if-shadow-contains |
|  |  | hide-if-contains |
|  |  | hide-if-contains-visible-text |
|  |  | hide-if-contains-and-matches-style |
|  |  | hide-if-has-and-matches-style |
|  |  | hide-if-contains-image |
|  |  | readd |
|  |  | strip-fetch-query-parameter |
|  |  | hide-if-contains-image-hash |
|  |  | ml-hide-if-graph-matches |
|  |  | debug |
|  |  | hide-if-labelled-by |
|  |  | hide-if-matches-xpath |
|  |  | profile |
|  |  | freeze-element |


# <a id="redirects"></a> Redirects compatibility table

| AdGuard | uBO | Adblock Plus |
|---|---|---|
| 1x1-transparent.gif | 1x1.gif | 1x1-transparent-gif |
| 2x2-transparent.png | 2x2.png | 2x2-transparent-png |
| 3x2-transparent.png | 3x2.png | 3x2-transparent-png |
| 32x32-transparent.png | 32x32.png | 32x32-transparent-png |
| amazon-apstag | amazon_apstag.js |  |
| google-analytics | google-analytics_analytics.js |  |
| google-analytics-ga | google-analytics_ga.js |  |
| googlesyndication-adsbygoogle | googlesyndication_adsbygoogle.js |  |
| googletagmanager-gtm | googletagmanager_gtm.js |  |
| googletagservices-gpt | googletagservices_gpt.js |  |
| metrika-yandex-watch |  |  |
| metrika-yandex-tag |  |  |
| noeval | noeval-silent.js |  |
| noopcss |  | blank-css |
| noopframe | noop.html | blank-html |
| noopjs | noop.js | blank-js |
| nooptext | noop.txt | blank-text |
| noopmp3-0.1s | noop-0.1s.mp3 | blank-mp3 |
| noopmp4-1s | noop-1s.mp4 | blank-mp4 |
| noopvmap-1.0 |  |  |
| noopvast-2.0 |  |  |
| noopvast-3.0 |  |  |
| prevent-fab-3.2.0 | nofab.js |  |
| prevent-popads-net | popads.js |  |
| scorecardresearch-beacon | scorecardresearch_beacon.js |  |
| set-popads-dummy | popads-dummy.js |  |
|  | addthis_widget.js |  |
|  | amazon_ads.js |  |
|  | ampproject_v0.js |  |
|  | chartbeat.js |  |
|  | doubleclick_instream_ad_status.js |  |
|  | empty |  |
|  | google-analytics_cx_api.js |  |
|  | google-analytics_inpage_linkid.js |  |
|  | hd-main.js |  |
|  | ligatus_angular-tag.js |  |
|  | monkeybroker.js |  |
|  | outbrain-widget.js |  |
|  | window.open-defuser.js |  |
|  | nobab.js |  |
|  | noeval.js |  |
