/* eslint-disable no-underscore-dangle */
import {
    runScriptlet,
    clearGlobalProps,
    ATTR_SETTLE_DELAY_MS,
    createAttrMutationCounter,
    checkRulesSettle,
    makeUnrelatedDomChange,
    countLogsAfterDomChange,
    getSyncLogs,
    getLogs,
} from '../helpers';

const { test, module } = QUnit;
const name = 'href-sanitizer';

/**
 * Create link with href attribute and optional text and additional attribute
 * @param {string} href - link href
 * @param {string} text - link text
 * @param {string} attributeName - additional attribute name
 * @param {string} attributeValue - additional attribute value
 * @returns {HTMLAnchorElement} - created link element
 */
const createElem = (href, text, attributeName, attributeValue) => {
    const a = document.createElement('a');
    a.setAttribute('href', href);
    a.setAttribute('id', 'testHref');
    if (text) {
        a.textContent = text;
    }
    if (attributeName && attributeValue) {
        a.setAttribute(attributeName, attributeValue);
    }
    document.body.appendChild(a);
    return a;
};

const removeElem = () => {
    const elem = document.querySelectorAll('#testHref');
    elem.forEach((el) => {
        if (el) {
            el.remove();
        }
    });
};

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
    removeElem();
};

/**
 * Runs href-sanitizer rules and checks that after they are applied the page stays idle,
 * i.e. href is not re-set and hit is not called on unrelated DOM mutations.
 *
 * @param {object} assert QUnit assert
 * @param {Array<{elem: HTMLAnchorElement, args: string[], expectedHref: string}>} rules rules to run,
 * `elem` is the link sanitized by the rule
 * @param {boolean} [verbose=true] whether logging (hit) is enabled
 * @returns {Promise<void>}
 */
const checkLinksSettle = (assert, rules, verbose = true) => checkRulesSettle(
    assert,
    name,
    rules.map(({ elem, args }) => ({ elem, attr: 'href', args })),
    () => {
        rules.forEach(({ elem, expectedHref }) => {
            assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href has been sanitized');
        });
    },
    verbose,
);

let uniqueLinkCount = 0;

/**
 * Creates a link with a unique URL in `data-href` attribute, so rules from previous tests,
 * whose observers are still active, do not match it.
 *
 * @param {boolean} [withText=false] whether the link text should also contain the URL
 * @returns {{elem: HTMLAnchorElement, selector: string, expectedHref: string}} link, selector which
 * still matches the link after sanitization, and the URL expected in `href` after sanitization
 */
const createUniqueLink = (withText = false) => {
    uniqueLinkCount += 1;
    // domains should not be matched by selectors of other tests
    const expectedHref = `https://target.example/${uniqueLinkCount}`;
    const text = withText ? expectedHref : '';
    const elem = createElem(`https://tracker.example/${uniqueLinkCount}`, text, 'data-href', expectedHref);
    return { elem, selector: `a[data-href="${expectedHref}"]`, expectedHref };
};

/**
 * Creates two links, each one is sanitized by its own rule which still matches the link after sanitization.
 *
 * @returns {Array<{elem: HTMLAnchorElement, args: string[], expectedHref: string}>} rules
 */
const createRulesForDifferentElems = () => [createUniqueLink(), createUniqueLink()]
    .map(({ elem, selector, expectedHref }) => ({ elem, args: [selector, '[data-href]'], expectedHref }));

module(name, { beforeEach, afterEach });

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const uboParams = {
        name: 'ubo-href-sanitizer.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByUboParams = window.scriptlets.invoke(uboParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('Sanitize href - remove all parameters from href', (assert) => {
    const expectedHref = 'https://foo.com/123123';
    const elem = createElem('https://foo.com/123123?utm_source=nova&utm_medium=tg&utm_campaign=main');
    const selector = 'a[href^="https://foo.com/123123"]';

    const scriptletArgs = [selector, '[href]', 'removeParam'];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'all params from href was removed');
    assert.strictEqual(window.hit, 'FIRED');
});

