"use strict";

var trustedClickElement = require("./trusted-click-element.js");

var abortOnPropertyRead = require("./abort-on-property-read.js");

var abortOnPropertyWrite = require("./abort-on-property-write.js");

var preventSetTimeout = require("./prevent-setTimeout.js");

var preventSetInterval = require("./prevent-setInterval.js");

var preventWindowOpen = require("./prevent-window-open.js");

var abortCurrentInlineScript = require("./abort-current-inline-script.js");

var setConstant = require("./set-constant.js");

var removeCookie = require("./remove-cookie.js");

var preventAddEventListener = require("./prevent-addEventListener.js");

var preventBab = require("./prevent-bab.js");

var nowebrtc = require("./nowebrtc.js");

var logAddEventListener = require("./log-addEventListener.js");

var logEval = require("./log-eval.js");

var log = require("./log.js");

var noeval = require("./noeval.js");

var preventEvalIf = require("./prevent-eval-if.js");

var preventFab3_2_0 = require("./prevent-fab-3.2.0.js");

var setPopadsDummy = require("./set-popads-dummy.js");

var preventPopadsNet = require("./prevent-popads-net.js");

var preventAdfly = require("./prevent-adfly.js");

var debugOnPropertyRead = require("./debug-on-property-read.js");

var debugOnPropertyWrite = require("./debug-on-property-write.js");

var debugCurrentInlineScript = require("./debug-current-inline-script.js");

var removeAttr = require("./remove-attr.js");

var setAttr = require("./set-attr.js");

var removeClass = require("./remove-class.js");

var disableNewtabLinks = require("./disable-newtab-links.js");

var adjustSetInterval = require("./adjust-setInterval.js");

var adjustSetTimeout = require("./adjust-setTimeout.js");

var dirString = require("./dir-string.js");

var jsonPrune = require("./json-prune.js");

var preventRequestAnimationFrame = require("./prevent-requestAnimationFrame.js");

var setCookie = require("./set-cookie.js");

var setCookieReload = require("./set-cookie-reload.js");

var hideInShadowDom = require("./hide-in-shadow-dom.js");

var removeInShadowDom = require("./remove-in-shadow-dom.js");

var preventFetch = require("./prevent-fetch.js");

var setLocalStorageItem = require("./set-local-storage-item.js");

var setSessionStorageItem = require("./set-session-storage-item.js");

var abortOnStackTrace = require("./abort-on-stack-trace.js");

var logOnStackTrace = require("./log-on-stack-trace.js");

var preventXhr = require("./prevent-xhr.js");

var closeWindow = require("./close-window.js");

var preventRefresh = require("./prevent-refresh.js");

var preventElementSrcLoading = require("./prevent-element-src-loading.js");

var noTopics = require("./no-topics.js");

var trustedReplaceXhrResponse = require("./trusted-replace-xhr-response.js");

var xmlPrune = require("./xml-prune.js");

var m3uPrune = require("./m3u-prune.js");

var trustedSetCookie = require("./trusted-set-cookie.js");

var trustedSetCookieReload = require("./trusted-set-cookie-reload.js");

var trustedReplaceFetchResponse = require("./trusted-replace-fetch-response.js");

var trustedSetLocalStorageItem = require("./trusted-set-local-storage-item.js");

var trustedSetSessionStorageItem = require("./trusted-set-session-storage-item.js");

var trustedSetConstant = require("./trusted-set-constant.js");

var injectCssInShadowDom = require("./inject-css-in-shadow-dom.js");

var removeNodeText = require("./remove-node-text.js");

var trustedReplaceNodeText = require("./trusted-replace-node-text.js");

var evaldataPrune = require("./evaldata-prune.js");

var trustedPruneInboundObject = require("./trusted-prune-inbound-object.js");

var trustedSetAttr = require("./trusted-set-attr.js");

var spoofCss = require("./spoof-css.js");

var callNothrow = require("./call-nothrow.js");

var trustedCreateElement = require("./trusted-create-element.js");

var hrefSanitizer = require("./href-sanitizer.js");

var jsonPruneFetchResponse = require("./json-prune-fetch-response.js");

var noProtectedAudience = require("./no-protected-audience.js");

var trustedSuppressNativeMethod = require("./trusted-suppress-native-method.js");

var jsonPruneXhrResponse = require("./json-prune-xhr-response.js");

var trustedDispatchEvent = require("./trusted-dispatch-event.js");

var trustedReplaceOutboundText = require("./trusted-replace-outbound-text.js");

var preventCanvas = require("./prevent-canvas.js");

