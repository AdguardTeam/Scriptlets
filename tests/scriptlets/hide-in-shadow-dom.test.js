/* eslint-disable no-underscore-dangle */
import {
    runScriptlet,
    clearGlobalProps,
    ATTR_SETTLE_DELAY_MS,
    createAttrMutationCounter,
    runRulesAndCountIdleChanges,
} from '../helpers';

const { test, module } = QUnit;
const name = 'hide-in-shadow-dom';

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

let uniqueClassCount = 0;

/**
 * Creates a shadow host with a target element which has a unique class name,
 * so rules from previous tests, whose observers are still active, do not match it.
 *
 * @param {boolean} [inLightDom=false] whether the target should be a light DOM child of the host
 * instead of being inside its shadow root
 * @returns {{target: HTMLElement, selector: string}} target element and selector which matches it
 */
const createUniqueTarget = (inLightDom = false) => {
    uniqueClassCount += 1;
    const className = `ag-test-hide-in-shadow-dom-${uniqueClassCount}`;
    const host = document.createElement('div');
    const shadowRoot = host.attachShadow({ mode: 'open' });
    const target = document.createElement('p');
    target.classList.add(className);
    (inLightDom ? host : shadowRoot).appendChild(target);
    document.body.appendChild(host);
    elemsToClean.push(host);
    return { target, selector: `.${className}` };
};

/**
 * Runs a rule for each target and checks that after they are applied the page stays idle,
 * i.e. targets are not re-hidden and hit is not called on unrelated DOM mutations.
 *
 * @param {object} assert QUnit assert
 * @param {Array<{target: HTMLElement, selector: string}>} targets targets, each one is hidden by its own rule
 * @param {boolean} [verbose=true] whether logging (hit) is enabled
 */