test('Sanitize href - remove parameters from href', (assert) => {
    const expectedHref = 'https://foo.com/watch?utm_campaign=main';
    const elem = createElem('https://foo.com/watch?v=dbjPnXaacAU&pp=ygUEdGVzdA%3D%3D&utm_campaign=main');
    const selector = 'a[href^="https://foo.com/watch"]';

    const scriptletArgs = [selector, '[href]', 'removeParam:v,pp'];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'v and pp params from href was removed');
    assert.strictEqual(window.hit, 'FIRED');
});

test('Sanitize href - remove parameter from href', (assert) => {
    const expectedHref = 'https://example.org/watch?v=dbjPnXaacAU';
    const elem = createElem('https://example.org/watch?v=dbjPnXaacAU&pp=ygUEdGVzdA%3D%3D');
    const selector = 'a[href^="https://example.org/watch"]';

    const scriptletArgs = [selector, '[href]', 'removeParam:pp'];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'pp param from href was removed');
    assert.strictEqual(window.hit, 'FIRED');
});

test('Sanitize href - remove hash', (assert) => {
    const expectedHref = 'https://example.org/?article';
    const elem = createElem('https://example.org/?article#utm_source=Facebook');
    const selector = 'a[href]';

    const scriptletArgs = [selector, '[href]', 'removeHash'];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'hash from href was removed');
    assert.strictEqual(window.hit, 'FIRED');
});

test('Sanitize href - no URL was found in base64', (assert) => {
    // encoded string is 'some text, no urls'
    const hrefWithBase64 = 'http://foo.com/#c29tZSB0ZXh0LCBubyB1cmxz';
    const elem = createElem(hrefWithBase64);
    const selector = 'a[href]';

    const scriptletArgs = [selector, '[href]', 'base64decode'];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(elem.getAttribute('href'), hrefWithBase64, 'href has not been changed');
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
});

test('Sanitize href - no URL was found in base64 string in query parameter', (assert) => {
    const hrefWithBase64 = 'http://www.foo.com/out/?aGVsbG9fZGFya25lc3M=&aGVsbG9fZGFya25lc3M=';
    const elem = createElem(hrefWithBase64);
    const selector = 'a[href]';

    const scriptletArgs = [selector, '[href]', 'base64decode'];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(elem.getAttribute('href'), hrefWithBase64, 'href has not been changed');
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
});

test('Sanitize href - decode base64 string in query parameter', (assert) => {
    const hrefWithBase64 = 'http://www.foo.com/out/?aGVsbG9fZGFya25lc3M=&aHR0cDovL2V4YW1wbGUuY29tLz92PTEyMw==';
    const expectedHref = 'http://example.com/?v=123';
    const elem = createElem(hrefWithBase64);
    const selector = 'a[href]';

    const scriptletArgs = [selector, '[href]', 'base64decode'];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href has been sanitized');
    assert.strictEqual(window.hit, 'FIRED');
});

test('Sanitize href - decode base64 string in anchor(#) of href attribute link', (assert) => {
    const expectedHref = 'http://example.com/?v=123';
    const hrefWithBase64 = 'http://foo.com/#aHR0cDovL2V4YW1wbGUuY29tLz92PTEyMw==';
    const elem = createElem(hrefWithBase64);
    const selector = 'a[href]';

    const scriptletArgs = [selector, '[href]', 'base64decode'];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href has been sanitized');
    assert.strictEqual(window.hit, 'FIRED');
});

test('Sanitize href - decode base64 string in hashbang(#!) of href attribute link few times', (assert) => {
    const expectedHref = 'https://www.example.com/file/123/file.rar/file';
    const hrefWithBase64 = 'https://foo.com/#!WVVoU01HTklUVFpNZVRrelpETmpkVnBZYUdoaVdFSnpXbE0xYW1JeU1IWmFiV3h6V2xNNGVFMXFUWFphYld4eldsTTFlVmxZU1haYWJXeHpXbEU5UFE9PQ==';
    const elem = createElem(hrefWithBase64);
    const selector = 'a[href]';

    const scriptletArgs = [selector, '[href]', 'base64decode'];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href has been sanitized');
    assert.strictEqual(window.hit, 'FIRED');
});

