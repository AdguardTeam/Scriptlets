/* eslint-disable no-underscore-dangle */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'remove-in-shadow-dom';

const elemsToClean = [];
const cleanUp = () => {
    elemsToClean.forEach((el) => el.remove());
};

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
    cleanUp();
};

module(name, { beforeEach, afterEach });

// some browsers do not support ShadowRoot
// for example, Firefox 52 which is used for browserstack tests
// https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot
const isSupported = typeof Element.prototype.attachShadow !== 'undefined';

if (!isSupported) {
    test('unsupported', (assert) => {
        assert.ok(true, 'Browser does not support it');
    });
} else {
    test('simple check', (assert) => {
        const testHost = document.createElement('div');
        testHost.id = 'shadowHost';
        document.body.appendChild(testHost);
        const testChild = document.createElement('p');
        testChild.id = 'test';
        const shadowRoot = testHost.attachShadow({ mode: 'open' });
        shadowRoot.appendChild(testChild);

        // <body>
        //   <div#shadowHost>
        //     #shadow-root (open)
        //       <p#test></p>
        //   </div>
        // </body>

        const SELECTOR = '#test';

        // checking before
        const elemToCheckBefore = testHost.shadowRoot.querySelector('p#test');
        assert.strictEqual(elemToCheckBefore.tagName, 'P');
        assert.strictEqual(elemToCheckBefore.id, 'test', `Element ${SELECTOR} is present`);

        runScriptlet(name, [SELECTOR]);

        // checking after
        const elemToCheckAfter = testHost.shadowRoot.querySelector('p#test');
        assert.strictEqual(elemToCheckAfter, null, `Element ${SELECTOR} is removed`);
        assert.strictEqual(window.hit, 'FIRED', 'hit fired');
        // clean up test elements
        elemsToClean.push(testHost);
    });

    test('few levels of shadow-doms', (assert) => {
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

        // <body>
        //   <div#shadowHost>
        //     #shadow-root (open)
        //       <div#testChild>
        //         #shadow-root (open)
        //           <p#inner></p>
        //       </div>
        //   </div>
        // </body>

        const SELECTOR = '#inner';

        // checking before
        const elemToCheckBefore = testHost.shadowRoot
            .querySelector('div#testChild').shadowRoot
            .querySelector('p#inner');
        assert.strictEqual(elemToCheckBefore.tagName, 'P');
        assert.strictEqual(elemToCheckBefore.id, 'inner', `Element ${SELECTOR} is present`);

        runScriptlet(name, [SELECTOR]);

        // checking after
        const elemToCheckAfter = testHost.shadowRoot.querySelector('div#testChild').shadowRoot.querySelector('p#inner');
        assert.strictEqual(elemToCheckAfter, null, `Element ${SELECTOR} is removed`);
        assert.strictEqual(window.hit, 'FIRED', 'hit fired');
        // clean up test elements
        elemsToClean.push(testChild, testHost);
    });

    test('multiple shadow-doms inside another shadow-dom', (assert) => {
        const testHost = document.createElement('div');
        testHost.id = 'shadowHost';
        document.body.appendChild(testHost);
        const shadowRoot = testHost.attachShadow({ mode: 'open' });

        const firstChild = document.createElement('div');
        firstChild.id = 'first';
        shadowRoot.appendChild(firstChild);
        const innerOfFirst = document.createElement('p');
        innerOfFirst.id = 'inner';
        const firstChildShadowRoot = firstChild.attachShadow({ mode: 'open' });
        firstChildShadowRoot.appendChild(innerOfFirst);

        const secondChild = document.createElement('div');
        secondChild.id = 'second';
        shadowRoot.appendChild(secondChild);
        const innerOfSecond = document.createElement('span');
        innerOfSecond.id = 'inner';
        const secondChildShadowRoot = secondChild.attachShadow({ mode: 'open' });
        secondChildShadowRoot.appendChild(innerOfSecond);

        // <body>
        //   <div#shadowHost>
        //   |  #shadow-root (open)
        //   |  |  <div#first>
        //   |  |  |  #shadow-root (open)
        //   |  |  |    <p#inner></p>
        //   |  |  </div>
        //   |  |  <div#second>
        //   |  |  |  #shadow-root (open)
        //   |  |  |    <span#inner></span>
        //   |  |  </div>
        //   </div>
        // </body>

        const SELECTOR = '#inner';

        // checking before
        const firstElemBefore = testHost.shadowRoot.querySelector('div#first').shadowRoot.querySelector('p#inner');
        const secondElemBefore = testHost.shadowRoot.querySelector('div#second').shadowRoot.querySelector('span#inner');
        assert.strictEqual(firstElemBefore.tagName, 'P');
        assert.strictEqual(firstElemBefore.id, 'inner', `Element ${SELECTOR} is present`);
        assert.strictEqual(secondElemBefore.tagName, 'SPAN');
        assert.strictEqual(secondElemBefore.id, 'inner', `Element ${SELECTOR} is present`);

        runScriptlet(name, [SELECTOR]);

        // checking after
        const firstElemAfter = testHost.shadowRoot.querySelector('div#first').shadowRoot.querySelector('p#inner');
        const secondElemAfter = testHost.shadowRoot.querySelector('div#second').shadowRoot.querySelector('span#inner');
        assert.strictEqual(firstElemAfter, null, `Element ${SELECTOR} is removed`);
        assert.strictEqual(secondElemAfter, null, `Element ${SELECTOR} is removed`);
        assert.strictEqual(window.hit, 'FIRED', 'hit fired');
        // clean up test elements
        elemsToClean.push(innerOfSecond, secondChild, innerOfFirst, firstChild, testHost);
    });

    test('shadow-dom host next to shadow-dom inside parental shadow-dom', (assert) => {
        const testHost = document.createElement('div');
        testHost.id = 'shadowHost';
        document.body.appendChild(testHost);
        const shadowRoot = testHost.attachShadow({ mode: 'open' });

        const shadowInner = document.createElement('div');
        shadowInner.id = 'shadowInner';
        shadowRoot.appendChild(shadowInner);
        const innerOfFirst = document.createElement('p');
        innerOfFirst.id = 'inner';
        const firstChildShadowRoot = shadowInner.attachShadow({ mode: 'open' });
        firstChildShadowRoot.appendChild(innerOfFirst);

        const simpleChild = document.createElement('div');
        simpleChild.id = 'simpleChild';
        testHost.appendChild(simpleChild);
        const innerOfSimple = document.createElement('span');
        innerOfSimple.id = 'inner';
        const simpleChildShadowRoot = simpleChild.attachShadow({ mode: 'open' });
        simpleChildShadowRoot.appendChild(innerOfSimple);

        // <body>
        //   <div#shadowHost>
        //   |  #shadow-root (open)
        //   |  |  <div#shadowInner>
        //   |  |  |  #shadow-root (open)
        //   |  |  |  |  <p#inner></p>
        //   |  |  </div>
        //   |  <div#simpleChild>
        //   |  |  #shadow-root (open)
        //   |  |    <span#inner></span>
        //   |  </div>
        //   </div>
        // </body>

        const SELECTOR = '#inner';

        // checking before
        const firstElemBefore = testHost.shadowRoot
            .querySelector('div#shadowInner').shadowRoot
            .querySelector('p#inner');
        const secondElemBefore = testHost.querySelector('div#simpleChild').shadowRoot.querySelector('span#inner');
        assert.strictEqual(firstElemBefore.tagName, 'P');
        assert.strictEqual(firstElemBefore.id, 'inner', `Element ${SELECTOR} is present`);
        assert.strictEqual(secondElemBefore.tagName, 'SPAN');
        assert.strictEqual(secondElemBefore.id, 'inner', `Element ${SELECTOR} is present`);

        runScriptlet(name, [SELECTOR]);

        // checking after
        const firstElemAfter = testHost.shadowRoot.querySelector('div#shadowInner').shadowRoot.querySelector('p#inner');
        const secondElemAfter = testHost.querySelector('div#simpleChild').shadowRoot.querySelector('span#inner');
        assert.strictEqual(firstElemAfter, null, `Element ${SELECTOR} is removed`);
        assert.strictEqual(secondElemAfter, null, `Element ${SELECTOR} is removed`);
        assert.strictEqual(window.hit, 'FIRED', 'hit fired');
        innerOfSimple.remove();
        simpleChild.remove();
        innerOfFirst.remove();
        shadowInner.remove();
        testHost.remove();
        // clean up test elements
        elemsToClean.push(innerOfSimple, simpleChild, innerOfFirst, shadowInner, testHost);
    });

    test('continue inner shadow-dom host searching after success with selector matching', (assert) => {
        const testHost = document.createElement('div');
        testHost.id = 'shadowHost';
        document.body.appendChild(testHost);
        const shadowRoot = testHost.attachShadow({ mode: 'open' });

        const simpleChild = document.createElement('div');
        simpleChild.id = 'simpleChild';
        shadowRoot.appendChild(simpleChild);
        const simpleInner = document.createElement('p');
        simpleInner.id = 'inner';
        simpleChild.appendChild(simpleInner);

        const shadowChild = document.createElement('div');
        shadowChild.id = 'shadowChild';
        shadowRoot.appendChild(shadowChild);
        const shadowRootForChildren = shadowChild.attachShadow({ mode: 'open' });
        const shadowInner = document.createElement('span');
        shadowInner.id = 'inner';
        shadowRootForChildren.appendChild(shadowInner);

        // <body>
        //   <div#shadowHost>
        //   |  #shadow-root (open)
        //   |  |  <div#simpleChild>
        //   |  |  |  <p#inner></p>     // do not stop searching after reaching this target
        //   |  |  </div>
        //   |  |  <div#shadowChild>
        //   |  |  |  #shadow-root (open)
        //   |  |  |  |  <span#inner></span>
        //   |  |  </div>
        //   </div>
        // </body>

        const SELECTOR = '#inner';

        // checking before
        const simpleElemBefore = testHost.shadowRoot.querySelector('div#simpleChild').querySelector('p#inner');
        const shadowElemBefore = testHost.shadowRoot
            .querySelector('div#shadowChild').shadowRoot
            .querySelector('span#inner');
        assert.strictEqual(simpleElemBefore.tagName, 'P');
        assert.strictEqual(simpleElemBefore.id, 'inner', `Element ${SELECTOR} is present`);
        assert.strictEqual(shadowElemBefore.tagName, 'SPAN');
        assert.strictEqual(shadowElemBefore.id, 'inner', `Element ${SELECTOR} is present`);

        runScriptlet(name, [SELECTOR]);

        // checking after
        const simpleElemAfter = testHost.shadowRoot.querySelector('div#simpleChild').querySelector('p#inner');
        const shadowElemAfter = testHost.shadowRoot
            .querySelector('div#shadowChild').shadowRoot
            .querySelector('span#inner');
        assert.strictEqual(simpleElemAfter, null, `Element ${SELECTOR} is removed`);
        assert.strictEqual(shadowElemAfter, null, `Element ${SELECTOR} is removed`);
        assert.strictEqual(window.hit, 'FIRED', 'hit fired');
        // clean up test elements
        elemsToClean.push(shadowChild, simpleChild, testHost);
    });
}
