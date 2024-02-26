/* eslint-disable no-underscore-dangle, no-console */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'href-sanitizer';

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
    const elem = document.getElementById('testHref');
    if (elem) {
        elem.remove();
    }
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

test('Santize href - text content', (assert) => {
    const expectedHref = 'https://example.org/';
    const elem = createElem('https://example.com/foo?redirect=https%3A%2F%2Fexample.org%2F', expectedHref);
    const selector = 'a[href*="?redirect="]';

    const scriptletArgs = [selector];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href has been sanitized');
    assert.strictEqual(window.hit, 'FIRED');
});

test('Santize href - text content, create element after running scriptlet', (assert) => {
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

test('Santize href - text content special characters', (assert) => {
    const expectedHref = 'https://example.com/search?q=łódź';
    const elem = createElem('https://example.org/foo', expectedHref);
    const selector = 'a[href*="//example.org"]';

    const scriptletArgs = [selector];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(decodeURIComponent(elem.getAttribute('href')), expectedHref, 'href has been sanitized');
    assert.strictEqual(window.hit, 'FIRED');
});

test('Santize href - text content, Twitter like case', (assert) => {
    const elem = createElem('https://example.com/foo', 'https://agrd.io/promo_turk_83off…'); // Link from Twitter/X
    const expectedHref = 'https://agrd.io/promo_turk_83off';
    const selector = 'a[href*="//example.com"]';

    const scriptletArgs = [selector];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href has been sanitized');
    assert.strictEqual(window.hit, 'FIRED');
});

test('Santize href - query parameter 1', (assert) => {
    const elem = createElem('https://example.com/foo?redirect=https://example.org/');
    const expectedHref = 'https://example.org/';
    const selector = 'a[href*="?redirect="]';
    const attr = '?redirect';

    const scriptletArgs = [selector, attr];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href has been sanitized');
    assert.strictEqual(window.hit, 'FIRED');
});

test('Santize href - query parameter 2', (assert) => {
    const elem = createElem('https://greenmangaming.sjv.io/c/3659980/1281797/15105?u=https://www.greenmangaming.com/games/grand-theft-auto-v-premium-edition-pc');
    const expectedHref = 'https://www.greenmangaming.com/games/grand-theft-auto-v-premium-edition-pc';
    const selector = 'a[href^="https://greenmangaming.sjv.io/c/"][href*="?u="]';
    const attr = '?u';

    const scriptletArgs = [selector, attr];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href has been sanitized');
    assert.strictEqual(window.hit, 'FIRED');
});

test('Santize href - get href from attribute', (assert) => {
    const expectedHref = 'https://example.org/';
    const elem = createElem('https://foo.com/bar', '', 'data-href', expectedHref);
    const selector = 'a[href="https://foo.com/bar"]';
    const attr = '[data-href]';

    const scriptletArgs = [selector, attr];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href has been sanitized');
    assert.strictEqual(window.hit, 'FIRED');
});

test('Santize href - invalid URL', (assert) => {
    const expectedHref = 'https://foo.com/bar';
    const elem = createElem(expectedHref, 'https://?');
    const selector = 'a[href="https://foo.com/bar"]';

    const scriptletArgs = [selector];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href has not been changed');
    assert.strictEqual(window.hit, 'FIRED');
});

test('Santize href - parameter, invalid URL', (assert) => {
    const expectedHref = 'https://?example.com/foo?redirect=https://example.org/';
    const elem = createElem(expectedHref);
    const selector = 'a[href*="?redirect="]';
    const attr = '?redirect';

    const scriptletArgs = [selector, attr];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href has not been changed');
    assert.strictEqual(window.hit, 'FIRED');
});

test('Santize href - not allowed protocol', (assert) => {
    const expectedHref = 'https://example.com/foo?redirect=javascript:alert(1)';
    const elem = createElem(expectedHref);
    const selector = 'a[href*="?redirect="]';
    const attr = '?redirect';

    const scriptletArgs = [selector, attr];
    runScriptlet(name, scriptletArgs);

    assert.strictEqual(elem.getAttribute('href'), expectedHref, 'href has not been changed');
    assert.strictEqual(window.hit, 'FIRED');
});
