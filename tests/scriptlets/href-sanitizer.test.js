/* eslint-disable no-underscore-dangle, no-console */
import { runScriptlet, clearGlobalProps } from '../helpers';

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
    assert.strictEqual(window.hit, 'FIRED');
});

test('Sanitize href - no URL was found in base64 string in query parameter', (assert) => {
    const hrefWithBase64 = 'http://www.foo.com/out/?aGVsbG9fZGFya25lc3M=&aGVsbG9fZGFya25lc3M=';
    const elem = createElem(hrefWithBase64);
    const selector = 'a[href]';

    const scriptletArgs = [selector, '[href]', 'base64decode'];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(elem.getAttribute('href'), hrefWithBase64, 'href has not been changed');
    assert.strictEqual(window.hit, 'FIRED');
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
    assert.strictEqual(window.hit, 'FIRED');
});

test('Sanitize href - parameter, invalid URL', (assert) => {
    const expectedHref = 'https://?example.com/foo?redirect=https://example.org/';
    const elem = createElem(expectedHref);
    const selector = 'a[href*="?redirect="]';
    const attr = '?redirect';

    const scriptletArgs = [selector, attr];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href has not been changed');
    assert.strictEqual(window.hit, 'FIRED');
});

test('Sanitize href - not allowed protocol', (assert) => {
    const expectedHref = 'https://example.com/foo?redirect=javascript:alert(1)';
    const elem = createElem(expectedHref);
    const selector = 'a[href*="?redirect="]';
    const attr = '?redirect';

    const scriptletArgs = [selector, attr];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href has not been changed');
    assert.strictEqual(window.hit, 'FIRED');
});