test('Sanitize href - decode base64 string in data-href attribute', (assert) => {
    const expectedHref = 'https://example.org/';
    const elem = createElem('https://google.com/', expectedHref, 'data-href', 'aHR0cHM6Ly9leGFtcGxlLm9yZy8=');
    const selector = 'a[href^="https://google.com/';

    const scriptletArgs = [selector, '[data-href]', 'base64decode'];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href has been sanitized');
    assert.strictEqual(window.hit, 'FIRED');
});

test('Sanitize href - decode base64 string in href attribute', (assert) => {
    const expectedHref = 'http://example.com/?v=123';
    const hrefWithBase64 = 'http://www.foo.com/out/?aHR0cDovL2V4YW1wbGUuY29tLz92PTEyMw==';
    const elem = createElem(hrefWithBase64);
    const selector = 'a[href*="out/?"]';
    const scriptletArgs = [selector, '[href]', 'base64decode'];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href has been sanitized and base64 was decoded');
    assert.strictEqual(window.hit, 'FIRED');
});

test('Sanitize href - base64 where link decoded in object in search query ', (assert) => {
    const expectedHref = 'http://example.com/?v=3468';
    const hrefWithBase64 = 'http://www.foo.com/out/?eyJsIjoiaHR0cDovL2V4YW1wbGUuY29tLz92PTM0NjgiLCJjIjoxfQ==';
    const elem = createElem(hrefWithBase64);
    const selector = 'a[href*="out/?"]';
    const scriptletArgs = [selector, '[href]', 'base64decode'];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href has been sanitized and base64 was decoded');
    assert.strictEqual(window.hit, 'FIRED');
});

test('Sanitize href - decode base64 string in href attribute - test for alias "-base64"', (assert) => {
    const expectedHref = 'http://example.com/?v=123';
    const hrefWithBase64 = 'http://www.foo.com/out/?aHR0cDovL2V4YW1wbGUuY29tLz92PTEyMw==';
    const elem = createElem(hrefWithBase64);
    const selector = 'a[href*="out/?"]';
    const scriptletArgs = [selector, '[href]', '-base64'];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href has been sanitized and base64 was decoded');
    assert.strictEqual(window.hit, 'FIRED');
});

test('Sanitize href - text content', (assert) => {
    const expectedHref = 'https://example.org/';
    const elem = createElem('https://example.com/foo?redirect=https%3A%2F%2Fexample.org%2F', expectedHref);
    const selector = 'a[href*="?redirect="]';

    const scriptletArgs = [selector];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href has been sanitized');
    assert.strictEqual(window.hit, 'FIRED');
});

test('Sanitize href - text content, create element after running scriptlet', (assert) => {
    const selector = 'a[href*="foo.com"]';
    const scriptletArgs = [selector];
    runScriptlet(name, scriptletArgs);

    const expectedHref = 'https://example.org/test?foo';
    const elem = createElem('https://foo.com/bar', expectedHref);

    const done = assert.async();
    setTimeout(() => {
        assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href has been sanitized');
        assert.strictEqual(window.hit, 'FIRED');
        done();
    }, 10);
});

test('Sanitize href - text content special characters', (assert) => {
    const expectedHref = 'https://example.com/search?q=łódź';
    const elem = createElem('https://example.org/foo', expectedHref);
    const selector = 'a[href*="//example.org"]';

    const scriptletArgs = [selector];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(decodeURIComponent(elem.getAttribute('href')), expectedHref, 'href has been sanitized');
    assert.strictEqual(window.hit, 'FIRED');
});

test('Sanitize href - text content, Twitter like case', (assert) => {
    const elem = createElem('https://example.com/foo', 'https://agrd.io/promo_turk_83off…'); // Link from Twitter/X
    const expectedHref = 'https://agrd.io/promo_turk_83off';
    const selector = 'a[href*="//example.com"]';

    const scriptletArgs = [selector];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href has been sanitized');
    assert.strictEqual(window.hit, 'FIRED');
});

