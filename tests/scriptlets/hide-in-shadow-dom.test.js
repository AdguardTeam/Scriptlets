/* eslint-disable no-eval, no-underscore-dangle */
import { clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'hide-in-shadow-dom';

const elemsToClean = [];
const cleanUp = () => {
    elemsToClean.forEach((el) => el.remove());
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
    cleanUp();
};

module(name, { afterEach });

const createHit = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const evalWrapper = eval;

// there should be 'Element.prototype.attachShadow' condition for each test
// because some browsers do not support ShadowRoot
// for example, Firefox 52 which is used for browserstack tests
// https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot

test('simple check', (assert) => {
    if (Element.prototype.attachShadow) {
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

        // <body>
        //   <div#shadowHost>
        //     #shadow-root (open)
        //       <p#test></p>
        //   </div>
        // </body>

        const resString = window.scriptlets.invoke(params);
        evalWrapper(resString);

        const elemToCheck = testHost.shadowRoot.querySelector('p#test');
        const elemStyleDisplayProp = window.getComputedStyle(elemToCheck).display;
        assert.strictEqual(elemStyleDisplayProp, 'none', `Element ${SELECTOR} hidden`);
        assert.strictEqual(window.hit, 'FIRED');
        // clean up test elements
        elemsToClean.push(testChild, testHost);
    } else {
        assert.strictEqual(true, true, 'fake test to avoid qunit error');
    }
});

test('few levels of shadow-doms', (assert) => {
    if (Element.prototype.attachShadow) {
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

        // <body>
        //   <div#shadowHost>
        //     #shadow-root (open)
        //       <div#testChild>
        //         #shadow-root (open)
        //           <p#inner></p>
        //       </div>
        //   </div>
        // </body>

        const resString = window.scriptlets.invoke(params);
        evalWrapper(resString);

        const elemToCheck = testHost.shadowRoot.querySelector('div#testChild').shadowRoot.querySelector('p#inner');
        const elemStyleDisplayProp = window.getComputedStyle(elemToCheck).display;
        assert.strictEqual(elemStyleDisplayProp, 'none', `Element ${SELECTOR} hidden`);
        assert.strictEqual(window.hit, 'FIRED');
        // clean up test elements
        elemsToClean.push(inner, testChild, testHost);
    } else {
        assert.strictEqual(true, true, 'fake test to avoid qunit error');
    }
});

test('multiple shadow-doms inside another shadow-dom', (assert) => {
    if (Element.prototype.attachShadow) {
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

        const resString = window.scriptlets.invoke(params);
        evalWrapper(resString);

        const firstElemToCheck = testHost.shadowRoot.querySelector('div#first').shadowRoot.querySelector('p#inner');
        const secondElemToCheck = testHost.shadowRoot.querySelector('div#second').shadowRoot.querySelector('span#inner');
        const firstStyleDisplayProp = window.getComputedStyle(firstElemToCheck).display;
        const secondStyleDisplayProp = window.getComputedStyle(secondElemToCheck).display;
        assert.strictEqual(firstStyleDisplayProp, 'none', `Element ${SELECTOR} hidden in first inner shadow dom`);
        assert.strictEqual(secondStyleDisplayProp, 'none', `Element ${SELECTOR} hidden in second inner shadow dom`);
        assert.strictEqual(window.hit, 'FIRED');
        // clean up test elements
        elemsToClean.push(innerOfSecond, secondChild, innerOfFirst, firstChild, testHost);
    } else {
        assert.strictEqual(true, true, 'fake test to avoid qunit error');
    }
});

test('shadow-dom host next to shadow-dom inside parental shadow-dom', (assert) => {
    if (Element.prototype.attachShadow) {
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

        const resString = window.scriptlets.invoke(params);
        evalWrapper(resString);

        const elemForFirstCheck = testHost.shadowRoot.querySelector('div#shadowInner').shadowRoot.querySelector('p#inner');
        const elemForSecondCheck = testHost.querySelector('div#simpleChild').shadowRoot.querySelector('span#inner');
        const firstStyleDisplayProp = window.getComputedStyle(elemForFirstCheck).display;
        const secondStyleDisplayProp = window.getComputedStyle(elemForSecondCheck).display;
        assert.strictEqual(firstStyleDisplayProp, 'none', `Element ${SELECTOR} hidden in first inner shadow dom`);
        assert.strictEqual(secondStyleDisplayProp, 'none', `Element ${SELECTOR} hidden in second inner shadow dom`);
        assert.strictEqual(window.hit, 'FIRED');
        innerOfSimple.remove();
        simpleChild.remove();
        innerOfFirst.remove();
        shadowInner.remove();
        testHost.remove();
        // clean up test elements
        elemsToClean.push(innerOfSimple, simpleChild, innerOfFirst, shadowInner, testHost);
    } else {
        assert.strictEqual(true, true, 'fake test to avoid qunit error');
    }
});

test('continue inner shadow-dom host searching after success with selector matching', (assert) => {
    if (Element.prototype.attachShadow) {
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

        const resString = window.scriptlets.invoke(params);
        evalWrapper(resString);

        const simpleElemCheck = testHost.shadowRoot.querySelector('div#simpleChild').querySelector('p#inner');
        const shadowElemCheck = testHost.shadowRoot.querySelector('div#shadowChild').shadowRoot.querySelector('span#inner');
        const simpleElemStyleDisplayProp = window.getComputedStyle(simpleElemCheck).display;
        const shadowElemStyleDisplayProp = window.getComputedStyle(shadowElemCheck).display;
        assert.strictEqual(simpleElemStyleDisplayProp, 'none', `Element ${SELECTOR} hidden in first inner shadow dom`);
        assert.strictEqual(shadowElemStyleDisplayProp, 'none', `Element ${SELECTOR} hidden in second inner shadow dom`);
        assert.strictEqual(window.hit, 'FIRED');
        // clean up test elements
        elemsToClean.push(shadowInner, shadowChild, simpleInner, simpleChild, testHost);
    } else {
        assert.strictEqual(true, true, 'fake test to avoid qunit error');
    }
});
