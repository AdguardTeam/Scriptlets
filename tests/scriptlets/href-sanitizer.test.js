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
    sleep,
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
    const href = 'https://example.org/?article#utm_source=Facebook';
    const elem = createElem(href);
    // selector matches only this link, so the rule, which is still active, does not affect other tests
    const selector = `a[href="${href}"]`;

    const scriptletArgs = [selector, '[href]', 'removeHash'];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'hash from href was removed');
    assert.strictEqual(window.hit, 'FIRED');
});

test('Sanitize href - no URL was found in base64', (assert) => {
    // encoded string is 'some text, no urls'
    const hrefWithBase64 = 'http://foo.com/#c29tZSB0ZXh0LCBubyB1cmxz';
    const elem = createElem(hrefWithBase64);
    const selector = `a[href="${hrefWithBase64}"]`;

    const scriptletArgs = [selector, '[href]', 'base64decode'];
    const logs = getSyncLogs(() => runScriptlet(name, scriptletArgs));

    assert.strictEqual(elem.getAttribute('href'), hrefWithBase64, 'href has not been changed');
    assert.ok(
        logs.includes(`${name}: Failed to find URL by base64 decoding: ${hrefWithBase64}`),
        'source value is logged',
    );
    assert.notOk(logs.includes(`${name}: Invalid URL: `), 'empty URL is not logged');
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
});

test('Sanitize href - no URL was found in base64 string in query parameter', (assert) => {
    const hrefWithBase64 = 'http://www.foo.com/out/?aGVsbG9fZGFya25lc3M=&aGVsbG9fZGFya25lc3M=';
    const elem = createElem(hrefWithBase64);
    const selector = `a[href="${hrefWithBase64}"]`;

    const scriptletArgs = [selector, '[href]', 'base64decode'];
    const logs = getSyncLogs(() => runScriptlet(name, scriptletArgs));

    assert.strictEqual(elem.getAttribute('href'), hrefWithBase64, 'href has not been changed');
    assert.ok(
        logs.includes(`${name}: Failed to find URL by base64 decoding: ${hrefWithBase64}`),
        'source value is logged',
    );
    assert.notOk(logs.includes(`${name}: Invalid URL: `), 'empty URL is not logged');
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
});

test('Sanitize href - decode base64 string in query parameter', (assert) => {
    const hrefWithBase64 = 'http://www.foo.com/out/?aGVsbG9fZGFya25lc3M=&aHR0cDovL2V4YW1wbGUuY29tLz92PTEyMw==';
    const expectedHref = 'http://example.com/?v=123';
    const elem = createElem(hrefWithBase64);
    const selector = `a[href="${hrefWithBase64}"]`;

    const scriptletArgs = [selector, '[href]', 'base64decode'];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href has been sanitized');
    assert.strictEqual(window.hit, 'FIRED');
});

test('Sanitize href - decode base64 string in anchor(#) of href attribute link', (assert) => {
    const expectedHref = 'http://example.com/?v=123';
    const hrefWithBase64 = 'http://foo.com/#aHR0cDovL2V4YW1wbGUuY29tLz92PTEyMw==';
    const elem = createElem(hrefWithBase64);
    const selector = `a[href="${hrefWithBase64}"]`;

    const scriptletArgs = [selector, '[href]', 'base64decode'];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href has been sanitized');
    assert.strictEqual(window.hit, 'FIRED');
});

