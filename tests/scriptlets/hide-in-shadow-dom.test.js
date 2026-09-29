/* eslint-disable no-underscore-dangle */
import {
    runScriptlet,
    clearGlobalProps,
    ATTR_SETTLE_DELAY_MS,
    createAttrMutationCounter,
    checkRulesSettle,
    sleep,
    makeUnrelatedDomChange,
    countLogsAfterDomChange,
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
    if (inLightDom) {
        // light DOM child of a shadow host is rendered only if it is assigned to a slot,
        // otherwise its computed style is empty in newer browsers, e.g. Chrome 154,
        // so the check of computed display would fail even if the element is hidden
        shadowRoot.appendChild(document.createElement('slot'));
    }
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
 * @param {object} [options] options
 * @param {boolean} [options.verbose=true] whether logging (hit) is enabled
 * @param {string} [options.expectedDisplay='none'] expected computed display of targets after rules are applied
 * @returns {Promise<void>}
 */
const checkTargetsSettle = (assert, targets, { verbose = true, expectedDisplay = 'none' } = {}) => checkRulesSettle(
    assert,
    name,
    targets.map(({ target, selector }) => ({ elem: target, attr: 'style', args: [selector] })),
    () => {
        targets.forEach(({ target, selector }) => {
            assert.strictEqual(
                window.getComputedStyle(target).display,
                expectedDisplay,
                `Element ${selector} has display: ${expectedDisplay}`,
            );
        });
    },
    verbose,
);

/**
 * Runs a rule which hides the target, lets the page show the target
 * and checks that the rule hides it again on the next DOM change.
 *
 * @param {object} assert QUnit assert
 * @param {Function} showElement function which shows the target element passed to it
 */
const checkHiddenAgainAfterPageShows = async (assert, showElement) => {
    const { target, selector } = createUniqueTarget();

    runScriptlet(name, [selector]);
    assert.strictEqual(window.getComputedStyle(target).display, 'none', `Element ${selector} hidden`);
    await sleep(ATTR_SETTLE_DELAY_MS);

    // hits are counted only for this rule, since observers of rules from previous tests are still active
    let ruleHits = 0;
    window.__debug = (source) => {
        if (source.args[0] === selector) {
            ruleHits += 1;
        }
    };

    // page shows the element inside shadow root, which is not observed by the rule
    showElement(target);
    assert.notStrictEqual(window.getComputedStyle(target).display, 'none', `Element ${selector} shown by page`);
    // so an unrelated DOM mutation is needed to wake up the rule observer
    await makeUnrelatedDomChange();

    assert.strictEqual(window.getComputedStyle(target).display, 'none', `Element ${selector} hidden again`);
    assert.strictEqual(ruleHits, 1, 'hit function has been called again for the rule');
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

        // light DOM child of a shadow host is rendered only if it is assigned to a slot,
        // otherwise computed style of elements inside it is empty in newer browsers, e.g. Chrome 154,
        // so the check of computed display would fail even if the element is hidden
        shadowRoot.appendChild(document.createElement('slot'));
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
        //   |  |  <slot></slot>      // renders div#simpleChild
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
        await checkTargetsSettle(assert, [createUniqueTarget()]);
    });

    test('two rules, targets in shadow roots settle', async (assert) => {
        await checkTargetsSettle(assert, [createUniqueTarget(), createUniqueTarget()]);
    });

    test('two rules, targets in light DOM of shadow hosts settle, logging enabled', async (assert) => {
        await checkTargetsSettle(assert, [createUniqueTarget(true), createUniqueTarget(true)]);
    });

    test('two rules, targets in light DOM of shadow hosts settle, logging disabled', async (assert) => {
        await checkTargetsSettle(assert, [createUniqueTarget(true), createUniqueTarget(true)], { verbose: false });
    });

    test('two rules settle if page style of higher priority keeps targets visible', async (assert) => {
        const targets = [createUniqueTarget(true), createUniqueTarget(true)];
        targets.forEach(({ target }) => {
            // important style of shadow tree overrides important inline style of light DOM children
            target.parentElement.shadowRoot.innerHTML = '<style>::slotted(*) { display: block !important; }</style>'
                + '<slot></slot>';
        });

        // targets cannot be hidden, but they should not be re-hidden on each DOM change
        await checkTargetsSettle(assert, targets, { expectedDisplay: 'block' });
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

    test('element is hidden again after page shows it', async (assert) => {
        await checkHiddenAgainAfterPageShows(assert, (target) => {
            target.style.cssText = 'display: block;';
        });
    });

    test('element is hidden again after page overrides inline display by "all" property', async (assert) => {
        await checkHiddenAgainAfterPageShows(assert, (target) => {
            // inline style still reports 'display: none !important', but it is overridden by 'all'
            target.style.setProperty('all', 'initial', 'important');
        });
    });

    test('hidden element is not re-hidden after page adds other inline style', async (assert) => {
        const { target, selector } = createUniqueTarget();
        runScriptlet(name, [selector]);
        await sleep(ATTR_SETTLE_DELAY_MS);

        // hits are counted only for this rule, since observers of rules from previous tests are still active
        let ruleHits = 0;
        window.__debug = (source) => {
            if (source.args[0] === selector) {
                ruleHits += 1;
            }
        };
        // page adds inline style which does not override hiding
        target.style.setProperty('transform', 'scale(2)');
        const counter = createAttrMutationCounter([target], ['style']);

        await makeUnrelatedDomChange();
        const mutations = counter.count;
        counter.disconnect();

        assert.strictEqual(window.getComputedStyle(target).display, 'none', `Element ${selector} hidden`);
        assert.strictEqual(target.style.getPropertyValue('transform'), 'scale(2)', 'page inline style is kept');
        assert.strictEqual(mutations, 0, 'style is not re-set');
        assert.strictEqual(ruleHits, 0, 'hit is not called');
    });

    test('baseSelector matches container of shadow hosts', async (assert) => {
        const className = 'ag-test-hide-in-container';
        const container = document.createElement('div');
        container.id = 'ag-test-hosts-container';
        document.body.appendChild(container);
        elemsToClean.push(container);

        const createHostWithTarget = () => {
            const host = document.createElement('div');
            const target = document.createElement('p');
            target.classList.add(className);
            host.attachShadow({ mode: 'open' }).appendChild(target);
            // host is not a direct child of the container, so hosts should be searched in the whole container
            const wrapper = document.createElement('div');
            wrapper.appendChild(host);
            container.appendChild(wrapper);
            return target;
        };

        // <body>
        //   <div#ag-test-hosts-container>
        //     <div>
        //       <div>
        //         #shadow-root (open)
        //           <p.ag-test-hide-in-container></p>
        //       </div>
        //     </div>
        //     <p.ag-test-hide-in-container></p>   // not inside any shadow host, so it is not hidden
        //   </div>
        // </body>

        const firstTarget = createHostWithTarget();
        const lightElem = document.createElement('p');
        lightElem.classList.add(className);
        container.appendChild(lightElem);

        runScriptlet(name, [`.${className}`, `#${container.id}`]);

        assert.strictEqual(window.getComputedStyle(firstTarget).display, 'none', 'target inside container hidden');
        assert.strictEqual(window.getComputedStyle(lightElem).display, 'block', 'element outside hosts not hidden');
        assert.strictEqual(window.hit, 'FIRED', 'hit fired');

        // observer keeps working, so a target in a host added later is hidden as well
        const secondTarget = createHostWithTarget();
        await sleep(ATTR_SETTLE_DELAY_MS);

        assert.strictEqual(window.getComputedStyle(secondTarget).display, 'none', 'target added later hidden');
    });

    test('invalid selectors are logged', async (assert) => {
        // shadow host is present, so the selectors are used on the first run and on the DOM change
        const { target, selector } = createUniqueTarget();
        const invalidSelector = '..ag-test-invalid-selector';
        const cases = [
            {
                args: [invalidSelector],
                message: `${name}: Invalid selector arg: '${invalidSelector}'`,
            },
            {
                args: [selector, invalidSelector],
                message: `${name}: Invalid baseSelector arg: '${invalidSelector}'`,
            },
        ];

        for (let i = 0; i < cases.length; i += 1) {
            const { args, message } = cases[i];
            const count = await countLogsAfterDomChange(name, args, message);
            assert.strictEqual(count, 1, `${message} is logged once`);
        }

        assert.notStrictEqual(window.getComputedStyle(target).display, 'none', 'target is not hidden');
        assert.strictEqual(window.hit, undefined, 'hit function has not been called');
    });
}
