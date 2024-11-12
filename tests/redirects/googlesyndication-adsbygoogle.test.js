import { clearGlobalProps, getRedirectsInstance, evalWrapper } from '../helpers';

const { test, module } = QUnit;
const name = 'googlesyndication-adsbygoogle';

const changingProps = ['adsbygoogle'];

const afterEach = () => {
    clearGlobalProps(...changingProps);
};

let redirects;
const before = async () => {
    redirects = await getRedirectsInstance();
};

module(name, { afterEach, before });

// Create advertisement section
const createAdElement = () => {
    const ad = document.createElement('div');
    ad.classList.add('adsbygoogle');
    document.body.appendChild(ad);
    return ad;
};

const removeBodyElement = (elem) => {
    document.body.removeChild(elem);
};

test('Checking if alias name works', (assert) => {
    const codeByAdgParams = redirects.getRedirect(name).content;
    const codeByUboParams = redirects.getRedirect('ubo-googlesyndication_adsbygoogle.js').content;

    assert.strictEqual(codeByAdgParams, codeByUboParams);
});

test('Redirect testing', (assert) => {
    const ad = createAdElement();
    evalWrapper(redirects.getRedirect(name).content);

    // check if iframes were created by scriptlet
    const adsbygoogleElems = document.getElementsByClassName('adsbygoogle');
    const hasAdAttr = adsbygoogleElems[0].hasAttribute('data-adsbygoogle-status');
    const createdIframes = adsbygoogleElems[0].getElementsByTagName('iframe');
    const aswiftIframe = document.querySelector('#aswift_0');
    const googleadsIframe = document.querySelector('#google_ads_iframe_0');

    assert.strictEqual(hasAdAttr, true, '.adsbygoogle has \'data-adsbygoogle-status\' attribute');
    assert.ok(aswiftIframe, 'aswift iframe was created by scriptlet');
    assert.notEqual(aswiftIframe.contentWindow.length, 0, 'aswiftIframe.contentWindow was mocked by scriptlet');
    assert.ok(googleadsIframe, 'google_ads iframe was created by scriptlet');
    assert.notEqual(googleadsIframe.contentWindow.length, 0, 'aswiftIframe.contentWindow was mocked by scriptlet');
    assert.strictEqual(createdIframes.length, 2, '2 iframes was created as a child of .adsbygoogle');

    assert.strictEqual(window.adsbygoogle.length, undefined, 'adsbygoogle.length check');
    assert.strictEqual(window.adsbygoogle.push.length, 1, 'push.length check');
    const pushCallback = (arg) => {
        try {
            // Test for https://github.com/AdguardTeam/Scriptlets/issues/252
            // If arg is not defined then error will be thrown
            if (arg.whatever) {
                arg.whatever = 1;
            }
            assert.ok(typeof arg !== 'undefined', 'arg is defined');
        } catch (error) {
            assert.ok(false, 'something went wrong');
        }
    };
    const pushArg = {
        test: 'test',
        callback: pushCallback,
    };
    window.adsbygoogle.push(pushArg);
    assert.strictEqual(window.adsbygoogle.length, 1, 'API was mocked');

    removeBodyElement(ad);
});