test('Sanitize href - query parameter 1', (assert) => {
    const elem = createElem('https://example.com/foo?redirect=https://example.org/');
    const expectedHref = 'https://example.org/';
    const selector = 'a[href*="?redirect="]';
    const attr = '?redirect';

    const scriptletArgs = [selector, attr];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href has been sanitized');
    assert.strictEqual(window.hit, 'FIRED');
});

test('Sanitize href - query parameter 2', (assert) => {
    const elem = createElem('https://greenmangaming.sjv.io/c/3659980/1281797/15105?u=https://www.greenmangaming.com/games/grand-theft-auto-v-premium-edition-pc');
    const expectedHref = 'https://www.greenmangaming.com/games/grand-theft-auto-v-premium-edition-pc';
    const selector = 'a[href^="https://greenmangaming.sjv.io/c/"][href*="?u="]';
    const attr = '?u';

    const scriptletArgs = [selector, attr];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href has been sanitized');
    assert.strictEqual(window.hit, 'FIRED');
});

test('Sanitize href - get href from attribute', (assert) => {
    const expectedHref = 'https://example.org/';
    const elem = createElem('https://foo.com/bar', '', 'data-href', expectedHref);
    const selector = 'a[href="https://foo.com/bar"]';
    const attr = '[data-href]';

    const scriptletArgs = [selector, attr];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href has been sanitized');
    assert.strictEqual(window.hit, 'FIRED');
});

test('Sanitize href - invalid URL', (assert) => {
    const expectedHref = 'https://foo.com/bar';
    const elem = createElem(expectedHref, 'https://?');
    const selector = 'a[href="https://foo.com/bar"]';

    const scriptletArgs = [selector];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href has not been changed');
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
});

test('Sanitize href - parameter, invalid URL', (assert) => {
    const expectedHref = 'https://?example.com/foo?redirect=https://example.org/';
    const elem = createElem(expectedHref);
    const selector = 'a[href*="?redirect="]';
    const attr = '?redirect';

    const scriptletArgs = [selector, attr];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href has not been changed');
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
});

test('Sanitize href - not allowed protocol', (assert) => {
    const expectedHref = 'https://example.com/foo?redirect=javascript:alert(1)';
    const elem = createElem(expectedHref);
    const selector = 'a[href*="?redirect="]';
    const attr = '?redirect';

    const scriptletArgs = [selector, attr];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href has not been changed');
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
});

test('single rule does not re-sanitize href on unrelated DOM mutation', async (assert) => {
    const { elem, selector, expectedHref } = createUniqueLink();
    await checkLinksSettle(assert, [{ elem, args: [selector, '[data-href]'], expectedHref }]);
});

test('two rules on different elements settle, logging enabled', async (assert) => {
    await checkLinksSettle(assert, createRulesForDifferentElems());
});

test('two rules on different elements settle, logging disabled', async (assert) => {
    await checkLinksSettle(assert, createRulesForDifferentElems(), false);
});

test('two rules on same element settle', async (assert) => {
    const { elem, selector, expectedHref } = createUniqueLink(true);
    // both rules extract the same URL, one from the attribute and another one from the text
    await checkLinksSettle(assert, [
        { elem, args: [selector, '[data-href]'], expectedHref },
        { elem, args: [selector], expectedHref },
    ]);
});

test('href is not re-set and hit is not called if it is already sanitized', (assert) => {
    const { elem, selector, expectedHref } = createUniqueLink();
    elem.setAttribute('href', expectedHref);

    const counter = createAttrMutationCounter([elem], ['href']);

    runScriptlet(name, [selector, '[data-href]']);

    const done = assert.async();
    // mutation observer callbacks are async, so wait for them
    setTimeout(() => {
        const mutations = counter.count;
        counter.disconnect();
        assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href is unchanged');
        assert.strictEqual(mutations, 0, 'setAttribute is not called for already sanitized href');
        assert.strictEqual(window.hit, undefined, 'hit function has not been called');
        done();
    }, ATTR_SETTLE_DELAY_MS);
});

