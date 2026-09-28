/* eslint-disable no-underscore-dangle */
import { runScriptlet, clearGlobalProps, countLogsAfterDomChange } from '../helpers';

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
// for example, Firefox 52
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

    test('baseSelector matches container of shadow hosts', (assert) => {
        const container = document.createElement('div');
        container.id = 'ag-test-hosts-container';
        const testHost = document.createElement('div');
        container.appendChild(testHost);
        const testChild = document.createElement('p');
        // unique class, so rules from previous tests, whose observers are still active, do not match it
        testChild.classList.add('ag-test-remove-in-container');
        testHost.attachShadow({ mode: 'open' }).appendChild(testChild);
        const lightElem = document.createElement('p');
        lightElem.classList.add('ag-test-remove-in-container');
        container.appendChild(lightElem);
        document.body.appendChild(container);

        // <body>
        //   <div#ag-test-hosts-container>
        //     <div>
        //       #shadow-root (open)
        //         <p.ag-test-remove-in-container></p>
        //     </div>
        //     <p.ag-test-remove-in-container></p>   // not inside any shadow host, so it is not removed
        //   </div>
        // </body>

        const SELECTOR = '.ag-test-remove-in-container';
        runScriptlet(name, [SELECTOR, `#${container.id}`]);

        assert.strictEqual(testHost.shadowRoot.querySelector(SELECTOR), null, `Element ${SELECTOR} is removed`);
        assert.ok(lightElem.isConnected, 'element outside shadow hosts is not removed');
        assert.strictEqual(window.hit, 'FIRED', 'hit fired');
        // clean up test elements
        elemsToClean.push(container);
    });

    test('invalid selectors are logged', async (assert) => {
        // shadow host is present, so the selectors are used on the first run and on the DOM change
        const testHost = document.createElement('div');
        const testChild = document.createElement('p');
        testChild.classList.add('ag-test-remove-invalid');
        testHost.attachShadow({ mode: 'open' }).appendChild(testChild);
        document.body.appendChild(testHost);
        elemsToClean.push(testHost);

        const invalidSelector = '..ag-test-invalid-selector';
        const cases = [
            {
                args: [invalidSelector],
                message: `${name}: Invalid selector arg: '${invalidSelector}'`,
            },
            {
                args: ['.ag-test-remove-invalid', invalidSelector],
                message: `${name}: Invalid baseSelector arg: '${invalidSelector}'`,
            },
        ];

        for (let i = 0; i < cases.length; i += 1) {
            const { args, message } = cases[i];
            const count = await countLogsAfterDomChange(name, args, message);
            assert.strictEqual(count, 1, `${message} is logged once`);
        }

        assert.ok(testChild.isConnected, 'element is not removed');
        assert.strictEqual(window.hit, undefined, 'hit function has not been called');
    });
}