var amazonApstag = require("../redirects/amazon-apstag.js");

var didomiLoader = require("../redirects/didomi-loader.js");

var fingerprintjs2 = require("../redirects/fingerprintjs2.js");

var fingerprintjs3 = require("../redirects/fingerprintjs3.js");

var gemius = require("../redirects/gemius.js");

var googleAnalytics = require("../redirects/google-analytics.js");

var googleAnalyticsGa = require("../redirects/google-analytics-ga.js");

var googleIma3 = require("../redirects/google-ima3.js");

var googlesyndicationAdsbygoogle = require("../redirects/googlesyndication-adsbygoogle.js");

var googletagservicesGpt = require("../redirects/googletagservices-gpt.js");

var matomo = require("../redirects/matomo.js");

var metrikaYandexTag = require("../redirects/metrika-yandex-tag.js");

var metrikaYandexWatch = require("../redirects/metrika-yandex-watch.js");

var naverWcslog = require("../redirects/naver-wcslog.js");

var pardot1_0 = require("../redirects/pardot-1.0.js");

var prebid = require("../redirects/prebid.js");

var scorecardresearchBeacon = require("../redirects/scorecardresearch-beacon.js");

exports.trustedClickElementNames = trustedClickElement.trustedClickElementNames;

exports.abortOnPropertyReadNames = abortOnPropertyRead.abortOnPropertyReadNames;

exports.abortOnPropertyWriteNames = abortOnPropertyWrite.abortOnPropertyWriteNames;

exports.preventSetTimeoutNames = preventSetTimeout.preventSetTimeoutNames;

exports.preventSetIntervalNames = preventSetInterval.preventSetIntervalNames;

exports.preventWindowOpenNames = preventWindowOpen.preventWindowOpenNames;

exports.abortCurrentInlineScriptNames = abortCurrentInlineScript.abortCurrentInlineScriptNames;

exports.setConstantNames = setConstant.setConstantNames;

exports.removeCookieNames = removeCookie.removeCookieNames;

exports.preventAddEventListenerNames = preventAddEventListener.preventAddEventListenerNames;

exports.preventBabNames = preventBab.preventBabNames;

exports.nowebrtcNames = nowebrtc.nowebrtcNames;

exports.logAddEventListenerNames = logAddEventListener.logAddEventListenerNames;

exports.logEvalNames = logEval.logEvalNames;

exports.logNames = log.logNames;

exports.noevalNames = noeval.noevalNames;

exports.preventEvalIfNames = preventEvalIf.preventEvalIfNames;

exports.preventFabNames = preventFab3_2_0.preventFabNames;

exports.setPopadsDummyNames = setPopadsDummy.setPopadsDummyNames;

exports.preventPopadsNetNames = preventPopadsNet.preventPopadsNetNames;

exports.preventAdflyNames = preventAdfly.preventAdflyNames;

exports.debugOnPropertyReadNames = debugOnPropertyRead.debugOnPropertyReadNames;

exports.debugOnPropertyWriteNames = debugOnPropertyWrite.debugOnPropertyWriteNames;

exports.debugCurrentInlineScriptNames = debugCurrentInlineScript.debugCurrentInlineScriptNames;

exports.removeAttrNames = removeAttr.removeAttrNames;

exports.setAttrNames = setAttr.setAttrNames;

exports.removeClassNames = removeClass.removeClassNames;

exports.disableNewtabLinksNames = disableNewtabLinks.disableNewtabLinksNames;

exports.adjustSetIntervalNames = adjustSetInterval.adjustSetIntervalNames;

exports.adjustSetTimeoutNames = adjustSetTimeout.adjustSetTimeoutNames;

exports.dirStringNames = dirString.dirStringNames;

exports.jsonPruneNames = jsonPrune.jsonPruneNames;

exports.preventRequestAnimationFrameNames = preventRequestAnimationFrame.preventRequestAnimationFrameNames;

exports.setCookieNames = setCookie.setCookieNames;

exports.setCookieReloadNames = setCookieReload.setCookieReloadNames;

exports.hideInShadowDomNames = hideInShadowDom.hideInShadowDomNames;

exports.removeInShadowDomNames = removeInShadowDom.removeInShadowDomNames;

exports.preventFetchNames = preventFetch.preventFetchNames;

exports.setLocalStorageItemNames = setLocalStorageItem.setLocalStorageItemNames;

exports.setSessionStorageItemNames = setSessionStorageItem.setSessionStorageItemNames;

exports.abortOnStackTraceNames = abortOnStackTrace.abortOnStackTraceNames;