test('two rules: new links and page changes are still sanitized', (assert) => {
    const rules = createRulesForDifferentElems();
    rules.forEach(({ args }) => runScriptlet(name, args));
    rules.forEach(({ elem, expectedHref }) => {
        assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href has been sanitized');
    });

    const first = rules[0];
    const second = rules[1];

    const done = assert.async();
    let newElem;
    setTimeout(() => {
        // hits are collected per rule, so that a rule which stops calling hit is noticed
        const hitRulesArgs = new Set();
        window.__debug = (source) => {
            hitRulesArgs.add(JSON.stringify(source.args));
        };
        // page inserts a new link matched by the first rule
        newElem = createElem('https://tracker.example/new', '', 'data-href', first.expectedHref);
        // page changes href of the link matched by the second rule
        second.elem.setAttribute('href', 'https://tracker.example/changed-by-page');

        setTimeout(() => {
            assert.strictEqual(newElem.getAttribute('href'), first.expectedHref, 'new link is sanitized');
            assert.strictEqual(
                second.elem.getAttribute('href'),
                second.expectedHref,
                'href is sanitized again after page change',
            );
            rules.forEach(({ args }) => {
                assert.ok(hitRulesArgs.has(JSON.stringify(args)), `hit function has been called again for ${args[0]}`);
            });
            done();
        }, ATTR_SETTLE_DELAY_MS);
    }, ATTR_SETTLE_DELAY_MS);
});

test('relative href is not re-set if it already points to the sanitized URL', (assert) => {
    const relativeHref = '/ag-test-relative-href';
    const elem = createElem(relativeHref);

    const counter = createAttrMutationCounter([elem], ['href']);

    // removeParam without parameter names returns absolute URL, which is the same as the resolved link
    runScriptlet(name, [`a[href="${relativeHref}"]`, '[href]', 'removeParam']);

    const done = assert.async();
    // mutation observer callbacks are async, so wait for them
    setTimeout(() => {
        const mutations = counter.count;
        counter.disconnect();
        assert.strictEqual(elem.getAttribute('href'), relativeHref, 'relative href is unchanged');
        assert.strictEqual(mutations, 0, 'setAttribute is not called for the same resolved URL');
        assert.strictEqual(window.hit, undefined, 'hit function has not been called');
        done();
    }, ATTR_SETTLE_DELAY_MS);
});

test('nothing to remove by removeHash or removeParam is not logged as invalid URL', (assert) => {
    ['removeHash', 'removeParam:utm_source'].forEach((transform) => {
        // link without hash and parameters, e.g. the one which has already been sanitized
        const { elem, selector, expectedHref } = createUniqueLink();
        elem.setAttribute('href', expectedHref);

        const logs = getSyncLogs(() => runScriptlet(name, [selector, '[href]', transform]));

        assert.strictEqual(elem.getAttribute('href'), expectedHref, `${transform}: href is unchanged`);
        assert.notOk(logs.some((msg) => msg.includes('Invalid URL')), `${transform}: invalid URL is not logged`);
    });
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
});

test('invalid selector is logged only once', async (assert) => {
    const selector = '..ag-test-invalid-selector';
    const count = await countLogsAfterDomChange(name, [selector], `${name}: Invalid selector "${selector}"`);
    assert.strictEqual(count, 1, 'invalid selector is logged once');
});

test('invalid transform is logged only once and href is not changed', async (assert) => {
    const { elem, selector } = createUniqueLink();
    const initialHref = elem.getAttribute('href');
    const transform = 'ag-test-invalid-transform';

    const count = await countLogsAfterDomChange(
        name,
        [selector, '[data-href]', transform],
        `${name}: Invalid transform option: "${transform}"`,
    );

    assert.strictEqual(count, 1, 'invalid transform is logged once');
    assert.strictEqual(elem.getAttribute('href'), initialHref, 'href is not changed');
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
});

test('invalid attribute is logged only once and href is not changed', async (assert) => {
    const { elem, selector } = createUniqueLink();
    const initialHref = elem.getAttribute('href');
    const attribute = 'ag-test-invalid-attribute';

    const count = await countLogsAfterDomChange(
        name,
        [selector, attribute],
        `${name}: Invalid attribute option: "${attribute}"`,
    );

    assert.strictEqual(count, 1, 'invalid attribute is logged once');
    assert.strictEqual(elem.getAttribute('href'), initialHref, 'href is not changed');
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
});