const checkRulesSettle = async (assert, targets, verbose = true) => {
    const { initialMutations, mutations, hits } = await runRulesAndCountIdleChanges(
        name,
        targets.map(({ target, selector }) => ({ elem: target, attr: 'style', args: [selector] })),
        verbose,
    );

    targets.forEach(({ target, selector }) => {
        assert.strictEqual(window.getComputedStyle(target).display, 'none', `Element ${selector} hidden`);
    });
    assert.ok(initialMutations > 0, 'initial hiding is counted');
    assert.strictEqual(mutations, 0, 'elements are not re-hidden while page is idle');
    if (verbose) {
        assert.strictEqual(hits, 0, 'hit is not called while page is idle');
    }
};

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
        runScriptlet(name, [SELECTOR]);

        const elemToCheck = testHost.shadowRoot.querySelector('p#test');
        const elemStyleDisplayProp = window.getComputedStyle(elemToCheck).display;
        assert.strictEqual(elemStyleDisplayProp, 'none', `Element ${SELECTOR} hidden`);
        assert.strictEqual(window.hit, 'FIRED', 'hit fired');
        // clean up test elements
        elemsToClean.push(testChild, testHost);
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
        runScriptlet(name, [SELECTOR]);

        const elemToCheck = testHost.shadowRoot.querySelector('div#testChild').shadowRoot.querySelector('p#inner');
        const elemStyleDisplayProp = window.getComputedStyle(elemToCheck).display;
        assert.strictEqual(elemStyleDisplayProp, 'none', `Element ${SELECTOR} hidden`);
        assert.strictEqual(window.hit, 'FIRED', 'hit fired');
        // clean up test elements
        elemsToClean.push(inner, testChild, testHost);
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
        runScriptlet(name, [SELECTOR]);

        const root = testHost.shadowRoot;

        const firstElemToCheck = root.querySelector('div#first').shadowRoot.querySelector('p#inner');
        const secondElemToCheck = root.querySelector('div#second').shadowRoot.querySelector('span#inner');
        const firstStyleDisplayProp = window.getComputedStyle(firstElemToCheck).display;
        const secondStyleDisplayProp = window.getComputedStyle(secondElemToCheck).display;
        assert.strictEqual(firstStyleDisplayProp, 'none', `Element ${SELECTOR} hidden in first inner shadow dom`);
        assert.strictEqual(secondStyleDisplayProp, 'none', `Element ${SELECTOR} hidden in second inner shadow dom`);
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
        runScriptlet(name, [SELECTOR]);

        const root = testHost.shadowRoot;

        const elemForFirstCheck = root.querySelector('div#shadowInner').shadowRoot.querySelector('p#inner');
        const elemForSecondCheck = testHost.querySelector('div#simpleChild').shadowRoot.querySelector('span#inner');
        const firstStyleDisplayProp = window.getComputedStyle(elemForFirstCheck).display;
        const secondStyleDisplayProp = window.getComputedStyle(elemForSecondCheck).display;
        assert.strictEqual(firstStyleDisplayProp, 'none', `Element ${SELECTOR} hidden in first inner shadow dom`);
        assert.strictEqual(secondStyleDisplayProp, 'none', `Element ${SELECTOR} hidden in second inner shadow dom`);
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
        runScriptlet(name, [SELECTOR]);

        const root = testHost.shadowRoot;

        const simpleElemCheck = root.querySelector('div#simpleChild').querySelector('p#inner');
        const shadowElemCheck = root.querySelector('div#shadowChild').shadowRoot.querySelector('span#inner');
        const simpleElemStyleDisplayProp = window.getComputedStyle(simpleElemCheck).display;
        const shadowElemStyleDisplayProp = window.getComputedStyle(shadowElemCheck).display;
        assert.strictEqual(simpleElemStyleDisplayProp, 'none', `Element ${SELECTOR} hidden in first inner shadow dom`);
        assert.strictEqual(shadowElemStyleDisplayProp, 'none', `Element ${SELECTOR} hidden in second inner shadow dom`);
        assert.strictEqual(window.hit, 'FIRED', 'hit fired');
        // clean up test elements
        elemsToClean.push(shadowInner, shadowChild, simpleInner, simpleChild, testHost);
    });

    test('single rule does not re-hide element on unrelated DOM mutation', async (assert) => {
        await checkRulesSettle(assert, [createUniqueTarget()]);
    });

    test('two rules, targets in shadow roots settle', async (assert) => {
        await checkRulesSettle(assert, [createUniqueTarget(), createUniqueTarget()]);
    });

    test('two rules, targets in light DOM of shadow hosts settle, logging enabled', async (assert) => {
        await checkRulesSettle(assert, [createUniqueTarget(true), createUniqueTarget(true)]);
    });

    test('two rules, targets in light DOM of shadow hosts settle, logging disabled', async (assert) => {
        await checkRulesSettle(assert, [createUniqueTarget(true), createUniqueTarget(true)], false);
    });

    test('already hidden element is not re-hidden and hit is not called', (assert) => {
        const { target, selector } = createUniqueTarget();
        target.style.setProperty('display', 'none', 'important');

        const counter = createAttrMutationCounter([target], ['style']);

        runScriptlet(name, [selector]);

        const done = assert.async();
        // mutation observer callbacks are async, so wait for them
        setTimeout(() => {
            const mutations = counter.count;
            counter.disconnect();
            assert.strictEqual(window.getComputedStyle(target).display, 'none', `Element ${selector} hidden`);
            assert.strictEqual(mutations, 0, 'style is not re-set for already hidden element');
            assert.strictEqual(window.hit, undefined, 'hit function has not been called');
            done();
        }, ATTR_SETTLE_DELAY_MS);
    });

    test('element is hidden again after page shows it', (assert) => {
        const { target, selector } = createUniqueTarget();

        runScriptlet(name, [selector]);
        assert.strictEqual(window.getComputedStyle(target).display, 'none', `Element ${selector} hidden`);

        const done = assert.async();
        setTimeout(() => {
            clearGlobalProps('hit');
            // page shows the element inside shadow root, which is not observed by the rule
            target.style.cssText = 'display: block;';
            // so an unrelated DOM mutation is needed to wake up the rule observer
            const unrelatedElem = document.createElement('div');
            document.body.appendChild(unrelatedElem);
            unrelatedElem.remove();

            setTimeout(() => {
                assert.strictEqual(
                    window.getComputedStyle(target).display,
                    'none',
                    `Element ${selector} hidden again`,
                );
                assert.strictEqual(window.hit, 'FIRED', 'hit function has been called again');
                done();
            }, ATTR_SETTLE_DELAY_MS);
        }, ATTR_SETTLE_DELAY_MS);
    });
}