test('Sanitize href - decode base64 string in hashbang(#!) of href attribute link few times', (assert) => {
    const expectedHref = 'https://www.example.com/file/123/file.rar/file';
    const hrefWithBase64 = 'https://foo.com/#!WVVoU01HTklUVFpNZVRrelpETmpkVnBZYUdoaVdFSnpXbE0xYW1JeU1IWmFiV3h6V2xNNGVFMXFUWFphYld4eldsTTFlVmxZU1haYWJXeHpXbEU5UFE9PQ==';
    const elem = createElem(hrefWithBase64);
    const selector = `a[href="${hrefWithBase64}"]`;

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

    // there are no parameters to remove, and the relative link already points to the resolved URL
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
 * Runs given function while the document has a different base URL, by default pointing to a subdirectory.
 * Test page is in the root directory, where origin and base URL are the same,
 * so base element is needed to check that relative URL is not resolved against the origin or the page URL.
 * Base element is removed synchronously, so observers of the rules do not see it.
 *
 * @param {Function} fn function to run, the base URL is passed to it
 * @param {string} [baseUrl] base URL, defaults to a subdirectory of the origin
 */
const runWithBaseUrl = (fn, baseUrl = `${window.location.origin}/ag-test-base-dir/`) => {
    const base = document.createElement('base');
    base.setAttribute('href', baseUrl);
    document.head.appendChild(base);
    try {
        fn(baseUrl);
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
            message: `${name}: Failed to find URL by base64 decoding: ${base64NotUrl}`,
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
    elem.classList.add('ag-test-failure-again');

    const logs = await getLogs(async () => {
        runScriptlet(name, ['a.ag-test-failure-again', '[data-href]']);
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
        {
            // relative URL in parameter has no tracking parameter to remove
            href: `https://tracker.example/remove-nothing-relative?ag-test-url=${encodeURIComponent('/ag-test-path')}`,
            args: [
                'a[href^="https://tracker.example/remove-nothing-relative?"]',
                '?ag-test-url',
                'removeParam:utm_source',
            ],
            expectedHref: `${window.location.origin}/ag-test-path`,
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

test('text which is not a URL is not set and is logged as invalid URL', (assert) => {
    const text = 'Click here';
    [
        // no transform
        { href: 'https://tracker.example/not-url-text-1', args: [] },
        // removeParam without parameter names
        { href: 'https://tracker.example/not-url-text-2', args: ['text', 'removeParam'] },
        { href: 'https://tracker.example/not-url-text-3', args: ['text', 'removeHash'] },
    ].forEach(({ href, args }) => {
        const elem = createElem(href, text);

        const logs = getSyncLogs(() => runScriptlet(name, [`a[href="${href}"]`, ...args]));

        assert.strictEqual(elem.getAttribute('href'), href, `${href}: href is not changed`);
        assert.ok(logs.includes(`${name}: Invalid URL: ${text}`), `${href}: invalid URL is logged`);
    });
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
});

test('link is left as is and not logged if there is nothing to change', (assert) => {
    [
        // links with not allowed protocol matched by a broad selector
        { href: 'mailto:ag-test-1@example.org', transform: 'removeHash' },
        { href: 'mailto:ag-test-2@example.org', transform: 'removeParam' },
        { href: 'tel:+10000000000', transform: 'removeParam:utm_source' },
        // links with whitespaces
        // eslint-disable-next-line no-script-url
        { href: 'javascript: void(0)', transform: 'removeParam:utm_source' },
        { href: 'tel:+1 555 123', transform: 'removeParam' },
        // no transform
        { href: 'mailto:ag-test-3@example.org', transform: '' },
        // relative link without anything to remove
        { href: '/ag-test-nothing-to-remove', transform: 'removeHash' },
    ].forEach(({ href, transform }) => {
        const elem = createElem(href);

        const logs = getSyncLogs(() => runScriptlet(name, [`a[href="${href}"]`, '[href]', transform]));

        assert.strictEqual(elem.getAttribute('href'), href, `${href}: href is not changed`);
        assert.strictEqual(logs.length, 0, `${href}: nothing is logged`);
    });
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
});

test('remove transform does not change link within the page', (assert) => {
    const anchorHref = '#ag-test-anchor';
    // page URL has its own tracking parameter and hash, which should not be removed from the anchor link
    runWithBaseUrl(() => {
        ['removeParam:utm_source', 'removeHash'].forEach((transform) => {
            const elem = createElem(anchorHref);

            runScriptlet(name, [`a[href="${anchorHref}"]`, '[href]', transform]);

            assert.strictEqual(elem.getAttribute('href'), anchorHref, `${transform}: href is not changed`);
            elem.remove();
        });
    }, `${window.location.origin}/ag-test-page?utm_source=ag-test#ag-test-page-hash`);
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
});

test('nested redirects in parameter are sanitized at once', (assert) => {
    const finalHref = 'https://target.example/nested-final';
    const wrap = (url) => `https://tracker.example/nested?ag-test-url=${encodeURIComponent(url)}`;
    const elem = createElem(wrap(wrap(wrap(finalHref))));
    // selector still matches the link after each step
    elem.classList.add('ag-test-nested');

    // no DOM change is needed, since mutations made by the rule do not wake up its observer
    runScriptlet(name, ['a.ag-test-nested', '?ag-test-url']);

    assert.strictEqual(elem.getAttribute('href'), finalHref, 'all nested redirects are sanitized');
    assert.strictEqual(window.hit, 'FIRED', 'hit function has been called');
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

test('failure is not logged again after the page URL hash is changed', async (assert) => {
    const href = 'https://tracker.example/hash-change';
    createElem(href);
    const originalUrl = window.location.href;

    let logs;
    try {
        logs = await getLogs(async () => {
            runScriptlet(name, [`a[href="${href}"]`, '?ag-test-hash-param']);
            // e.g. page routing changes the hash, which does not affect resolving of relative URLs
            window.history.replaceState(null, '', '#ag-test-hash-1');
            await makeUnrelatedDomChange();
            window.history.replaceState(null, '', '#ag-test-hash-2');
            await makeUnrelatedDomChange();
        });
    } finally {
        window.history.replaceState(null, '', originalUrl);
    }

    const message = `${name}: Failed to get value by "?ag-test-hash-param" from ${href}`;
    assert.strictEqual(logs.filter((log) => log === message).length, 1, 'failure is logged once');
});

test('nested redirect is not sanitized after the link is not matched by the selector', (assert) => {
    // target is a viewer with its own parameter of the same name, which should be kept
    const viewerHref = `https://viewer.example/open?url=${encodeURIComponent('https://files.example/doc.pdf')}`;
    const elem = createElem(`https://tracker.example/viewer-redirect?url=${encodeURIComponent(viewerHref)}`);

    runScriptlet(name, ['a[href^="https://tracker.example/viewer-redirect"]', '?url']);

    assert.strictEqual(elem.getAttribute('href'), viewerHref, 'viewer URL is kept');
    assert.strictEqual(window.hit, 'FIRED', 'hit function has been called');
});

test('nested base64 redirects are sanitized at once without logging', (assert) => {
    const finalHref = 'https://target.example/b64-final';
    const innerHref = `https://tracker.example/b64-inner/#${window.btoa(finalHref)}`;
    const elem = createElem(`https://tracker.example/b64-outer/#${window.btoa(innerHref)}`);
    // selector still matches the link after each step
    elem.classList.add('ag-test-b64-nested');

    const logs = getSyncLogs(() => runScriptlet(name, ['a.ag-test-b64-nested', '[href]', 'base64decode']));

    assert.strictEqual(elem.getAttribute('href'), finalHref, 'all nested redirects are sanitized');
    // failure to decode the final URL means that there is nothing more to decode
    assert.deepEqual(
        logs.filter((msg) => !msg.startsWith(`${name}: Sanitized`)),
        [],
        'only sanitizing is logged',
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function has been called');
});

test('more nested redirects than the limit are sanitized on the next DOM change', async (assert) => {
    const finalHref = 'https://target.example/deep-final';
    const wrap = (url) => `https://tracker.example/deep?ag-test-deep=${encodeURIComponent(url)}`;
    let href = finalHref;
    for (let i = 0; i < 12; i += 1) {
        href = wrap(href);
    }
    const elem = createElem(href);
    elem.classList.add('ag-test-deep');

    runScriptlet(name, ['a.ag-test-deep', '?ag-test-deep']);
    // 10 redirects are sanitized at once
    assert.strictEqual(elem.getAttribute('href'), wrap(wrap(finalHref)), 'limited number of redirects is sanitized');

    await makeUnrelatedDomChange();
    assert.strictEqual(elem.getAttribute('href'), finalHref, 'remaining redirects are sanitized');
});

test('href with whitespaces and padded value are left to the URL parser', (assert) => {
    [
        {
            // leading and trailing whitespaces of href are stripped by browsers
            href: ' https://target.example/padded?utm_source=ag-test ',
            args: ['a[href*="target.example/padded"]', '[href]', 'removeParam:utm_source'],
            expectedHref: 'https://target.example/padded',
        },
        {
            href: 'https://target.example/report 2026.pdf?utm_source=ag-test',
            args: ['a[href*="target.example/report"]', '[href]', 'removeParam:utm_source'],
            expectedHref: 'https://target.example/report%202026.pdf',
        },
        {
            // leading and trailing whitespaces of another attribute are stripped by the URL parser
            href: 'https://tracker.example/attr-padded',
            attributeValue: ' https://target.example/attr-padded ',
            args: ['a[href="https://tracker.example/attr-padded"]', '[data-href]'],
            expectedHref: 'https://target.example/attr-padded',
        },
    ].forEach(({
        href,
        attributeValue,
        args,
        expectedHref,
    }) => {
        const elem = createElem(href, '', 'data-href', attributeValue);

        runScriptlet(name, args);

        assert.strictEqual(elem.getAttribute('href'), expectedHref, `${href}: href has been sanitized`);
    });
});

test('remove transform sets value as is if there is nothing to remove, as without transform', (assert) => {
    const resolve = (url) => new URL(url, document.baseURI).href;
    [
        {
            // link text which is a path
            href: 'https://tracker.example/nothing-to-remove-text-path',
            text: '/ag-test-text-path',
            args: ['a[href="https://tracker.example/nothing-to-remove-text-path"]', 'text', 'removeHash'],
            expectedHref: resolve('/ag-test-text-path'),
        },
        {
            href: 'https://tracker.example/nothing-to-remove-file',
            attributeValue: 'ag-test-page.html',
            args: ['a[href="https://tracker.example/nothing-to-remove-file"]', '[data-href]', 'removeParam:utm_source'],
            expectedHref: resolve('ag-test-page.html'),
        },
        {
            href: 'https://tracker.example/nothing-to-remove-query',
            attributeValue: '?ag-test-id=5',
            args: ['a[href="https://tracker.example/nothing-to-remove-query"]', '[data-href]', 'removeHash'],
            expectedHref: resolve('?ag-test-id=5'),
        },
        {
            href: `https://tracker.example/nothing-to-remove-param?url=${encodeURIComponent('ag-test-page.html')}`,
            args: ['a[href^="https://tracker.example/nothing-to-remove-param?"]', '?url', 'removeParam:utm_source'],
            expectedHref: resolve('ag-test-page.html'),
        },
    ].forEach(({
        href,
        text,
        attributeValue,
        args,
        expectedHref,
    }) => {
        const elem = createElem(href, text, 'data-href', attributeValue);

        const logs = getSyncLogs(() => runScriptlet(name, args));

        assert.strictEqual(elem.getAttribute('href'), expectedHref, `${args[0]}: href has been sanitized`);
        assert.notOk(logs.some((log) => log.includes('Invalid URL')), `${args[0]}: invalid URL is not logged`);
    });
    assert.strictEqual(window.hit, 'FIRED', 'hit function has been called');
});

test('removeParam without parameter names removes empty query', (assert) => {
    const elem = createElem('https://tracker.example/empty-query', '', 'data-href', 'https://target.example/empty?');

    runScriptlet(name, ['a[href="https://tracker.example/empty-query"]', '[data-href]', 'removeParam']);

    assert.strictEqual(elem.getAttribute('href'), 'https://target.example/empty', 'empty query is removed');
});

test('failure to decode base64 is logged for link with empty href', (assert) => {
    const encodedNotUrl = window.btoa('ag-test-not-url-empty-href');
    // empty href is resolved to the page URL
    const elem = createElem('', '', 'data-ag-test-b64', encodedNotUrl);

    const logs = getSyncLogs(() => {
        runScriptlet(name, [`a[data-ag-test-b64="${encodedNotUrl}"]`, '[data-ag-test-b64]', 'base64decode']);
    });

    assert.strictEqual(elem.getAttribute('href'), '', 'href is not changed');
    assert.ok(
        logs.includes(`${name}: Failed to find URL by base64 decoding: ${encodedNotUrl}`),
        'failure to decode is logged',
    );
});

test('base64 link text with whitespaces is decoded', (assert) => {
    const expectedHref = 'https://target.example/b64-text-whitespace';
    const encoded = window.btoa(expectedHref);
    // whitespaces are ignored by base64 decoding
    const text = `${encoded.slice(0, 8)} \n${encoded.slice(8)}`;
    const elem = createElem('https://tracker.example/b64-text-whitespace', text);

    runScriptlet(name, ['a[href="https://tracker.example/b64-text-whitespace"]', 'text', 'base64decode']);

    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href has been sanitized');
    assert.strictEqual(window.hit, 'FIRED', 'hit function has been called');
});

test('remove transform does not change padded link within the page', (assert) => {
    // leading whitespaces and control characters are stripped by the URL parser
    [' #ag-test-padded-anchor', '\u0001#ag-test-control-anchor'].forEach((anchorHref) => {
        const elem = createElem(anchorHref);
        elem.classList.add('ag-test-padded-anchor');

        const logs = getSyncLogs(() => runScriptlet(name, ['a.ag-test-padded-anchor', '[href]', 'removeHash']));

        assert.strictEqual(elem.getAttribute('href'), anchorHref, `${JSON.stringify(anchorHref)}: href is not changed`);
        assert.strictEqual(logs.length, 0, `${JSON.stringify(anchorHref)}: nothing is logged`);
        elem.remove();
    });
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
});

test('link sanitized by limit of nested base64 redirects is not logged as failure', async (assert) => {
    const finalHref = 'https://target.example/b64-ten-final';
    let href = finalHref;
    // exactly as many nested redirects as sanitized at once
    for (let i = 0; i < 10; i += 1) {
        href = `https://tracker.example/b64-ten/#${window.btoa(href)}`;
    }

    const logs = await getLogs(async () => {
        const elem = createElem(href);
        elem.classList.add('ag-test-b64-ten');

        runScriptlet(name, ['a.ag-test-b64-ten', '[href]', 'base64decode']);
        assert.strictEqual(elem.getAttribute('href'), finalHref, 'all nested redirects are sanitized');

        // the rule checks the link again, since the limit of nested redirects has been reached
        await makeUnrelatedDomChange();
        await makeUnrelatedDomChange();
    });

    // any failure message about the link is counted, e.g. nothing to decode or invalid URL
    assert.deepEqual(
        logs.filter((log) => log.includes(finalHref) && !log.includes('Sanitized')),
        [],
        'sanitized link is not logged as failure by the rule',
    );
});

test('sanitized link is not logged as failure after base URL change', async (assert) => {
    const expectedHref = 'https://target.example/base-change-sanitized';
    const elem = createElem(`https://tracker.example/base-change?ag-test-url=${encodeURIComponent(expectedHref)}`);
    // selector still matches the link after it is sanitized, while the parameter is gone
    elem.classList.add('ag-test-base-sanitized');

    runScriptlet(name, ['a.ag-test-base-sanitized', '?ag-test-url']);
    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href has been sanitized');

    const base = document.createElement('base');
    base.setAttribute('href', `${window.location.origin}/ag-test-base-dir/`);
    let logs;
    try {
        logs = await getLogs(async () => {
            // e.g. page routing changes the base URL
            document.head.appendChild(base);
            await makeUnrelatedDomChange();
        });
    } finally {
        base.remove();
    }

    const message = `${name}: Failed to get value by "?ag-test-url" from ${expectedHref}`;
    assert.strictEqual(logs.filter((log) => log === message).length, 0, 'sanitized link is not logged as failure');
    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href is not changed');
});

test('failure is logged after the page changes the value of the sanitized link', async (assert) => {
    const expectedHref = 'https://target.example/changed-value';
    // not matched by selectors of rules from previous tests, which are still active
    const invalidValue = 'ftp://changed-value.example/';
    const elem = createElem('https://tracker.example/changed-value', '', 'data-href', expectedHref);
    // selector still matches the link after the value is changed or removed
    elem.classList.add('ag-test-changed-value');

    runScriptlet(name, ['a.ag-test-changed-value', '[data-href]']);
    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href has been sanitized');

    // several DOM changes for each value to check that it is not logged again
    const logs = await getLogs(async () => {
        elem.setAttribute('data-href', invalidValue);
        await makeUnrelatedDomChange();
        await makeUnrelatedDomChange();
        elem.removeAttribute('data-href');
        await makeUnrelatedDomChange();
        await makeUnrelatedDomChange();
    });

    const count = (message) => logs.filter((log) => log === `${name}: ${message}`).length;
    assert.strictEqual(count(`Invalid URL: ${invalidValue}`), 1, 'invalid value is logged once');
    assert.strictEqual(
        count(`Failed to get value by "[data-href]" from ${expectedHref}`),
        1,
        'removed value is logged once',
    );
    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href is not changed');
});

test('invalid nested redirect is logged after the limit of nested redirects', async (assert) => {
    const invalidValue = 'ftp://ag-test-nested-invalid.example/';
    const wrap = (url) => `https://tracker.example/nested-invalid?ag-test-u=${encodeURIComponent(url)}`;
    let href = invalidValue;
    // one more nested redirect than sanitized at once
    for (let i = 0; i < 11; i += 1) {
        href = wrap(href);
    }
    const elem = createElem(href);
    elem.classList.add('ag-test-nested-invalid');

    runScriptlet(name, ['a.ag-test-nested-invalid', '?ag-test-u']);
    assert.strictEqual(elem.getAttribute('href'), wrap(invalidValue), 'limited number of redirects is sanitized');

    // several DOM changes to check that it is not logged again
    const logs = await getLogs(async () => {
        await makeUnrelatedDomChange();
        await makeUnrelatedDomChange();
    });

    const message = `${name}: Invalid URL: ${invalidValue}`;
    assert.strictEqual(logs.filter((log) => log === message).length, 1, 'invalid nested redirect is logged once');
});

test('invalid nested base64 redirect is logged', (assert) => {
    const invalidValue = 'ftp://ag-test-b64-invalid.example/';
    const innerHref = `https://tracker.example/b64-invalid-inner/#${window.btoa(invalidValue)}`;
    const elem = createElem(`https://tracker.example/b64-invalid-outer/#${window.btoa(innerHref)}`);
    elem.classList.add('ag-test-b64-invalid');

    const logs = getSyncLogs(() => runScriptlet(name, ['a.ag-test-b64-invalid', '[href]', 'base64decode']));

    assert.strictEqual(elem.getAttribute('href'), innerHref, 'outer redirect is sanitized');
    assert.ok(logs.includes(`${name}: Invalid URL: ${invalidValue}`), 'invalid nested redirect is logged');
});

test('padded root-relative value is set if there is nothing to remove', (assert) => {
    const elem = createElem('https://tracker.example/padded-path', '', 'data-href', ' /ag-test-padded-path');

    runScriptlet(name, ['a[href="https://tracker.example/padded-path"]', '[data-href]', 'removeHash']);

    assert.strictEqual(elem.getAttribute('href'), `${window.location.origin}/ag-test-padded-path`, 'href is set');
    assert.strictEqual(window.hit, 'FIRED', 'hit function has been called');
});

test('link which already points to the decoded URL is left as is and not logged', (assert) => {
    const mailto = 'mailto:ag-test-b64-mailto@example.org';
    const elem = createElem(mailto, '', 'data-ag-test-enc', window.btoa(mailto));

    const logs = getSyncLogs(() => runScriptlet(name, ['a[data-ag-test-enc]', '[data-ag-test-enc]', 'base64decode']));

    assert.strictEqual(elem.getAttribute('href'), mailto, 'href is not changed');
    assert.strictEqual(logs.length, 0, 'nothing is logged');
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
});

test('link text with non-ASCII whitespaces is not a URL', (assert) => {
    // no-break space and ideographic space
    ['Click\u00a0here', 'ag-test\u3000text'].forEach((text, i) => {
        const href = `https://tracker.example/non-ascii-whitespace-${i}`;
        const elem = createElem(href, text);

        const logs = getSyncLogs(() => runScriptlet(name, [`a[href="${href}"]`]));

        assert.strictEqual(elem.getAttribute('href'), href, `${JSON.stringify(text)}: href is not changed`);
        assert.ok(logs.includes(`${name}: Invalid URL: ${text}`), `${JSON.stringify(text)}: invalid URL is logged`);
    });
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
});

test('failure of absolute value is not logged again after base URL change', async (assert) => {
    // not matched by selectors of rules from previous tests, which are still active
    const invalidValue = 'ftp://absolute-failure.example/';
    createElem('https://tracker.example/absolute-failure', '', 'data-href', invalidValue);

    const base = document.createElement('base');
    base.setAttribute('href', `${window.location.origin}/ag-test-base-dir/`);
    let logs;
    try {
        logs = await getLogs(async () => {
            runScriptlet(name, ['a[href="https://tracker.example/absolute-failure"]', '[data-href]']);
            // e.g. page routing changes the base URL, which does not affect resolving of absolute URL
            document.head.appendChild(base);
            await makeUnrelatedDomChange();
            base.remove();
            await makeUnrelatedDomChange();
        });
    } finally {
        base.remove();
    }

    const message = `${name}: Invalid URL: ${invalidValue}`;
    assert.strictEqual(logs.filter((log) => log === message).length, 1, 'failure is logged once');
});

test('failure of value which is not a URL is not logged again after base URL change', async (assert) => {
    const cases = [
        {
            href: 'https://tracker.example/not-url-base-change-text',
            text: 'Click here',
            args: ['a[href="https://tracker.example/not-url-base-change-text"]'],
            invalidValue: 'Click here',
        },
        {
            href: 'https://tracker.example/not-url-base-change-attr',
            attributeValue: 'https://[',
            args: ['a[href="https://tracker.example/not-url-base-change-attr"]', '[data-href]', 'removeHash'],
            invalidValue: 'https://[',
        },
    ];

    const base = document.createElement('base');
    base.setAttribute('href', `${window.location.origin}/ag-test-base-dir/`);
    let logs;
    try {
        logs = await getLogs(async () => {
            cases.forEach(({
                href,
                text,
                attributeValue,
                args,
            }) => {
                createElem(href, text, 'data-href', attributeValue);
                runScriptlet(name, args);
            });
            // e.g. page routing changes the base URL, which does not affect such failure
            document.head.appendChild(base);
            await makeUnrelatedDomChange();
            base.remove();
            await makeUnrelatedDomChange();
        });
    } finally {
        base.remove();
    }

    cases.forEach(({ invalidValue }) => {
        const message = `${name}: Invalid URL: ${invalidValue}`;
        assert.strictEqual(logs.filter((log) => log === message).length, 1, `${invalidValue}: failure is logged once`);
    });
});

test('relative value with special scheme is sanitized again after base URL change', async (assert) => {
    // URL with the same special scheme as the base URL but without slashes is relative
    const relativeValue = `${window.location.protocol}ag-test-special-scheme`;
    const elem = createElem('https://tracker.example/special-scheme', '', 'data-href', relativeValue);
    // selector still matches the link after it is sanitized
    elem.classList.add('ag-test-special-scheme');

    runScriptlet(name, ['a.ag-test-special-scheme', '[data-href]']);
    assert.strictEqual(elem.getAttribute('href'), `${window.location.origin}/ag-test-special-scheme`, 'href is set');

    const baseDirUrl = `${window.location.origin}/ag-test-base-dir/`;
    const base = document.createElement('base');
    base.setAttribute('href', baseDirUrl);
    try {
        document.head.appendChild(base);
        await makeUnrelatedDomChange();
        assert.strictEqual(elem.getAttribute('href'), `${baseDirUrl}ag-test-special-scheme`, 'href is set again');
    } finally {
        base.remove();
    }
});

test('link with empty href is sanitized after base URL change', async (assert) => {
    // empty href resolves to the page URL, which is the same as the value, so the link is left as is
    const pageUrl = document.baseURI.split('#')[0];
    const elem = createElem('', '', 'data-href', pageUrl);
    elem.classList.add('ag-test-empty-href');

    runScriptlet(name, ['a.ag-test-empty-href', '[data-href]']);
    assert.strictEqual(elem.getAttribute('href'), '', 'href is not changed');

    const base = document.createElement('base');
    base.setAttribute('href', `${window.location.origin}/ag-test-base-dir/`);
    try {
        // empty href now resolves to the base URL, which differs from the value
        document.head.appendChild(base);
        await makeUnrelatedDomChange();
        assert.strictEqual(elem.getAttribute('href'), pageUrl, 'href is sanitized');
    } finally {
        base.remove();
    }
});

test('link within the page with the same text is left as is and not logged', (assert) => {
    const anchorHref = '#ag-test-same-text-anchor';
    const elem = createElem(anchorHref, anchorHref);

    const logs = getSyncLogs(() => runScriptlet(name, [`a[href="${anchorHref}"]`, 'text', 'removeHash']));

    assert.strictEqual(elem.getAttribute('href'), anchorHref, 'href is not changed');
    assert.strictEqual(logs.length, 0, 'nothing is logged');
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
});

test('failure is logged again after the value is changed back to the failed one', async (assert) => {
    const validValue = 'https://target.example/cycle';
    // not matched by selectors of rules from previous tests, which are still active
    const invalidValue = 'ftp://cycle.example/';
    const elem = createElem('https://tracker.example/cycle', '', 'data-href', validValue);
    elem.classList.add('ag-test-cycle');

    runScriptlet(name, ['a.ag-test-cycle', '[data-href]']);
    assert.strictEqual(elem.getAttribute('href'), validValue, 'href has been sanitized');

    const logs = await getLogs(async () => {
        elem.setAttribute('data-href', invalidValue);
        await makeUnrelatedDomChange();
        elem.setAttribute('data-href', validValue);
        await makeUnrelatedDomChange();
        elem.setAttribute('data-href', invalidValue);
        await makeUnrelatedDomChange();
    });

    const message = `${name}: Invalid URL: ${invalidValue}`;
    assert.strictEqual(logs.filter((log) => log === message).length, 2, 'failure is logged each time');
});

test('failure is not logged again after base URL change with the same resolved URL', async (assert) => {
    const relativeValue = 'ag-test-same-resolved';
    createElem('https://tracker.example/same-resolved', '', 'data-href', relativeValue);

    // relative value is resolved to a URL with not allowed protocol
    const base = document.createElement('base');
    base.setAttribute('href', 'ftp://ag-test.example/dir/first');
    let logs;
    try {
        logs = await getLogs(async () => {
            document.head.appendChild(base);
            runScriptlet(name, ['a[href="https://tracker.example/same-resolved"]', '[data-href]']);
            // the value is still resolved to the same URL
            base.setAttribute('href', 'ftp://ag-test.example/dir/second');
            await makeUnrelatedDomChange();
        });
    } finally {
        base.remove();
    }

    const message = `${name}: Invalid URL: ${relativeValue}`;
    assert.strictEqual(logs.filter((log) => log === message).length, 1, 'failure is logged once');
});

test('link is sanitized again after page URL change by history API', async (assert) => {
    const relativeHref = 'ag-test-history-change';
    const expectedHref = new URL(relativeHref, document.baseURI).href;
    // relative href already points to the URL from the attribute, so it is kept
    const elem = createElem(relativeHref, '', 'data-href', expectedHref);
    elem.classList.add('ag-test-history-change');

    runScriptlet(name, ['a.ag-test-history-change', '[data-href]']);
    assert.strictEqual(elem.getAttribute('href'), relativeHref, 'relative href is kept');

    const originalUrl = window.location.href;
    try {
        // e.g. page routing changes the page URL, so the relative href points elsewhere
        window.history.replaceState(null, '', '/ag-test-history-dir/page');
        await makeUnrelatedDomChange();
        assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href is sanitized again');
    } finally {
        window.history.replaceState(null, '', originalUrl);
    }
});

test('value which cannot be resolved against the base URL is sanitized after base URL change', async (assert) => {
    const relativeValue = 'ag-test-unresolvable#utm_source=test';
    const initialHref = 'https://tracker.example/unresolvable';
    const elem = createElem(initialHref, '', 'data-href', relativeValue);
    elem.classList.add('ag-test-unresolvable');

    // relative URL cannot be resolved against 'blob:' base URL
    const blobUrl = URL.createObjectURL(new Blob(['']));
    const base = document.createElement('base');
    base.setAttribute('href', blobUrl);
    let logs;
    try {
        document.head.appendChild(base);
        logs = getSyncLogs(() => runScriptlet(name, ['a.ag-test-unresolvable', '[data-href]', 'removeHash']));
    } finally {
        base.remove();
        URL.revokeObjectURL(blobUrl);
    }
    assert.strictEqual(elem.getAttribute('href'), initialHref, 'href is not changed');
    assert.ok(logs.includes(`${name}: Invalid URL: ${relativeValue}`), 'invalid URL is logged');

    await makeUnrelatedDomChange();
    assert.strictEqual(
        elem.getAttribute('href'),
        `${window.location.origin}/ag-test-unresolvable`,
        'href is sanitized with page base URL',
    );
});

test('link changed to more nested redirects than the limit is checked again', async (assert) => {
    const invalidValue = 'ftp://ag-test-limit-state.example/';
    const wrap = (url) => `https://tracker.example/limit-state?ag-test-l=${encodeURIComponent(url)}`;
    const elem = createElem(wrap(wrap(invalidValue)));
    elem.classList.add('ag-test-limit-state');

    runScriptlet(name, ['a.ag-test-limit-state', '?ag-test-l']);
    // the outer redirect is sanitized and the invalid nested one is logged
    assert.strictEqual(elem.getAttribute('href'), wrap(invalidValue), 'outer redirect is sanitized');

    let href = invalidValue;
    for (let i = 0; i < 11; i += 1) {
        href = wrap(href);
    }
    const logs = await getLogs(async () => {
        // page changes the link, so after the limit of nested redirects it is the same as before
        elem.setAttribute('href', href);
        await makeUnrelatedDomChange();
        await makeUnrelatedDomChange();
    });

    assert.strictEqual(elem.getAttribute('href'), wrap(invalidValue), 'nested redirects are sanitized');
    const message = `${name}: Invalid URL: ${invalidValue}`;
    assert.strictEqual(logs.filter((log) => log === message).length, 1, 'invalid nested redirect is logged again');
});

test('path is set by remove transform if there is nothing to remove', (assert) => {
    ['./ag-test-path-dot', '../ag-test-path-up', 'ag-test-dir/file.pdf'].forEach((path, i) => {
        const href = `https://tracker.example/path-${i}`;
        const elem = createElem(href, '', 'data-href', path);

        runScriptlet(name, [`a[href="${href}"]`, '[data-href]', 'removeParam']);

        assert.strictEqual(elem.getAttribute('href'), new URL(path, document.baseURI).href, `${path}: href is set`);
    });
    assert.strictEqual(window.hit, 'FIRED', 'hit function has been called');
});

test('relative URL decoded from base64 is sanitized again after page URL change', async (assert) => {
    // URL with the same special scheme as the page URL but without slashes is relative
    const decodedValue = `${window.location.protocol}ag-test-b64-relative`;
    const elem = createElem('https://tracker.example/b64-relative', '', 'data-href', window.btoa(decodedValue));
    elem.classList.add('ag-test-b64-relative');

    runScriptlet(name, ['a.ag-test-b64-relative', '[data-href]', 'base64decode']);
    assert.strictEqual(elem.getAttribute('href'), `${window.location.origin}/ag-test-b64-relative`, 'href is set');

    const originalUrl = window.location.href;
    try {
        // e.g. page routing changes the page URL, so the decoded relative URL points elsewhere
        window.history.replaceState(null, '', '/ag-test-b64-dir/page');
        await makeUnrelatedDomChange();
        assert.strictEqual(
            elem.getAttribute('href'),
            `${window.location.origin}/ag-test-b64-dir/ag-test-b64-relative`,
            'href is sanitized again',
        );
    } finally {
        window.history.replaceState(null, '', originalUrl);
    }
});

test('nested redirect is sanitized after the link is matched by the selector again', async (assert) => {
    const fileHref = 'https://files.example/rematch.pdf';
    const viewerHref = `https://viewer.example/open?url=${encodeURIComponent(fileHref)}`;
    const elem = createElem(`https://tracker.example/rematch?url=${encodeURIComponent(viewerHref)}`);

    runScriptlet(name, ['a[href^="https://tracker.example/rematch"], a.ag-test-force-clean', '?url']);
    assert.strictEqual(elem.getAttribute('href'), viewerHref, 'viewer URL is kept, since it is not matched');

    // page makes the link matched by the rule again
    elem.classList.add('ag-test-force-clean');
    await makeUnrelatedDomChange();
    assert.strictEqual(elem.getAttribute('href'), fileHref, 'nested redirect is sanitized');
});

test('link text with a URL and other words is not a URL', (assert) => {
    [
        'https://target.example/page (external)',
        'https://target.example/report 2026.pdf',
        // text of several elements, e.g. URL split into lines
        '<span>https://target.example/</span>\n    <span>path</span>',
    ].forEach((html, i) => {
        const href = `https://tracker.example/text-with-words-${i}`;
        const elem = createElem(href);
        elem.innerHTML = html;

        const logs = getSyncLogs(() => runScriptlet(name, [`a[href="${href}"]`]));

        assert.strictEqual(elem.getAttribute('href'), href, `${JSON.stringify(html)}: href is not changed`);
        assert.ok(
            logs.includes(`${name}: Invalid URL: ${elem.textContent}`),
            `${JSON.stringify(html)}: invalid URL is logged`,
        );
    });
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
});

test('explicit URL sources with spaces follow URL parsing and protocol validation', (assert) => {
    [
        {
            href: 'https://tracker.example/attr-not-url',
            attributeValue: 'Not available',
            args: ['a[href="https://tracker.example/attr-not-url"]', '[data-href]'],
            value: 'Not available',
        },
        {
            // '+' is decoded as a whitespace
            href: 'https://tracker.example/param-not-url?url=hello+world',
            args: ['a[href="https://tracker.example/param-not-url?url=hello+world"]', '?url'],
            value: 'hello world',
        },
        {
            href: 'https://tracker.example/param-not-url-encoded?url=Not%20available',
            args: ['a[href="https://tracker.example/param-not-url-encoded?url=Not%20available"]', '?url'],
            value: 'Not available',
        },
        {
            // text with a colon is parsed as an absolute URL with not allowed protocol
            href: 'https://tracker.example/attr-colon',
            attributeValue: 'Note: see below',
            args: ['a[href="https://tracker.example/attr-colon"]', '[data-href]'],
            value: 'Note: see below',
        },
        {
            // path followed by other words
            href: 'https://tracker.example/attr-path-words',
            attributeValue: '/ag-test-page (external)',
            args: ['a[href="https://tracker.example/attr-path-words"]', '[data-href]'],
            value: '/ag-test-page (external)',
        },
        {
            // absolute URL followed by other words
            href: 'https://tracker.example/attr-url-words',
            attributeValue: 'https://target.example/ (opens in new tab)',
            args: ['a[href="https://tracker.example/attr-url-words"]', '[data-href]'],
            value: 'https://target.example/ (opens in new tab)',
        },
        {
            href: `https://tracker.example/param-url-words?url=${encodeURIComponent(
                'https://target.example/ (external)',
            )}`,
            args: ['a[href^="https://tracker.example/param-url-words?"]', '?url'],
            value: 'https://target.example/ (external)',
        },
    ].forEach(({
        href,
        attributeValue,
        args,
        value,
    }) => {
        const elem = createElem(href, '', 'data-href', attributeValue);

        const logs = getSyncLogs(() => runScriptlet(name, args));

        const expectedURL = new URL(value, document.baseURI);
        if (expectedURL.protocol === 'note:') {
            assert.strictEqual(elem.getAttribute('href'), href, 'unsupported protocol is not set');
            assert.ok(logs.includes(`${name}: Invalid URL: ${value}`), 'unsupported protocol is logged');
        } else {
            assert.strictEqual(elem.getAttribute('href'), expectedURL.href, `${value}: parsed URL is set`);
            assert.notOk(logs.some((log) => log.includes('Invalid URL')), 'valid URL is not rejected');
        }
    });
});

test('nested redirects through different hosts are sanitized at once if selector matches all of them', (assert) => {
    const finalHref = 'https://target.example/chain-final';
    const secondHref = `https://tracker-two.example/chain?url=${encodeURIComponent(finalHref)}`;
    const elem = createElem(`https://tracker-one.example/chain?url=${encodeURIComponent(secondHref)}`);

    runScriptlet(name, [
        'a[href^="https://tracker-one.example/chain?"], a[href^="https://tracker-two.example/chain?"]',
        '?url',
    ]);

    assert.strictEqual(elem.getAttribute('href'), finalHref, 'all nested redirects are sanitized');
    assert.strictEqual(window.hit, 'FIRED', 'hit function has been called');
});

test('nested redirects are sanitized at once if selector contains :scope', (assert) => {
    const finalHref = 'https://target.example/scope-final';
    const wrap = (url) => `https://tracker.example/scope?ag-test-url=${encodeURIComponent(url)}`;
    const elem = createElem(wrap(wrap(wrap(finalHref))));
    elem.classList.add('ag-test-scope-nested');

    // ':scope' means the document root for querySelectorAll(), but the element itself for matches()
    runScriptlet(name, [':scope a.ag-test-scope-nested', '?ag-test-url']);

    assert.strictEqual(elem.getAttribute('href'), finalHref, 'all nested redirects are sanitized');
    assert.strictEqual(window.hit, 'FIRED', 'hit function has been called');
});

test('base64 string which is not a URL is not logged if another one is decoded', async (assert) => {
    const expectedHref = 'https://target.example/b64-partial';
    const notUrl = window.btoa('ag-test-not-url');
    const value = `https://tracker.example/out?${notUrl}&${window.btoa(expectedHref)}`;
    const elem = createElem('https://tracker.example/b64-partial', '', 'data-ag-test-b64-partial', value);
    elem.classList.add('ag-test-b64-partial');

    const base = document.createElement('base');
    base.setAttribute('href', `${window.location.origin}/ag-test-base-dir/`);
    let logs;
    try {
        logs = await getLogs(async () => {
            runScriptlet(name, ['a.ag-test-b64-partial', '[data-ag-test-b64-partial]', 'base64decode']);
            // base64 link is processed again after base URL change
            document.head.appendChild(base);
            await makeUnrelatedDomChange();
        });
    } finally {
        base.remove();
    }

    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href has been sanitized');
    assert.deepEqual(logs.filter((log) => log.includes(notUrl)), [], 'base64 string which is not a URL is not logged');
});

test('link sanitized by parameter is not logged as failure after another rule changes it', async (assert) => {
    const targetHref = 'https://target.example/other-rule';
    const trackedHref = `${targetHref}?utm_source=ag-test`;
    const elem = createElem(`https://tracker.example/other-rule?ag-test-url=${encodeURIComponent(trackedHref)}`);
    elem.classList.add('ag-test-other-rule');

    const logs = await getLogs(async () => {
        runScriptlet(name, ['a.ag-test-other-rule', '?ag-test-url']);
        // another rule removes tracking parameter from the URL set by the first one
        runScriptlet(name, ['a.ag-test-other-rule', '[href]', 'removeParam:utm_source']);
        await makeUnrelatedDomChange();
        await makeUnrelatedDomChange();
    });

    assert.strictEqual(elem.getAttribute('href'), targetHref, 'href has been sanitized by both rules');
    assert.deepEqual(
        logs.filter((log) => log.startsWith(`${name}: Failed to get value by "?ag-test-url"`)),
        [],
        'link sanitized by the rule is not logged as failure',
    );
});

test('value of only whitespaces is not a URL', (assert) => {
    [
        { href: 'https://tracker.example/only-space-attr', attributeValue: ' ', args: ['[data-href]'] },
        {
            href: 'https://tracker.example/only-space-attr-remove',
            attributeValue: '\n  ',
            args: ['[data-href]', 'removeParam:utm_source'],
        },
        { href: 'https://tracker.example/only-space-param?url=%20', args: ['?url'] },
        { href: 'https://tracker.example/only-plus-param?url=+', args: ['?url'] },
    ].forEach(({ href, attributeValue, args }) => {
        const elem = createElem(href, '', 'data-href', attributeValue);

        const logs = getSyncLogs(() => runScriptlet(name, [`a[href="${href}"]`, ...args]));

        assert.strictEqual(elem.getAttribute('href'), href, `${href}: href is not changed`);
        assert.ok(
            logs.includes(`${name}: Failed to get value by "${args[0]}" from ${href}`),
            `${href}: no value is logged`,
        );
    });
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
});

test('decoded URLs with spaces follow URL parsing', (assert) => {
    const decodedValue = 'https://target.example/ (external)';
    const encodedValue = window.btoa(decodedValue);
    const elem = createElem('https://tracker.example/b64-words', '', 'data-ag-test-b64-words', encodedValue);

    const logs = getSyncLogs(() => {
        runScriptlet(name, ['a[data-ag-test-b64-words]', '[data-ag-test-b64-words]', 'base64decode']);
    });

    assert.strictEqual(elem.getAttribute('href'), new URL(decodedValue).href, 'parsed URL is set');
    assert.notOk(logs.includes(`${name}: Invalid URL: ${decodedValue}`), 'valid URL is not rejected');
});

test('plus sign is kept in URL parameter with not encoded URL', (assert) => {
    [
        {
            href: 'https://tracker.example/plus-path?url=https://target.example/c++/docs',
            expectedHref: 'https://target.example/c++/docs',
        },
        {
            href: 'https://tracker.example/plus-query?url=https://target.example/search?q=hello+world',
            expectedHref: 'https://target.example/search?q=hello+world',
        },
        {
            href: 'https://tracker.example/plus-relative?url=/ag-test-search?q=hello+world',
            expectedHref: `${window.location.origin}/ag-test-search?q=hello+world`,
        },
        {
            // encoded URL is decoded as usual, including '%2B' to '+'
            href: `https://tracker.example/plus-encoded?url=${encodeURIComponent(
                'https://target.example/c++/encoded',
            )}`,
            expectedHref: 'https://target.example/c++/encoded',
        },
        {
            // not encoded URL with non-ASCII characters, which are percent-encoded in href
            href: 'https://tracker.example/plus-non-ascii?url=https://target.example/über+uns',
            expectedHref: 'https://target.example/%C3%BCber+uns',
        },
        {
            // not encoded URL with its own percent-encoded characters
            href: 'https://tracker.example/plus-percent?url=https://target.example/s?q=caf%C3%A9+au+lait',
            expectedHref: 'https://target.example/s?q=caf%C3%A9+au+lait',
        },
        {
            // URL with encoded colon only
            href: 'https://tracker.example/plus-colon?url=https%3A//target.example/c++/colon',
            expectedHref: 'https://target.example/c++/colon',
        },
        {
            // '+' in the query means a whitespace anyway
            href: 'https://tracker.example/plus-relative-query?url=ag-test-page.html?q=a+b',
            expectedHref: new URL('ag-test-page.html?q=a+b', document.baseURI).href,
        },
    ].forEach(({ href, expectedHref }) => {
        const elem = createElem(href);

        runScriptlet(name, [`a[href="${href}"]`, '?url']);

        assert.strictEqual(elem.getAttribute('href'), expectedHref, `${href}: href has been sanitized`);
    });
    assert.strictEqual(window.hit, 'FIRED', 'hit function has been called');
});

test('failure of nested redirect is not logged again after base URL change', async (assert) => {
    const cases = [
        {
            // nested redirect has not allowed protocol
            description: 'parameter',
            href: `https://tracker.example/relog?ag-test-relog=${encodeURIComponent(
                'https://tracker.example/relog-inner?ag-test-relog=ftp%3A%2F%2Fag-test-relog-param.example%2F',
            )}`,
            args: ['a.ag-test-relog-param', '?ag-test-relog'],
            className: 'ag-test-relog-param',
            message: `${name}: Invalid URL: ftp://ag-test-relog-param.example/`,
        },
        {
            // nested base64 redirect has not allowed protocol
            description: 'base64',
            href: `https://tracker.example/relog-b64/#${window.btoa(
                `https://tracker.example/relog-b64-inner/#${window.btoa('ftp://ag-test-relog.example/')}`,
            )}`,
            args: ['a.ag-test-relog-b64', '[href]', 'base64decode'],
            className: 'ag-test-relog-b64',
            message: `${name}: Invalid URL: ftp://ag-test-relog.example/`,
        },
    ];

    const originalUrl = window.location.href;
    let logs;
    try {
        logs = await getLogs(async () => {
            cases.forEach(({ href, args, className }) => {
                createElem(href).classList.add(className);
                runScriptlet(name, args);
            });
            // e.g. page routing changes the page URL, which is the base URL
            window.history.replaceState(null, '', '/ag-test-relog-dir/first');
            await makeUnrelatedDomChange();
            window.history.replaceState(null, '', '/ag-test-relog-dir/second');
            await makeUnrelatedDomChange();
        });
    } finally {
        window.history.replaceState(null, '', originalUrl);
    }

    cases.forEach(({ description, message }) => {
        assert.strictEqual(logs.filter((log) => log === message).length, 1, `${description}: failure is logged once`);
    });
});

test('link text is a URL only if it is an absolute URL or a path', (assert) => {
    [
        { text: 'www.example.com', args: ['text', 'removeParam:utm_source'] },
        { text: 'ag-test-download', args: ['text', 'removeHash'] },
        { text: 'ag-test-download', args: [] },
        { text: '(https://target.example/page)', args: [] },
    ].forEach(({ text, args }, i) => {
        const href = `https://tracker.example/text-not-url-${i}`;
        const elem = createElem(href, text);

        const logs = getSyncLogs(() => runScriptlet(name, [`a[href="${href}"]`, ...args]));

        assert.strictEqual(elem.getAttribute('href'), href, `${text}: href is not changed`);
        assert.ok(logs.includes(`${name}: Invalid URL: ${text}`), `${text}: invalid URL is logged`);
    });
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
});

test('URL with whitespaces from attribute, URL parameter or base64 is set', (assert) => {
    const resolve = (url) => new URL(url, document.baseURI).href;
    [
        {
            href: 'https://tracker.example/path-space-attr',
            attributeValue: '/ag-test-files/Annual Report.pdf',
            args: ['[data-href]'],
            expectedHref: resolve('/ag-test-files/Annual Report.pdf'),
        },
        {
            href: 'https://tracker.example/path-space-cdn',
            attributeValue: '//cdn.example/My File.pdf',
            args: ['[data-href]'],
            expectedHref: resolve('//cdn.example/My File.pdf'),
        },
        {
            href: `https://tracker.example/path-space-param?url=${encodeURIComponent('/ag-test-files/my file.pdf')}`,
            args: ['?url'],
            expectedHref: resolve('/ag-test-files/my file.pdf'),
        },
        {
            href: 'https://tracker.example/url-space-attr',
            attributeValue: 'https://cdn.example/My File.pdf',
            args: ['[data-href]'],
            expectedHref: 'https://cdn.example/My%20File.pdf',
        },
        {
            // '+' of encoded URL is decoded as a whitespace
            href: 'https://tracker.example/url-space-param?url=https%3A%2F%2Ftarget.example%2Fmy+file.pdf',
            args: ['?url'],
            expectedHref: 'https://target.example/my%20file.pdf',
        },
        {
            // percent-encoded whitespace of not encoded URL
            href: 'https://tracker.example/url-space-raw-param?url=https://target.example/report%202026.pdf',
            args: ['?url'],
            expectedHref: 'https://target.example/report%202026.pdf',
        },
        {
            href: 'https://tracker.example/url-space-base64',
            attributeValue: window.btoa('https://target.example/Annual Report.pdf'),
            args: ['[data-href]', 'base64decode'],
            expectedHref: 'https://target.example/Annual%20Report.pdf',
        },
    ].forEach(({
        href,
        attributeValue,
        args,
        expectedHref,
    }) => {
        const elem = createElem(href, '', 'data-href', attributeValue);

        runScriptlet(name, [`a[href="${href}"]`, ...args]);

        assert.strictEqual(elem.getAttribute('href'), expectedHref, `${href}: href has been sanitized`);
    });
    assert.strictEqual(window.hit, 'FIRED', 'hit function has been called');
});

test('placeholder hash is not a URL, unless it is href of the link', (assert) => {
    [
        {
            href: 'https://tracker.example/hash-attr-remove',
            attributeValue: '#',
            args: ['[data-href]', 'removeParam:utm_source'],
            invalidValue: '#',
        },
        {
            href: 'https://tracker.example/hash-attr',
            attributeValue: '#',
            args: ['[data-href]'],
            invalidValue: '#',
        },
        {
            href: 'https://tracker.example/hashbang-attr',
            attributeValue: '#!',
            args: ['[data-href]'],
            invalidValue: '#!',
        },
        {
            // link text is a URL only if it is an absolute URL or a path, e.g. not a hashtag
            href: 'https://tracker.example/hash-text',
            text: '#ag-test-tag',
            args: ['text', 'removeParam'],
            invalidValue: '#ag-test-tag',
        },
    ].forEach(({
        href,
        text,
        attributeValue,
        args,
        invalidValue,
    }) => {
        const elem = createElem(href, text, 'data-href', attributeValue);

        const logs = getSyncLogs(() => runScriptlet(name, [`a[href="${href}"]`, ...args]));

        assert.strictEqual(elem.getAttribute('href'), href, `${href}: href is not changed`);
        assert.ok(logs.includes(`${name}: Invalid URL: ${invalidValue}`), `${href}: invalid URL is logged`);
    });
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
});

test('hash from attribute or URL parameter is set as link within the page', (assert) => {
    const resolve = (url) => new URL(url, document.baseURI).href;
    [
        { href: 'https://tracker.example/hash-reviews', attributeValue: '#reviews', args: ['[data-href]'] },
        {
            // hash of the link within the page is not removed
            href: 'https://tracker.example/hash-reviews-remove',
            attributeValue: '#reviews',
            args: ['[data-href]', 'removeHash'],
        },
        { href: 'https://tracker.example/hash-param?u=%23top', args: ['?u', 'removeParam'] },
    ].forEach(({ href, attributeValue, args }) => {
        const elem = createElem(href, '', 'data-href', attributeValue);
        const hash = attributeValue || '#top';

        runScriptlet(name, [`a[href="${href}"]`, ...args]);

        assert.strictEqual(elem.getAttribute('href'), resolve(hash), `${href}: href has been sanitized`);
    });
    assert.strictEqual(window.hit, 'FIRED', 'hit function has been called');
});

test('removeHash does not change link with empty hash', (assert) => {
    const href = '/ag-test-empty-hash#';
    const elem = createElem(href);
    elem.classList.add('ag-test-empty-hash');

    const counter = createAttrMutationCounter([elem], ['href']);
    runScriptlet(name, ['a.ag-test-empty-hash', '[href]', 'removeHash']);

    const done = assert.async();
    // mutation observer callbacks are async, so wait for them
    setTimeout(() => {
        const mutations = counter.count;
        counter.disconnect();
        // e.g. '/#' only scrolls the page, while '/' reloads it
        assert.strictEqual(elem.getAttribute('href'), href, 'href is not changed');
        assert.strictEqual(mutations, 0, 'setAttribute is not called');
        assert.strictEqual(window.hit, undefined, 'hit function has not been called');
        done();
    }, ATTR_SETTLE_DELAY_MS);
});

test('base64 URL of the target is not decoded if the target is not matched by the selector', async (assert) => {
    // login page with the return URL, which should not be skipped
    const loginHref = `https://sso.example/login?${window.btoa('https://app.example/account')}`;
    const elem = createElem(`https://tracker.example/sso-out/?${window.btoa(loginHref)}`);

    runScriptlet(name, ['a[href^="https://tracker.example/sso-out/"]', '[href]', 'base64decode']);
    assert.strictEqual(elem.getAttribute('href'), loginHref, 'login URL is kept');

    await makeUnrelatedDomChange();
    assert.strictEqual(elem.getAttribute('href'), loginHref, 'login URL is kept after DOM change');
});

test('nested base64 redirects through different hosts are sanitized at once if selector matches them', (assert) => {
    const finalHref = 'https://target.example/b64-chain-final';
    const secondHref = `https://tracker-two.example/b64-chain?${window.btoa(finalHref)}`;
    const elem = createElem(`https://tracker-one.example/b64-chain?${window.btoa(secondHref)}`);

    runScriptlet(name, [
        'a[href^="https://tracker-one.example/b64-chain?"], a[href^="https://tracker-two.example/b64-chain?"]',
        '[href]',
        'base64decode',
    ]);

    assert.strictEqual(elem.getAttribute('href'), finalHref, 'all nested redirects are sanitized');
    assert.strictEqual(window.hit, 'FIRED', 'hit function has been called');
});

test('link reused by the page for another URL without parameter is logged', async (assert) => {
    const targetHref = 'https://target.example/reused';
    const elem = createElem(`https://tracker.example/reused?ag-test-url=${encodeURIComponent(targetHref)}`);
    elem.classList.add('ag-test-reused');

    runScriptlet(name, ['a.ag-test-reused', '?ag-test-url']);
    assert.strictEqual(elem.getAttribute('href'), targetHref, 'href has been sanitized');

    const reusedHref = 'https://tracker.example/reused-other?target=ag-test';
    const logs = await getLogs(async () => {
        // e.g. virtual list reuses the element for another link
        elem.setAttribute('href', reusedHref);
        await makeUnrelatedDomChange();
        await makeUnrelatedDomChange();
    });

    const message = `${name}: Failed to get value by "?ag-test-url" from ${reusedHref}`;
    assert.strictEqual(logs.filter((log) => log === message).length, 1, 'no value is logged once');
});

test('base64 in relative href is decoded', (assert) => {
    const expectedHref = 'https://target.example/b64-relative-href';
    const href = `/ag-test-out/?${window.btoa(expectedHref)}`;
    const elem = createElem(href);

    runScriptlet(name, [`a[href="${href}"]`, '[href]', 'base64decode']);

    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href has been sanitized');
    assert.strictEqual(window.hit, 'FIRED', 'hit function has been called');
});

test('selector without :scope is not queried again for nested redirects', (assert) => {
    const finalHref = 'https://target.example/no-requery';
    const wrap = (url) => `https://tracker.example/no-requery?ag-test-url=${encodeURIComponent(url)}`;
    const elem = createElem(wrap(wrap(wrap(finalHref))));
    elem.classList.add('ag-test-no-requery');
    const selector = 'a.ag-test-no-requery';

    let queryCount = 0;
    const nativeQuerySelectorAll = document.querySelectorAll;
    document.querySelectorAll = function querySelectorAll(...args) {
        if (args[0] === selector) {
            queryCount += 1;
        }
        return nativeQuerySelectorAll.apply(this, args);
    };
    try {
        runScriptlet(name, [selector, '?ag-test-url']);
    } finally {
        // own property is removed, so that the method of the prototype is used again
        delete document.querySelectorAll;
    }

    assert.strictEqual(elem.getAttribute('href'), finalHref, 'all nested redirects are sanitized');
    assert.strictEqual(queryCount, 1, 'selector is queried once');
    assert.notOk(Object.prototype.hasOwnProperty.call(document, 'querySelectorAll'), 'native method is restored');
});

test('rule and another rule which removes parameters or hash from its URL settle', async (assert) => {
    const cases = [
        {
            className: 'ag-test-settle-text',
            text: 'https://target.example/settle-text?utm_source=ag-test&id=1',
            args: ['text'],
            removeArgs: ['[href]', 'removeParam:utm_source'],
            expectedHref: 'https://target.example/settle-text?id=1',
        },
        {
            className: 'ag-test-settle-attr',
            attributeValue: 'https://target.example/settle-attr#utm_source=ag-test',
            args: ['[data-href]'],
            removeArgs: ['[href]', 'removeHash'],
            expectedHref: 'https://target.example/settle-attr',
        },
    ];
    const elems = cases.map(({
        className,
        text,
        attributeValue,
        args,
        removeArgs,
    }) => {
        const elem = createElem(`https://tracker.example/${className}`, text, 'data-href', attributeValue);
        elem.classList.add(className);
        runScriptlet(name, [`a.${className}`, ...args]);
        runScriptlet(name, [`a.${className}`, ...removeArgs]);
        return elem;
    });
    await makeUnrelatedDomChange();

    const counter = createAttrMutationCounter(elems, ['href']);
    await makeUnrelatedDomChange();
    await makeUnrelatedDomChange();
    const mutations = counter.count;
    counter.disconnect();

    cases.forEach(({ className, expectedHref }, i) => {
        assert.strictEqual(elems[i].getAttribute('href'), expectedHref, `${className}: href has been sanitized`);
    });
    assert.strictEqual(mutations, 0, 'href is not re-set');
});

test('link is sanitized again after the page adds parameters to it', async (assert) => {
    const expectedHref = 'https://target.example/page-adds-param';
    const elem = createElem('https://tracker.example/page-adds-param', '', 'data-href', expectedHref);
    elem.classList.add('ag-test-page-adds-param');

    runScriptlet(name, ['a.ag-test-page-adds-param', '[data-href]']);
    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href has been sanitized');

    elem.setAttribute('href', `${expectedHref}?ref=ag-test`);
    await makeUnrelatedDomChange();
    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href is sanitized again');
});

test('relative value of nested redirect is not followed', async (assert) => {
    [
        // target has its own parameter with the same name, which is not a URL
        'https://shop.example/product?url=summer-sale',
        // relative value of the nested redirect is resolved by it against its own URL, not the document one
        `https://tracker.example/nested-relative-inner?url=${encodeURIComponent('/ag-test-page')}`,
    ].forEach((innerHref, i) => {
        const className = `ag-test-nested-relative-${i}`;
        const elem = createElem(`https://tracker.example/nested-relative?url=${encodeURIComponent(innerHref)}`);
        elem.classList.add(className);

        runScriptlet(name, [`a.${className}`, '?url']);

        assert.strictEqual(elem.getAttribute('href'), innerHref, `${innerHref}: nested value is not followed`);
    });

    await makeUnrelatedDomChange();
    assert.strictEqual(
        document.querySelector('.ag-test-nested-relative-0').getAttribute('href'),
        'https://shop.example/product?url=summer-sale',
        'nested value is not followed after DOM change',
    );
});

test('base64 in hash is decoded if query has no base64 encoded URL', (assert) => {
    [
        {
            // resolved href of the link within the page has the query of the page, e.g. '?test'
            href: `#${window.btoa('https://target.example/b64-hash-only')}`,
            expectedHref: 'https://target.example/b64-hash-only',
        },
        {
            href: `https://tracker.example/b64-hash?ref=ag-test#${window.btoa('https://target.example/b64-hash')}`,
            expectedHref: 'https://target.example/b64-hash',
        },
    ].forEach(({ href, expectedHref }, i) => {
        const className = `ag-test-b64-hash-${i}`;
        const elem = createElem(href);
        elem.classList.add(className);

        runScriptlet(name, [`a.${className}`, '[href]', 'base64decode']);

        assert.strictEqual(elem.getAttribute('href'), expectedHref, `${href}: href has been sanitized`);
    });
    assert.strictEqual(window.hit, 'FIRED', 'hit function has been called');
});

test('tab and newline in URL are removed as the URL parser does', (assert) => {
    [
        {
            href: 'https://tracker.example/newline-text',
            html: '<span>https://target.example/</span>\n<span>newline-text</span>',
            args: [],
            expectedHref: 'https://target.example/newline-text',
        },
        {
            href: 'https://tracker.example/tab-text',
            html: 'https://target.example/\ttab-text',
            args: [],
            expectedHref: 'https://target.example/tab-text',
        },
        {
            href: 'https://tracker.example/newline-attr',
            attributeValue: 'https://target.example/\nnewline-attr',
            args: ['[data-href]'],
            expectedHref: 'https://target.example/newline-attr',
        },
    ].forEach(({
        href,
        html,
        attributeValue,
        args,
        expectedHref,
    }) => {
        const elem = createElem(href, '', 'data-href', attributeValue);
        if (html) {
            elem.innerHTML = html;
        }

        runScriptlet(name, [`a[href="${href}"]`, ...args]);

        assert.strictEqual(elem.getAttribute('href'), expectedHref, `${href}: href has been sanitized`);
    });
    assert.strictEqual(window.hit, 'FIRED', 'hit function has been called');
});

test('link text of only question mark is not a URL', (assert) => {
    const href = 'https://tracker.example/help-icon';
    const elem = createElem(href, '?');

    const logs = getSyncLogs(() => runScriptlet(name, [`a[href="${href}"]`]));

    assert.strictEqual(elem.getAttribute('href'), href, 'href is not changed');
    assert.ok(logs.includes(`${name}: Invalid URL: ?`), 'invalid URL is logged');
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
});

test('link text of query is set as relative URL', (assert) => {
    const href = 'https://tracker.example/query-text';
    const elem = createElem(href, '?ag-test-page=2');

    runScriptlet(name, [`a[href="${href}"]`]);

    assert.strictEqual(elem.getAttribute('href'), new URL('?ag-test-page=2', document.baseURI).href, 'href is set');
    assert.strictEqual(window.hit, 'FIRED', 'hit function has been called');
});

test('transform which only starts with removeParam is invalid', (assert) => {
    const href = 'https://target.example/remove-param-typo?id=7&utm_source=ag-test';
    const elem = createElem(href);

    const logs = getSyncLogs(() => runScriptlet(name, [`a[href="${href}"]`, '[href]', 'removeParams']));

    assert.strictEqual(elem.getAttribute('href'), href, 'parameters are not removed');
    assert.ok(logs.includes(`${name}: Invalid transform option: "removeParams"`), 'invalid transform is logged');
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
});

test('base64 in href within the page is decoded only from its hash', (assert) => {
    const cases = [
        { href: '#', expectedHref: '#' },
        { href: '#!', expectedHref: '#!' },
        { href: '#ag-test-comments', expectedHref: '#ag-test-comments' },
        {
            href: `#${window.btoa('https://target.example/b64-own-hash')}`,
            expectedHref: 'https://target.example/b64-own-hash',
        },
        {
            // relative href with its own query is resolved
            href: `?${window.btoa('https://target.example/b64-own-query')}`,
            expectedHref: 'https://target.example/b64-own-query',
        },
    ];
    const originalUrl = window.location.href;
    try {
        // page URL has its own base64 encoded URL in the query, e.g. interstitial page of the download
        window.history.replaceState(null, '', `?${window.btoa('https://target.example/b64-page-query')}`);
        cases.forEach(({ href, expectedHref }, i) => {
            const className = `ag-test-b64-in-page-${i}`;
            const elem = createElem(href);
            elem.classList.add(className);

            runScriptlet(name, [`a.${className}`, '[href]', 'base64decode']);

            assert.strictEqual(elem.getAttribute('href'), expectedHref, `${href}: href is correct`);
        });
    } finally {
        window.history.replaceState(null, '', originalUrl);
    }
});

test('visible text containing a URL followed by other words is not a URL', (assert) => {
    [
        'https://target.example/article Read more',
        'https://target.example/page - External link',
        'https://target.example/doc [PDF]',
        'https://target.example/page — Example',
        'https://target.example/x https://other.example/y',
        '/ag-test-page Read more',
    ].forEach((value, i) => {
        const href = `https://tracker.example/url-words-${i}`;
        const elem = createElem(href, value);

        const logs = getSyncLogs(() => runScriptlet(name, [`a[href="${href}"]`, 'text']));

        assert.strictEqual(elem.getAttribute('href'), href, `${value}: href is not changed`);
        assert.ok(logs.includes(`${name}: Invalid URL: ${value}`), `${value}: invalid URL is logged`);
    });
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
});

test('URL with parentheses or whitespaces in query is set', (assert) => {
    const resolve = (url) => new URL(url, document.baseURI).href;
    [
        {
            href: 'https://tracker.example/parens-attr',
            attributeValue: '/ag-test-files/Report (1).pdf',
            args: ['[data-href]'],
            expectedHref: resolve('/ag-test-files/Report (1).pdf'),
        },
        {
            href: `https://tracker.example/parens-param?url=${encodeURIComponent(
                'https://cdn.example/Report (1).pdf',
            )}`,
            args: ['?url'],
            expectedHref: 'https://cdn.example/Report%20(1).pdf',
        },
        {
            href: 'https://tracker.example/query-space-attr',
            attributeValue: 'https://target.example/search?q=hello world',
            args: ['[data-href]'],
            expectedHref: 'https://target.example/search?q=hello%20world',
        },
    ].forEach(({
        href,
        attributeValue,
        args,
        expectedHref,
    }) => {
        const elem = createElem(href, '', 'data-href', attributeValue);

        runScriptlet(name, [`a[href="${href}"]`, ...args]);

        assert.strictEqual(elem.getAttribute('href'), expectedHref, `${href}: href has been sanitized`);
    });
    assert.strictEqual(window.hit, 'FIRED', 'hit function has been called');
});

test('scheme-relative URL of nested redirect is followed', (assert) => {
    const innerValue = encodeURIComponent('//target.example/nested-scheme');
    const innerHref = `https://tracker.example/nested-scheme-inner?url=${innerValue}`;
    const elem = createElem(`https://tracker.example/nested-scheme?url=${encodeURIComponent(innerHref)}`);
    elem.classList.add('ag-test-nested-scheme');

    runScriptlet(name, ['a.ag-test-nested-scheme', '?url']);

    // resolved against the nested redirect, as the redirect does
    assert.strictEqual(elem.getAttribute('href'), 'https://target.example/nested-scheme', 'href has been sanitized');
    assert.strictEqual(window.hit, 'FIRED', 'hit function has been called');
});

test('link text of separate blocks is not joined into a URL', (assert) => {
    const href = 'https://tracker.example/text-blocks';
    const elem = createElem(href);
    // e.g. card with the URL and the title
    elem.innerHTML = '<div>https://target.example/news</div>\n<div>News</div>';

    const logs = getSyncLogs(() => runScriptlet(name, [`a[href="${href}"]`]));

    assert.strictEqual(elem.getAttribute('href'), href, 'href is not changed');
    assert.ok(logs.includes(`${name}: Invalid URL: ${elem.textContent}`), 'invalid URL is logged');
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
});

test('link text split after URL delimiter is joined', (assert) => {
    [
        { html: 'https://target.example/\ntext-slash', expectedHref: 'https://target.example/text-slash' },
        {
            html: 'https://target.example/text-query?a=1&\nb=2',
            expectedHref: 'https://target.example/text-query?a=1&b=2',
        },
        { html: 'https://target.example/text-\ndash', expectedHref: 'https://target.example/text-dash' },
        { html: 'https://target.example/text-before\n?a=1', expectedHref: 'https://target.example/text-before?a=1' },
    ].forEach(({ html, expectedHref }, i) => {
        const href = `https://tracker.example/text-delimiter-${i}`;
        const elem = createElem(href);
        elem.innerHTML = html;

        runScriptlet(name, [`a[href="${href}"]`]);

        assert.strictEqual(elem.getAttribute('href'), expectedHref, `${JSON.stringify(html)}: href has been sanitized`);
    });
    assert.strictEqual(window.hit, 'FIRED', 'hit function has been called');
});

test('base64 in hash of the target with query is not decoded as nested redirect', (assert) => {
    // target has its own base64 encoded URL in the hash, e.g. return URL
    const targetHref = `https://target.example/b64-target-hash?ref=1#${window.btoa('https://other.example/')}`;
    const elem = createElem(`https://tracker.example/b64-target-hash?${window.btoa(targetHref)}`);
    elem.classList.add('ag-test-b64-target-hash');

    runScriptlet(name, ['a.ag-test-b64-target-hash', '[href]', 'base64decode']);

    assert.strictEqual(elem.getAttribute('href'), targetHref, 'target is kept');
});

test('link reused by the page with the path of the sanitized URL is sanitized as a new link', async (assert) => {
    const innerHref = 'https://tracker.example/reuse-path-inner?url=ag-test-page.html';
    const elem = createElem(`https://tracker.example/reuse-path?url=${encodeURIComponent(innerHref)}`);
    elem.classList.add('ag-test-reuse-path');

    runScriptlet(name, ['a.ag-test-reuse-path', '?url']);
    // relative value of the nested redirect is not followed
    assert.strictEqual(elem.getAttribute('href'), innerHref, 'nested redirect is kept');

    // e.g. virtual list reuses the element for another link of the same redirect
    const reusedValue = encodeURIComponent('/ag-test-new-path');
    elem.setAttribute('href', `https://tracker.example/reuse-path-inner?url=${reusedValue}`);
    await makeUnrelatedDomChange();

    assert.strictEqual(
        elem.getAttribute('href'),
        new URL('/ag-test-new-path', document.baseURI).href,
        'reused link is sanitized',
    );
});

test('nested value which is not a URL is not logged', (assert) => {
    [
        // parameter of the target with the same name
        'https://shop.example/product?url=ag-test-sale',
        'https://tracker.example/nested-not-url-inner?url=Some%20Title',
    ].forEach((innerHref, i) => {
        const className = `ag-test-nested-not-url-${i}`;
        const elem = createElem(`https://tracker.example/nested-not-url?url=${encodeURIComponent(innerHref)}`);
        elem.classList.add(className);

        const logs = getSyncLogs(() => runScriptlet(name, [`a.${className}`, '?url']));

        assert.strictEqual(elem.getAttribute('href'), innerHref, `${innerHref}: href has been sanitized`);
        assert.deepEqual(
            logs.filter((log) => !log.startsWith(`${name}: Sanitized`)),
            [],
            `${innerHref}: only sanitizing is logged`,
        );
    });
});

test('rule and another rule which unwraps or decodes its URL settle', async (assert) => {
    const cases = [
        {
            className: 'ag-test-settle-unwrap',
            attributeValue: `https://tracker.example/settle-unwrap?url=${encodeURIComponent(
                'https://target.example/settle-unwrap',
            )}`,
            args: ['[data-href]'],
            otherArgs: ['?url'],
            expectedHref: 'https://target.example/settle-unwrap',
        },
        {
            className: 'ag-test-settle-decode',
            text: `https://tracker.example/settle-decode?${window.btoa('https://target.example/settle-decode')}`,
            args: ['text'],
            otherArgs: ['[href]', 'base64decode'],
            expectedHref: 'https://target.example/settle-decode',
        },
    ];
    const elems = cases.map(({
        className,
        text,
        attributeValue,
        args,
        otherArgs,
    }) => {
        const elem = createElem(`https://tracker.example/${className}`, text, 'data-href', attributeValue);
        elem.classList.add(className);
        runScriptlet(name, [`a.${className}`, ...args]);
        runScriptlet(name, [`a.${className}`, ...otherArgs]);
        return elem;
    });
    await makeUnrelatedDomChange();

    const counter = createAttrMutationCounter(elems, ['href']);
    await makeUnrelatedDomChange();
    await makeUnrelatedDomChange();
    const mutations = counter.count;
    counter.disconnect();

    cases.forEach(({ className, expectedHref }, i) => {
        assert.strictEqual(elems[i].getAttribute('href'), expectedHref, `${className}: href has been sanitized`);
    });
    assert.strictEqual(mutations, 0, 'href is not re-set');
});

test('more nested redirects than the limit are sanitized without DOM change', async (assert) => {
    const finalHref = 'https://target.example/deep-static-final';
    const wrap = (url) => `https://tracker.example/deep-static?ag-test-url=${encodeURIComponent(url)}`;
    let href = finalHref;
    for (let i = 0; i < 12; i += 1) {
        href = wrap(href);
    }
    const elem = createElem(href);
    elem.classList.add('ag-test-deep-static');

    runScriptlet(name, ['a.ag-test-deep-static', '?ag-test-url']);
    // 10 redirects are sanitized at once
    assert.strictEqual(elem.getAttribute('href'), wrap(wrap(finalHref)), 'limited number of redirects is sanitized');

    // e.g. static page without any DOM change
    await sleep(ATTR_SETTLE_DELAY_MS);
    assert.strictEqual(elem.getAttribute('href'), finalHref, 'remaining redirects are sanitized');
});

test('selector with :scope is not queried again for nested redirects', (assert) => {
    const finalHref = 'https://target.example/scope-no-requery';
    const wrap = (url) => `https://tracker.example/scope-no-requery?ag-test-url=${encodeURIComponent(url)}`;
    [
        ':scope a.ag-test-scope-no-requery',
        // ':scope' in the attribute value is not a pseudo-class
        ':scope a[data-ag-test-scope=":scope"]',
    ].forEach((selector) => {
        const elem = createElem(wrap(wrap(wrap(finalHref))), '', 'data-ag-test-scope', ':scope');
        elem.classList.add('ag-test-scope-no-requery');

        let queryCount = 0;
        const nativeQuerySelectorAll = document.querySelectorAll;
        document.querySelectorAll = function querySelectorAll(...args) {
            if (args[0] === selector) {
                queryCount += 1;
            }
            return nativeQuerySelectorAll.apply(this, args);
        };
        try {
            runScriptlet(name, [selector, '?ag-test-url']);
        } finally {
            // own property is removed, so that the method of the prototype is used again
            delete document.querySelectorAll;
        }

        assert.strictEqual(elem.getAttribute('href'), finalHref, `${selector}: all nested redirects are sanitized`);
        assert.strictEqual(queryCount, 1, `${selector}: selector is queried once`);
        elem.remove();
    });
});

test('raw base64 hrefs are decoded before resolving them as relative URLs', (assert) => {
    const target = 'https://target.example/raw-base64-regression';
    [window.btoa(target), window.btoa(JSON.stringify({ url: target })), window.btoa(window.btoa(target))]
        .forEach((href, i) => {
            const elem = createElem(href);
            const className = `ag-test-raw-base64-regression-${i}`;
            elem.classList.add(className);

            runScriptlet(name, [`a.${className}`, '[href]', 'base64decode']);

            assert.strictEqual(elem.getAttribute('href'), target, 'raw base64 destination is decoded');
        });
});

test('explicit URL sources use URL parsing without prose heuristics', (assert) => {
    const values = [
        'https://target.example/search?q=Report (1)',
        'https://target.example/search?q=see https://other.example/page',
        'https://target.example/Annual Report.pdf?q=hello world',
        'https://target.example/My Folder',
        'files/Annual Report.pdf',
    ];
    values.forEach((value, i) => {
        const cases = [
            { href: 'https://tracker.example/start', value, args: ['[data-href]'] },
            { href: `https://tracker.example/out?url=${encodeURIComponent(value)}`, args: ['?url'] },
        ];
        // Base64 decoding only accepts destinations which parse without a base URL.
        if (value.startsWith('https://')) {
            cases.push({
                href: 'https://tracker.example/start',
                value: window.btoa(value),
                args: ['[data-href]', 'base64decode'],
            });
        }
        cases.forEach((testCase, j) => {
            const elem = createElem(testCase.href, '', 'data-href', testCase.value);
            const className = `ag-test-explicit-url-regression-${i}-${j}`;
            elem.classList.add(className);

            runScriptlet(name, [`a.${className}`, ...testCase.args]);

            assert.strictEqual(elem.getAttribute('href'), new URL(value, document.baseURI).href, value);
        });
    });
});

test('reused anchor with the same skipped nested value is sanitized again', async (assert) => {
    const inner = 'https://tracker.example/old?url=%2Fag-test-reused-next';
    const elem = createElem(`https://tracker.example/out?url=${encodeURIComponent(inner)}`);
    elem.classList.add('ag-test-reused-same-value');

    runScriptlet(name, ['a.ag-test-reused-same-value', '?url']);
    assert.strictEqual(elem.getAttribute('href'), inner, 'nested relative value is not followed');

    elem.setAttribute('href', 'https://tracker.example/new?url=%2Fag-test-reused-next');
    await makeUnrelatedDomChange();

    assert.strictEqual(
        elem.getAttribute('href'),
        new URL('/ag-test-reused-next', document.baseURI).href,
        'same value is reconsidered for a new redirect',
    );
});

test('page edits are restored even if they resemble another rule output', async (assert) => {
    const cases = [
        {
            value: 'https://target.example/item?id=7',
            changedHref: 'https://target.example/item',
        },
        {
            value: 'https://target.example/login?return=https%3A%2F%2Ftarget.example%2Faccount',
            changedHref: 'https://target.example/account',
        },
    ];
    for (let i = 0; i < cases.length; i += 1) {
        const { value, changedHref } = cases[i];
        const elem = createElem('https://tracker.example/start', '', 'data-href', value);
        const className = `ag-test-page-edit-regression-${i}`;
        elem.classList.add(className);
        runScriptlet(name, [`a.${className}`, '[data-href]']);

        elem.setAttribute('href', changedHref);
        await makeUnrelatedDomChange();

        assert.strictEqual(elem.getAttribute('href'), value, 'page edit is corrected by the only rule');
    }
});

test('dependent rules with relative or plus destinations settle and handle later page edits', async (assert) => {
    const values = ['/ag-test-cooperate-relative', 'https://target.example/c++/cooperate'];
    for (let i = 0; i < values.length; i += 1) {
        const value = values[i];
        const redirect = `https://tracker.example/out?url=${value}`;
        const elem = createElem('https://tracker.example/start', '', 'data-href', redirect);
        const className = `ag-test-cooperate-regression-${i}`;
        elem.classList.add(className);
        runScriptlet(name, [`a.${className}`, '[data-href]']);
        runScriptlet(name, [`a.${className}`, '?url']);
        await makeUnrelatedDomChange();

        const counter = createAttrMutationCounter([elem], ['href']);
        await makeUnrelatedDomChange();
        assert.strictEqual(counter.count, 0, 'dependent rules settle');
        counter.disconnect();

        elem.setAttribute('href', 'https://target.example/unrelated-page-edit');
        await makeUnrelatedDomChange();
        assert.strictEqual(elem.getAttribute('href'), new URL(value, document.baseURI).href, 'page edit is corrected');

        const updatedValue = `${value}-updated`;
        elem.setAttribute('data-href', `https://tracker.example/out?url=${updatedValue}`);
        await makeUnrelatedDomChange();
        assert.strictEqual(
            elem.getAttribute('href'),
            new URL(updatedValue, document.baseURI).href,
            'changed external source starts a new redirect',
        );
    }
});

test('three cooperating rules preserve nested relative parameters and settle', async (assert) => {
    const target = 'https://shop.example/product?url=summer-sale';
    const redirect = `https://tracker.example/out?url=${encodeURIComponent(`${target}&utm_source=test`)}`;
    const elem = createElem('https://tracker.example/start', '', 'data-href', redirect);
    elem.classList.add('ag-test-three-cooperating-rules');
    const selector = 'a.ag-test-three-cooperating-rules';

    runScriptlet(name, [selector, '[data-href]']);
    runScriptlet(name, [selector, '?url']);
    runScriptlet(name, [selector, '[href]', 'removeParam:utm_source']);
    await makeUnrelatedDomChange();
    assert.strictEqual(elem.getAttribute('href'), target, 'nested relative parameter belongs to the target');

    const counter = createAttrMutationCounter([elem], ['href']);
    await makeUnrelatedDomChange();
    assert.strictEqual(counter.count, 0, 'all three rules settle');
    counter.disconnect();

    elem.setAttribute('href', 'https://target.example/page-edit');
    await makeUnrelatedDomChange();
    assert.strictEqual(elem.getAttribute('href'), target, 'all three rules reapply after a page edit');
});

test('reused link can start a new chain with an identical previously nested href', async (assert) => {
    const inner = 'https://tracker.example/out?url=%2Fag-test-new-chain';
    const elem = createElem(
        'https://tracker.example/start',
        '',
        'data-href',
        `https://tracker.example/out?url=${encodeURIComponent(inner)}`,
    );
    elem.classList.add('ag-test-identical-new-chain');
    const selector = 'a.ag-test-identical-new-chain';
    runScriptlet(name, [selector, '[data-href]']);
    runScriptlet(name, [selector, '?url']);
    await makeUnrelatedDomChange();
    assert.strictEqual(elem.getAttribute('href'), inner, 'relative nested value is initially skipped');

    elem.setAttribute('data-href', inner);
    elem.setAttribute('href', 'https://target.example/page-edit');
    await makeUnrelatedDomChange();
    assert.strictEqual(
        elem.getAttribute('href'),
        new URL('/ag-test-new-chain', document.baseURI).href,
        'the same href is now a new redirect, so its relative destination is followed',
    );
});

test('rules cooperate on HTML and SVG links without global state or metadata attributes', async (assert) => {
    const finalHref = 'https://target.example/element-state';
    const redirect = `https://tracker.example/out?url=${encodeURIComponent(finalHref)}`;
    const htmlLink = createElem('https://tracker.example/start');
    const svgLink = document.createElementNS('http://www.w3.org/2000/svg', 'a');
    svgLink.setAttribute('id', 'testHref');
    svgLink.setAttribute('href', 'https://tracker.example/start');
    document.body.appendChild(svgLink);
    const links = [htmlLink, svgLink];
    links.forEach((link) => {
        link.classList.add('ag-test-element-state');
        link.setAttribute('data-href', redirect);
    });
    const attributesBefore = links.map((link) => link.getAttributeNames());
    const keysBefore = links.map((link) => Object.keys(link));
    const mutations = [];
    const observer = new MutationObserver((records) => mutations.push(...records));
    links.forEach((link) => observer.observe(link, { attributes: true }));
    try {
        runScriptlet(name, ['a.ag-test-element-state', '[data-href]']);
        runScriptlet(name, ['a.ag-test-element-state', '?url']);
        await makeUnrelatedDomChange();

        links.forEach((link, i) => {
            assert.strictEqual(link.getAttribute('href'), finalHref, `${link.namespaceURI}: rules cooperate`);
            assert.deepEqual(link.getAttributeNames(), attributesBefore[i], 'no metadata attributes are added');
            assert.deepEqual(Object.keys(link), keysBefore[i], 'no enumerable string properties are added');
            assert.ok(
                Object.getOwnPropertySymbols(link).every(
                    (key) => !Object.getOwnPropertyDescriptor(link, key).enumerable,
                ),
                'symbol metadata is not enumerable',
            );
        });
        assert.ok(mutations.length > 0, 'href writes are observed');
        assert.ok(mutations.every((record) => record.attributeName === 'href'), 'only href mutations are produced');
        assert.notOk(
            Object.prototype.hasOwnProperty.call(window, Symbol.for('adguard.href-sanitizer.writes')),
            'no write registry is created on window',
        );

        mutations.length = 0;
        await makeUnrelatedDomChange();
        assert.strictEqual(mutations.length, 0, 'both links settle');
    } finally {
        observer.disconnect();
    }
});

test('page edit changed by another rule is corrected by the rule which has sanitized the link', async (assert) => {
    const target = 'https://target.example/masked-page-edit';
    const sources = [
        { text: target, args: [] },
        { attributeName: 'data-href', attributeValue: target, args: ['[data-href]'] },
    ];
    for (let i = 0; i < sources.length; i += 1) {
        const {
            text,
            attributeName,
            attributeValue,
            args,
        } = sources[i];
        const href = `https://tracker.example/masked-page-edit-${i}?u=1`;
        const elem = createElem(href, text, attributeName, attributeValue);
        const className = `ag-test-masked-page-edit-${i}`;
        elem.classList.add(className);
        // the rule which changes the page edit is run first, so its observer is called first
        runScriptlet(name, [`a.${className}[href*="utm_source"]`, '[href]', 'removeParam:utm_source']);
        runScriptlet(name, [`a.${className}[href^="https://tracker.example/"]`, ...args]);
        await makeUnrelatedDomChange();
        assert.strictEqual(elem.getAttribute('href'), target, `${args}: link is sanitized`);

        // page swaps href, e.g. on mousedown, and another rule removes its parameter
        elem.setAttribute('href', `https://tracker.example/masked-page-edit-${i}?u=2&utm_source=test`);
        await makeUnrelatedDomChange();
        assert.strictEqual(elem.getAttribute('href'), target, `${args}: page edit changed by another rule is fixed`);

        const counter = createAttrMutationCounter([elem], ['href']);
        await makeUnrelatedDomChange();
        assert.strictEqual(counter.count, 0, `${args}: rules settle`);
        counter.disconnect();
    }
});

test('error for one link does not stop sanitizing of other links and new ones', async (assert) => {
    const selector = 'a.ag-test-page-error';
    const target = 'https://target.example/page-error';
    const createLink = (i) => {
        const elem = createElem(`https://tracker.example/page-error-${i}`, '', 'data-href', target);
        elem.classList.add('ag-test-page-error');
        return elem;
    };
    const failing = createLink(1);
    const other = createLink(2);
    // e.g. the page defines a throwing getter for the property used by the rules
    Object.defineProperty(failing, Symbol.for('adguard.href-sanitizer.writes'), {
        get() {
            throw new Error('page error');
        },
        configurable: true,
    });

    let added;
    const logs = await getLogs(async () => {
        runScriptlet(name, [selector, '[data-href]']);
        await makeUnrelatedDomChange();
        added = createLink(3);
        await makeUnrelatedDomChange();
    });

    assert.strictEqual(other.getAttribute('href'), target, 'other link is sanitized');
    assert.strictEqual(added.getAttribute('href'), target, 'link added later is sanitized by the DOM observer');
    assert.strictEqual(failing.getAttribute('href'), 'https://tracker.example/page-error-1', 'failing link is kept');
    const errorLogs = logs.filter((log) => log === `${name}: Failed to sanitize ${failing}.`);
    assert.strictEqual(errorLogs.length, 1, 'error is logged only once');
});

test('URL parameter with leading question mark in its name is not taken as the parameter', (assert) => {
    // '??url=' is the parameter '?url', so the one with '+' is the second one, as `searchParams.get()` returns
    const href = 'https://tracker.example/double-question??url=https://evil.example/a+b&url=https://good.example/c+d';
    const elem = createElem(href);

    runScriptlet(name, [`a[href="${href}"]`, '?url']);

    assert.strictEqual(elem.getAttribute('href'), 'https://good.example/c+d', 'value of the parameter is set');
});

test('plus sign in the hash of encoded URL parameter is decoded as a whitespace', (assert) => {
    [
        {
            // hash router, whose query is in the hash
            path: 'plus-hash-query',
            target: 'https://target.example/#/search?q=red shoes',
            expectedHref: 'https://target.example/#/search?q=red%20shoes',
        },
        {
            path: 'plus-query-hash',
            target: 'https://target.example/?v=2#/search/red shoes',
            expectedHref: 'https://target.example/?v=2#/search/red%20shoes',
        },
        {
            // '+' in the query means a whitespace anyway, so it is kept, but not in the hash after the query
            path: 'plus-query-and-hash',
            target: 'https://target.example/s?q=red shoes#tag cloud',
            expectedHref: 'https://target.example/s?q=red+shoes#tag%20cloud',
        },
    ].forEach(({ path, target, expectedHref }) => {
        // form-encoded, e.g. by URLSearchParams or PHP urlencode(), so the whitespace is encoded as '+'
        const href = `https://tracker.example/${path}?${new URLSearchParams({ url: target })}`;
        const elem = createElem(href);

        runScriptlet(name, [`a[href="${href}"]`, '?url']);

        assert.strictEqual(elem.getAttribute('href'), expectedHref, `${href}: href has been sanitized`);
    });
});

test('"?" attribute uses the URL parameter with empty name', (assert) => {
    [
        {
            href: 'https://tracker.example/empty-name?=https://target.example/empty-name',
            expectedHref: 'https://target.example/empty-name',
        },
        {
            // empty pair before the parameter is not the parameter with empty name, as in `searchParams`
            href: 'https://tracker.example/empty-name-plus?&=https://target.example/c++/empty-name',
            expectedHref: 'https://target.example/c++/empty-name',
        },
    ].forEach(({ href, expectedHref }) => {
        const elem = createElem(href);

        const logs = getSyncLogs(() => runScriptlet(name, [`a[href="${href}"]`, '?']));

        assert.strictEqual(elem.getAttribute('href'), expectedHref, `${href}: href has been sanitized`);
        assert.notOk(logs.some((log) => log.includes('Invalid attribute option')), 'attribute is valid');
    });
    assert.strictEqual(window.hit, 'FIRED', 'hit function has been called');
});