/**
 * Runs given function while the document base URL points to a subdirectory.
 * Test page is in the root directory, where origin and base URL are the same,
 * so base element is needed to check that relative URL is not resolved against the origin or the page URL.
 * Base element is removed synchronously, so observers of the rules do not see it.
 *
 * @param {Function} fn function to run, the base URL is passed to it
 */
const runWithBaseUrl = (fn) => {
    const baseDirUrl = `${window.location.origin}/ag-test-base-dir/`;
    const base = document.createElement('base');
    base.setAttribute('href', baseDirUrl);
    document.head.appendChild(base);
    try {
        fn(baseDirUrl);
    } finally {
        base.remove();
    }
};

test('remove transforms resolve path-relative link against document base URL', (assert) => {
    runWithBaseUrl((baseDirUrl) => {
        [
            {
                href: 'ag-test-relative/remove-all-params?utm_source=test',
                transform: 'removeParam',
                expectedPath: 'ag-test-relative/remove-all-params',
            },
            {
                href: 'ag-test-relative/remove-param?utm_source=test&v=1',
                transform: 'removeParam:utm_source',
                expectedPath: 'ag-test-relative/remove-param?v=1',
            },
            {
                href: 'ag-test-relative/remove-hash#utm_source=test',
                transform: 'removeHash',
                expectedPath: 'ag-test-relative/remove-hash',
            },
        ].forEach(({ href, transform, expectedPath }) => {
            const elem = createElem(href);

            runScriptlet(name, [`a[href="${href}"]`, '[href]', transform]);

            assert.strictEqual(
                elem.getAttribute('href'),
                `${baseDirUrl}${expectedPath}`,
                `${transform}: link target is kept`,
            );
        });
    });
    assert.strictEqual(window.hit, 'FIRED');
});

test('empty value is logged for remove transform, only once', async (assert) => {
    const { elem, selector } = createUniqueLink();
    const initialHref = elem.getAttribute('href');
    // e.g. typo in attribute name
    const attribute = '[data-ag-test-missing]';

    const count = await countLogsAfterDomChange(
        name,
        [selector, attribute, 'removeHash'],
        `${name}: Failed to get value by "${attribute}" from ${elem.href}`,
    );

    assert.strictEqual(count, 1, 'empty value is logged once');
    assert.strictEqual(elem.getAttribute('href'), initialHref, 'href is not changed');
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
});

test('failure to sanitize the same link is logged only once', async (assert) => {
    const base64NotUrl = window.btoa('ag-test-not-url');
    const cases = [
        {
            description: 'missing parameter',
            createTarget: () => createElem('https://tracker.example/ag-test-no-param'),
            args: ['a[href="https://tracker.example/ag-test-no-param"]', '?url'],
            message: `${name}: Failed to get value by "?url" from https://tracker.example/ag-test-no-param`,
        },
        {
            description: 'not allowed protocol',
            createTarget: () => createElem(
                'https://tracker.example/',
                '',
                'data-href',
                'ftp://ag-test-protocol.example/',
            ),
            args: ['a[data-href="ftp://ag-test-protocol.example/"]', '[data-href]'],
            message: `${name}: Invalid URL: ftp://ag-test-protocol.example/`,
        },
        {
            description: 'no URL in base64',
            createTarget: () => createElem('https://tracker.example/', '', 'data-href', base64NotUrl),
            args: [`a[data-href="${base64NotUrl}"]`, '[data-href]', 'base64decode'],
            message: `${name}: Failed to decode base64 string: ${base64NotUrl}`,
        },
        {
            description: 'not an anchor',
            createTarget: () => {
                const span = document.createElement('span');
                // id is used for removal after the test
                span.id = 'testHref';
                span.className = 'ag-test-not-anchor';
                document.body.appendChild(span);
            },
            args: ['span.ag-test-not-anchor'],
            message: `${name}: [object HTMLSpanElement] is not a valid element to sanitize`,
        },
    ];

    for (let i = 0; i < cases.length; i += 1) {
        const {
            description,
            createTarget,
            args,
            message,
        } = cases[i];
        createTarget();
        const count = await countLogsAfterDomChange(name, args, message);
        assert.strictEqual(count, 1, `${description}: failure is logged once`);
    }
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
});

