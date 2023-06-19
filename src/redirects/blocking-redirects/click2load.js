function clickToLoad() {
    const QUESTION_MARK = '?';
    const AMPERSAND = '&';
    const SEARCH_PARAMS_DIVIDER = '=';

    // simple 'origin' parameter name can appear in urls very often
    // so we rather need more unique one
    const ORIGIN_URL_PARAM = '__origin';
    const EXT_UNBLOCK_PARAM = '__unblock';
    const CL_UNBLOCK_PARAM = '__adg_unblock_token';
    const CL_SPECIFIC_UNBLOCK_PARAM = '__adg_unblock';
    const BLOCKING_RULE_PARAM = '__adg_blocking_rule';

    const CLICK_EVENT = 'click';
    const CL_FORCE_EVENT = 'force';

    const neededParams = [
        ORIGIN_URL_PARAM,
        EXT_UNBLOCK_PARAM,
        CL_UNBLOCK_PARAM,
        BLOCKING_RULE_PARAM,
    ];

    /**
     * Parses search query url string to params object.
     *
     * Some browsers does not support URL.searchParams.get()
     * but we need script run with no error
     * because frame will be shown anyway if click2load redirect rule used
     *
     * @param {string} rawQueryStr
     * @returns {object} key is parameter name and value is parameter value
     */
    const parseSearchParam = (rawQueryStr) => {
        const res = {};
        const pattern = /([^&=]+)=([^&]*)/g;
        let matchedData;
        let queryStr = rawQueryStr.substring(1);
        // eslint-disable-next-line no-cond-assign
        while (matchedData = pattern.exec(queryStr)) {
            if (neededParams.includes(matchedData[1])) {
                // destructuring will not work because of babel
                // eslint-disable-next-line prefer-destructuring
                res[matchedData[1]] = matchedData[2];
            }
            queryStr = queryStr.substring(matchedData[0]);
        }
        return res;
    };

    const paramsData = parseSearchParam(window.location.search);
    const getParamByKey = (key) => {
        return paramsData[key] || '';
    };
    const extUnblockToken = getParamByKey(EXT_UNBLOCK_PARAM);
    const clUnblockToken = getParamByKey(CL_UNBLOCK_PARAM);
    const blockingRule = getParamByKey(BLOCKING_RULE_PARAM);

    const originUrl = clUnblockToken
        // corelibs redirects to origin url with extra params
        // and do not pass origin url in '__origin' param
        ? window.location.href
        : decodeURIComponent(getParamByKey(ORIGIN_URL_PARAM));

    const clickTitleElem = document.getElementById('clickToLoadTitle');
    const clickSubtitleElem = document.getElementById('clickToLoadSubtitle');
    const clickButtonElem = document.getElementById('clickToLoadLink');

    const originUrlToDisplay = clUnblockToken
        ? originUrl.replace(/[&?]__adg_unblock_token=.*/, '')
        : originUrl;
    clickSubtitleElem.textContent = originUrlToDisplay;
    clickButtonElem.href = originUrlToDisplay;
    clickButtonElem.title = originUrlToDisplay;

    // translations for our languages
    const translationsData = {
        en: {
            title: 'Content blocked by AdGuard',
            button: 'Click to load',
        },
        ru: {
            title: 'AdGuard заблокировал загрузку контента',
            button: 'Всё равно загрузить',
        },
        es: {
            title: 'Contenido bloqueado por AdGuard',
            button: 'Pulsa para cargar',
        },
        fr: {
            title: 'Contenu bloqué par AdGuard',
            button: 'Cliquez pour télécharger',
        },
        it: {
            title: 'Contenuti bloccati da AdGuard',
            button: 'Clicca per scaricare',
        },
        de: {
            title: 'Inhalt blockiert durch AdGuard',
            button: 'Trotzdem laden',
        },
        'zh-cn': {
            title: 'AdGuard 已将该内容屏蔽',
            button: '点击加载',
        },
        'zh-tw': {
            title: 'AdGuard 已將該內容封鎖',
            button: '點按載入',
        },
        ko: {
            title: 'AdGuard에 의해 차단된 콘텐츠',
            button: '로드하려면 클릭하세요',
        },
        ja: {
            title: 'AdGuardがコンテンツをブロックしました。',
            button: '読み込むにはこちらをクリック',
        },
        uk: {
            title: 'AdGuard заблокував завантаження вмісту',
            button: 'Однаково завантажити',
        },
    };

    /**
     * Returns translations data for navigator.language
     * or 'en' if navigator.language is not supported
     *
     * @returns {object} data for one locale with 'title' and 'button' keys
     */
    const getTranslations = () => {
        const baseLocaleData = translationsData.en;
        try {
            const currentLocale = navigator.language.toLowerCase();
            let localeData = translationsData[currentLocale];
            if (!localeData) {
                const lang = currentLocale.split('-')[0];
                localeData = translationsData[lang];
            }
            if (!localeData) {
                localeData = baseLocaleData;
            }
            return localeData;
        } catch (e) {
            return baseLocaleData;
        }
    };
    const translations = getTranslations();

    clickTitleElem.textContent = translations.title;
    clickButtonElem.textContent = translations.button;

    /**
     * Prepares frame url to replace on button click
     *
     * @param {string} originUrl passed origin frame url
     * @param {string} unblockTokenName param name for further validation
     * @param {string} unblockTokenValue param value for further validation
     * @returns {string}
     */
    const getReplaceUrl = (originUrl, unblockTokenName, unblockTokenValue) => {
        // check whether frameURL already has '?'
        const questionMarkIndex = originUrl.indexOf(QUESTION_MARK);
        let divider = questionMarkIndex > -1
            ? AMPERSAND
            : QUESTION_MARK;
        if (originUrl.substring(questionMarkIndex).length === 1) {
            // no divider needed for url with question mark && without search params
            divider = '';
        }
        // eslint-disable-next-line max-len
        return `${originUrl}${divider}${unblockTokenName}${SEARCH_PARAMS_DIVIDER}${unblockTokenValue}`;
    };

    /**
     * Runs on button click for extension
     */
    const extRun = () => {
        const replaceUrl = getReplaceUrl(originUrl, EXT_UNBLOCK_PARAM, extUnblockToken);
        window.location.replace(replaceUrl);
    };

    /**
     * Runs on button click for corelibs
     */
    const clRun = () => {
        // corelibs originUrl already have randomly generated token in it
        // still one specific unblock token has to be returned
        const CL_SPECIFIC_UNBLOCK_VALUE = 1;
        const replaceUrl = getReplaceUrl(
            originUrl,
            CL_SPECIFIC_UNBLOCK_PARAM,
            CL_SPECIFIC_UNBLOCK_VALUE,
        );
        window.location.replace(replaceUrl);
    };

    clickButtonElem.addEventListener(CLICK_EVENT, (e) => {
        // check whether the button clicked by user
        if (e.isTrusted === false) {
            return;
        }

        if (extUnblockToken) {
            extRun();
        } else if (clUnblockToken) {
            clRun();
        }

        e.preventDefault();
        e.stopPropagation();
    });

    // custom listener for corelibs force click without e.isTrusted checking
    clickButtonElem.addEventListener(CL_FORCE_EVENT, () => {
        clRun();
    });

    /**
     * Checks whether the rule has 'frame' or 'subdocument' modifier
     *
     * @param {string} rule blocking rules passed into redirect
     * @returns {boolean}
     */
    const hasFrameModifier = (rule) => {
        const substringAfter = (str, separator) => {
            const index = str.indexOf(separator);
            return index < 0 ? '' : str.substring(index + separator.length);
        };
        const FRAME_MARKER = 'frame';
        const SUBDOCUMENT_MARKER = 'subdocument';
        const ruleModifiers = substringAfter(rule, '$').split(',');
        return ruleModifiers.includes(FRAME_MARKER)
            || ruleModifiers.includes(SUBDOCUMENT_MARKER);
    };
    /**
     * Checks whether script runs inside a frame
     *
     * @returns {boolean}
     */
    const isInsideFrame = () => window.self !== window.top;

    // click through immediately for corelibs
    // if blockingRule passed and there is "frame" type in rule but webpage is not a frame
    // AG-10697, paragraph 4.1
    if (clUnblockToken
        && blockingRule
        && hasFrameModifier(blockingRule)
        && !isInsideFrame()) {
        clickButtonElem.dispatchEvent(CL_FORCE_EVENT);
    }
}

clickToLoad();
