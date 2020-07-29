/* eslint-disable no-eval, no-underscore-dangle */
import { clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'hide-in-shadow-dom';

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
};

module(name, { afterEach });

const createHit = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const evalWrapper = eval;

test('works fine', (assert) => {
    createHit();
    const SELECTOR = '#test';
    const params = {
        name,
        args: [SELECTOR],
        verbose: true,
    };

    const testHost = document.createElement('div');
    testHost.id = 'shadowHost';
    document.body.appendChild(testHost);
    const testChild = document.createElement('p');
    testChild.id = 'test';
    const shadowRoot = testHost.attachShadow({ mode: 'open' });
    shadowRoot.appendChild(testChild);

    const resString = window.scriptlets.invoke(params);
    evalWrapper(resString);

    const elemToCheck = testHost.shadowRoot.querySelector('p#test');
    const elemStyleDisplayProp = window.getComputedStyle(elemToCheck).display;
    assert.strictEqual(elemStyleDisplayProp, 'none', `Element ${SELECTOR} hidden`);
    assert.strictEqual(window.hit, 'FIRED');
    testChild.remove();
    testHost.remove();
});

test('works fine -- few levels of shadow-doms', (assert) => {
    createHit();
    const SELECTOR = '#inner';
    const params = {
        name,
        args: [SELECTOR],
        verbose: true,
    };

    const testHost = document.createElement('div');
    testHost.id = 'shadowHost';
    document.body.appendChild(testHost);
    const testChild = document.createElement('div');
    testChild.id = 'testChild';
    const shadowRoot = testHost.attachShadow({ mode: 'open' });
    shadowRoot.appendChild(testChild);

    const inner = document.createElement('p');
    inner.id = 'inner';
    const childShadowRoot = testChild.attachShadow({ mode: 'open' });
    childShadowRoot.appendChild(inner);

    const resString = window.scriptlets.invoke(params);
    evalWrapper(resString);

    const elemToCheck = testHost.shadowRoot.querySelector('div#testChild').shadowRoot.querySelector('p#inner');
    const elemStyleDisplayProp = window.getComputedStyle(elemToCheck).display;
    assert.strictEqual(elemStyleDisplayProp, 'none', `Element ${SELECTOR} hidden`);
    assert.strictEqual(window.hit, 'FIRED');
});