test('failure is logged again after the page changes the link', async (assert) => {
    const firstValue = 'ftp://ag-test-first.example/';
    const secondValue = 'ftp://ag-test-second.example/';
    const elem = createElem('https://tracker.example/', '', 'data-href', firstValue);

    const logs = await getLogs(async () => {
        runScriptlet(name, ['a[data-href^="ftp://ag-test-"]', '[data-href]']);
        await makeUnrelatedDomChange();
        elem.setAttribute('data-href', secondValue);
        await makeUnrelatedDomChange();
    });

    const countInvalidUrlLogs = (value) => logs.filter((msg) => msg === `${name}: Invalid URL: ${value}`).length;
    assert.strictEqual(countInvalidUrlLogs(firstValue), 1, 'first value is logged once');
    assert.strictEqual(countInvalidUrlLogs(secondValue), 1, 'changed value is logged once');
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
});

test('remove transform uses extracted URL as is if there is nothing to remove', (assert) => {
    const paramTarget = 'https://target.example/remove-nothing-param';
    const textTarget = 'https://target.example/remove-nothing-text';
    [
        {
            // URL in parameter has no tracking parameter to remove
            href: `https://tracker.example/remove-nothing?ag-test-url=${encodeURIComponent(paramTarget)}`,
            args: ['a[href^="https://tracker.example/remove-nothing?"]', '?ag-test-url', 'removeParam:utm_source'],
            expectedHref: paramTarget,
        },
        {
            // URL in text has no hash to remove
            href: 'https://tracker.example/remove-nothing-text',
            text: textTarget,
            args: ['a[href="https://tracker.example/remove-nothing-text"]', 'text', 'removeHash'],
            expectedHref: textTarget,
        },
    ].forEach(({
        href,
        text,
        args,
        expectedHref,
    }) => {
        const elem = createElem(href, text);

        runScriptlet(name, args);

        assert.strictEqual(elem.getAttribute('href'), expectedHref, `${args[2]}: href has been sanitized`);
    });
    assert.strictEqual(window.hit, 'FIRED');
});

test('relative URL from attribute is resolved against document base URL', (assert) => {
    const relativeHref = 'ag-test-relative/data-href';
    runWithBaseUrl((baseDirUrl) => {
        const elem = createElem('https://tracker.example/relative-data-href', '', 'data-href', relativeHref);

        runScriptlet(name, [`a[data-href="${relativeHref}"]`, '[data-href]']);

        assert.strictEqual(elem.getAttribute('href'), `${baseDirUrl}${relativeHref}`, 'href is resolved against base');
    });
    assert.strictEqual(window.hit, 'FIRED');
});

test('SVG link is sanitized and not re-sanitized on unrelated DOM mutation', async (assert) => {
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const expectedHref = 'https://target.example/svg-link';
    const svg = document.createElementNS(SVG_NS, 'svg');
    // id is used for removal after the test
    svg.id = 'testHref';
    // href property of SVG link is not a string but SVGAnimatedString
    const elem = document.createElementNS(SVG_NS, 'a');
    elem.setAttribute('href', 'https://tracker.example/svg-link');
    elem.setAttribute('data-href', expectedHref);
    svg.appendChild(elem);
    document.body.appendChild(svg);

    await checkLinksSettle(assert, [{ elem, args: [`a[data-href="${expectedHref}"]`, '[data-href]'], expectedHref }]);
});

test('link sanitized by parameter is not logged as failure after DOM change', async (assert) => {
    const expectedHref = 'https://target.example/by-param';
    const elem = createElem(`https://tracker.example/by-param?ag-test-url=${encodeURIComponent(expectedHref)}`);
    // selector still matches the link after it is sanitized, while the parameter is gone
    elem.classList.add('ag-test-by-param');

    const count = await countLogsAfterDomChange(
        name,
        ['a.ag-test-by-param', '?ag-test-url'],
        `${name}: Failed to get value by "?ag-test-url" from ${expectedHref}`,
    );

    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href has been sanitized');
    assert.strictEqual(count, 0, 'sanitized link is not logged as failure');
});

