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
    // const done = assert.async();

    // setTimeout(() => {
    //     assert.strictEqual(elemStyleDisplayProp, 'none', `Element ${SELECTOR} hidden`);
    //     assert.strictEqual(window.hit, 'FIRED');
    //     done();
    // }, 50);
    assert.strictEqual(elemStyleDisplayProp, 'none', `Element ${SELECTOR} hidden`);
    assert.strictEqual(window.hit, 'FIRED');
});

test('works fine -- few levels of shadow-doms', (assert) => {
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
    // const done = assert.async();

    // setTimeout(() => {
    //     assert.strictEqual(elemStyleDisplayProp, 'none', `Element ${SELECTOR} hidden`);
    //     assert.strictEqual(window.hit, 'FIRED');
    //     done();
    // }, 50);
    assert.strictEqual(elemStyleDisplayProp, 'none', `Element ${SELECTOR} hidden`);
    assert.strictEqual(window.hit, 'FIRED');
});