exports.logOnStackTraceNames = logOnStackTrace.logOnStackTraceNames;

exports.preventXHRNames = preventXhr.preventXHRNames;

exports.forceWindowCloseNames = closeWindow.forceWindowCloseNames;

exports.preventRefreshNames = preventRefresh.preventRefreshNames;

exports.preventElementSrcLoadingNames = preventElementSrcLoading.preventElementSrcLoadingNames;

exports.noTopicsNames = noTopics.noTopicsNames;

exports.trustedReplaceXhrResponseNames = trustedReplaceXhrResponse.trustedReplaceXhrResponseNames;

exports.xmlPruneNames = xmlPrune.xmlPruneNames;

exports.m3uPruneNames = m3uPrune.m3uPruneNames;

exports.trustedSetCookieNames = trustedSetCookie.trustedSetCookieNames;

exports.trustedSetCookieReloadNames = trustedSetCookieReload.trustedSetCookieReloadNames;

exports.trustedReplaceFetchResponseNames = trustedReplaceFetchResponse.trustedReplaceFetchResponseNames;

exports.trustedSetLocalStorageItemNames = trustedSetLocalStorageItem.trustedSetLocalStorageItemNames;

exports.trustedSetSessionStorageItemNames = trustedSetSessionStorageItem.trustedSetSessionStorageItemNames;

exports.trustedSetConstantNames = trustedSetConstant.trustedSetConstantNames;

exports.injectCssInShadowDomNames = injectCssInShadowDom.injectCssInShadowDomNames;

exports.removeNodeTextNames = removeNodeText.removeNodeTextNames;

exports.trustedReplaceNodeTextNames = trustedReplaceNodeText.trustedReplaceNodeTextNames;

exports.evalDataPruneNames = evaldataPrune.evalDataPruneNames;

exports.trustedPruneInboundObjectNames = trustedPruneInboundObject.trustedPruneInboundObjectNames;

exports.trustedSetAttrNames = trustedSetAttr.trustedSetAttrNames;

exports.spoofCSSNames = spoofCss.spoofCSSNames;

exports.callNoThrowNames = callNothrow.callNoThrowNames;

exports.trustedCreateElementNames = trustedCreateElement.trustedCreateElementNames;

exports.hrefSanitizerNames = hrefSanitizer.hrefSanitizerNames;

exports.jsonPruneFetchResponseNames = jsonPruneFetchResponse.jsonPruneFetchResponseNames;

exports.noProtectedAudienceNames = noProtectedAudience.noProtectedAudienceNames;

exports.trustedSuppressNativeMethodNames = trustedSuppressNativeMethod.trustedSuppressNativeMethodNames;

exports.jsonPruneXhrResponseNames = jsonPruneXhrResponse.jsonPruneXhrResponseNames;

exports.trustedDispatchEventNames = trustedDispatchEvent.trustedDispatchEventNames;

exports.trustedReplaceOutboundTextNames = trustedReplaceOutboundText.trustedReplaceOutboundTextNames;

exports.preventCanvasNames = preventCanvas.preventCanvasNames;

exports.AmazonApstagNames = amazonApstag.AmazonApstagNames;

exports.DidomiLoaderNames = didomiLoader.DidomiLoaderNames;

exports.Fingerprintjs2Names = fingerprintjs2.Fingerprintjs2Names;

exports.Fingerprintjs3Names = fingerprintjs3.Fingerprintjs3Names;

exports.GemiusNames = gemius.GemiusNames;

exports.GoogleAnalyticsNames = googleAnalytics.GoogleAnalyticsNames;

exports.GoogleAnalyticsGaNames = googleAnalyticsGa.GoogleAnalyticsGaNames;

exports.GoogleIma3Names = googleIma3.GoogleIma3Names;

exports.GoogleSyndicationAdsByGoogleNames = googlesyndicationAdsbygoogle.GoogleSyndicationAdsByGoogleNames;

exports.GoogleTagServicesGptNames = googletagservicesGpt.GoogleTagServicesGptNames;

exports.MatomoNames = matomo.MatomoNames;

exports.metrikaYandexTagNames = metrikaYandexTag.metrikaYandexTagNames;

exports.metrikaYandexWatchNames = metrikaYandexWatch.metrikaYandexWatchNames;

exports.NaverWcslogNames = naverWcslog.NaverWcslogNames;

exports.PardotNames = pardot1_0.PardotNames;

exports.PrebidNames = prebid.PrebidNames;

exports.ScoreCardResearchBeaconNames = scorecardresearchBeacon.ScoreCardResearchBeaconNames;