test('remove transform leaves link as is if the value is not an absolute http(s) URL', (assert) => {
    [
        {
            // text which is not a URL would be resolved as a relative URL
            href: 'https://tracker.example/not-url-text',
            text: 'Click here',
            args: ['a[href="https://tracker.example/not-url-text"]', 'text', 'removeHash'],
        },
        {
            href: 'https://tracker.example/not-url-attr',
            attributeName: 'data-ag-test-id',
            attributeValue: '12345',
            args: ['a[href="https://tracker.example/not-url-attr"]', '[data-ag-test-id]', 'removeParam:utm_source'],
        },
        {
            // link with not allowed protocol matched by a broad selector should not be logged
            href: 'mailto:ag-test@example.org',
            args: ['a[href="mailto:ag-test@example.org"]', '[href]', 'removeHash'],
        },
    ].forEach(({
        href,
        text,
        attributeName,
        attributeValue,
        args,
    }) => {
        const elem = createElem(href, text, attributeName, attributeValue);

        const logs = getSyncLogs(() => runScriptlet(name, args));

        assert.strictEqual(elem.getAttribute('href'), href, `${args[1]}: href is not changed`);
        assert.notOk(
            logs.some((msg) => msg.includes('Invalid URL') || msg.includes('Protocol not allowed')),
            `${args[1]}: nothing is logged`,
        );
    });
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
});

test('nested redirect in parameter is sanitized on the next DOM change', async (assert) => {
    const finalHref = 'https://target.example/nested-final';
    const innerHref = `https://tracker.example/nested?ag-test-url=${encodeURIComponent(finalHref)}`;
    const elem = createElem(`https://tracker.example/nested?ag-test-url=${encodeURIComponent(innerHref)}`);
    // selector still matches the link after it is sanitized
    elem.classList.add('ag-test-nested');

    runScriptlet(name, ['a.ag-test-nested', '?ag-test-url']);
    assert.strictEqual(elem.getAttribute('href'), innerHref, 'outer redirect is sanitized');

    await makeUnrelatedDomChange();
    assert.strictEqual(elem.getAttribute('href'), finalHref, 'inner redirect is sanitized');
});

test('link is sanitized again after page changes base URL', async (assert) => {
    const relativeHref = '/ag-test-base-change';
    const expectedHref = `${window.location.origin}${relativeHref}`;
    // relative href already points to the URL from the attribute, so it is kept
    const elem = createElem(relativeHref, '', 'data-href', expectedHref);

    runScriptlet(name, [`a[data-href="${expectedHref}"]`, '[data-href]']);
    assert.strictEqual(elem.getAttribute('href'), relativeHref, 'relative href is kept');

    // page changes base URL, so the relative href points elsewhere
    const base = document.createElement('base');
    base.setAttribute('href', 'https://other.example/');
    document.head.appendChild(base);
    try {
        await makeUnrelatedDomChange();
        assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href is sanitized again');
    } finally {
        base.remove();
    }
});

test('value failed with previous base URL is sanitized after base URL changes', async (assert) => {
    const relativeHref = 'ag-test-failed-relative';
    const initialHref = 'https://tracker.example/failed-relative';
    const elem = createElem(initialHref, '', 'data-href', relativeHref);

    // relative value is resolved to a URL with not allowed protocol
    const base = document.createElement('base');
    base.setAttribute('href', 'ftp://ag-test.example/');
    document.head.appendChild(base);
    try {
        runScriptlet(name, [`a[data-href="${relativeHref}"]`, '[data-href]']);
    } finally {
        base.remove();
    }
    assert.strictEqual(elem.getAttribute('href'), initialHref, 'href is not changed with not allowed protocol');

    await makeUnrelatedDomChange();
    assert.strictEqual(
        elem.getAttribute('href'),
        `${window.location.origin}/${relativeHref}`,
        'href is sanitized with page base URL',
    );
});
