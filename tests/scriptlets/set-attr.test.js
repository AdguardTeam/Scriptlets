/* eslint-disable no-underscore-dangle, no-console */
import {
    runScriptlet,
    clearGlobalProps,
    ATTR_SETTLE_DELAY_MS,
    createAttrMutationCounter,
    runAttrRulesAndCountIdleChanges,
    checkTwoAttrRulesSettle,
    checkAttrErrorForOneElement,
    countLogsAfterDomChange,
    getLogs,
    makeUnrelatedDomChange,
    sleep,
} from '../helpers';

const { test, module } = QUnit;
const name = 'set-attr';

const TARGET_ELEM_ID = 'target';
const MISMATCH_ELEM_ID = 'mismatch';
const TARGET_ATTR_NAME = 'test-attr';
const TARGET_ELEM_BAIT_ATTR = 'another-attr-value';

const nativeConsole = console.log;

let context;
let testCaseCount = 0;

const createElement = (id) => {
    const elem = document.createElement('div');
    elem.id = id;
    document.body.appendChild(elem);
    return elem;
};

const createContext = () => {
    // This prevents multiple observers from tinkering with other tests
    testCaseCount += 1;

    const targetUID = `${TARGET_ELEM_ID}-${testCaseCount}`;
    const mismatchUID = `${MISMATCH_ELEM_ID}-${testCaseCount}`;

    return {
        targetSelector: `#${targetUID}`,
        targetElem: createElement(targetUID),
        mismatchElem: createElement(mismatchUID),
        changeTargetAttribute(attributeName) {
            return this.targetElem.setAttribute(attributeName, TARGET_ELEM_BAIT_ATTR);
        },
    };
};

const clearContext = () => {
    context.targetElem.remove();
    context.mismatchElem.remove();
    context = null;
};

const beforeEach = () => {
    context = createContext();
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearContext();
    clearGlobalProps('hit', '__debug');
    console.log = nativeConsole;
};

module(name, { beforeEach, afterEach });

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const uboParams = {
        name: 'ubo-set-attr.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByUboParams = window.scriptlets.invoke(uboParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('selector + attr + eligible number', (assert) => {
    const value = '1234';
    const { targetSelector, targetElem, mismatchElem } = context;
    const scriptletArgs = [targetSelector, TARGET_ATTR_NAME, value];

    runScriptlet(name, scriptletArgs);

    assert.strictEqual(targetElem.getAttribute(TARGET_ATTR_NAME), value, `New attr value ${value} is correct`);
    assert.strictEqual(
        mismatchElem.getAttribute(TARGET_ATTR_NAME),
        null,
        `Attr ${TARGET_ATTR_NAME} is not added to mismatch element`,
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function has been called');

    clearGlobalProps('hit');

    context.changeTargetAttribute(TARGET_ATTR_NAME);

    const done = assert.async();
    setTimeout(() => {
        assert.strictEqual(targetElem.getAttribute(TARGET_ATTR_NAME), value, `New attr val ${value} is still correct`);
        assert.strictEqual(window.hit, 'FIRED', 'hit function has been called again');
        done();
    }, 30);
});

test('selector + attr + 0 (minimum possible value)', (assert) => {
    const value = '0';
    const { targetSelector, targetElem, mismatchElem } = context;
    const scriptletArgs = [targetSelector, TARGET_ATTR_NAME, value];

    runScriptlet(name, scriptletArgs);

    assert.strictEqual(targetElem.getAttribute(TARGET_ATTR_NAME), value, `New attr value ${value} is correct`);
    assert.strictEqual(
        mismatchElem.getAttribute(TARGET_ATTR_NAME),
        null,
        `Attr ${TARGET_ATTR_NAME} is not added to mismatch element`,
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function has been called');
});

test('selector + attr + 32767 (maximum possible value)', (assert) => {
    const value = '32767';
    const { targetSelector, targetElem, mismatchElem } = context;
    const scriptletArgs = [targetSelector, TARGET_ATTR_NAME, value];

    runScriptlet(name, scriptletArgs);

    assert.strictEqual(targetElem.getAttribute(TARGET_ATTR_NAME), value, `New attr value ${value} is correct`);
    assert.strictEqual(
        mismatchElem.getAttribute(TARGET_ATTR_NAME),
        null,
        `Attr ${TARGET_ATTR_NAME} is not added to mismatch element`,
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function has been called');
});

test('selector + attr + empty string', (assert) => {
    const value = '';
    const { targetSelector, targetElem, mismatchElem } = context;
    const scriptletArgs = [targetSelector, TARGET_ATTR_NAME, value];

    runScriptlet(name, scriptletArgs);

    assert.strictEqual(targetElem.getAttribute(TARGET_ATTR_NAME), value, `New attr value ${value} is correct`);
    assert.strictEqual(
        mismatchElem.getAttribute(TARGET_ATTR_NAME),
        null,
        `Attr ${TARGET_ATTR_NAME} is not added to mismatch element`,
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function has been called');
});

test('selector + attr + true', (assert) => {
    const value = 'true';
    const { targetSelector, targetElem, mismatchElem } = context;
    const scriptletArgs = [targetSelector, TARGET_ATTR_NAME, value];

    runScriptlet(name, scriptletArgs);

    assert.strictEqual(targetElem.getAttribute(TARGET_ATTR_NAME), value, `New attr value ${value} is correct`);
    assert.strictEqual(
        mismatchElem.getAttribute(TARGET_ATTR_NAME),
        null,
        `Attr ${TARGET_ATTR_NAME} is not added to mismatch element`,
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function has been called');

    clearGlobalProps('hit');

    context.changeTargetAttribute(TARGET_ATTR_NAME);

    const done = assert.async();
    setTimeout(() => {
        assert.strictEqual(targetElem.getAttribute(TARGET_ATTR_NAME), value, `New attr val ${value} is still correct`);
        assert.strictEqual(window.hit, 'FIRED', 'hit function has been called again');
        done();
    }, 30);
});

test('selector + attr + False', (assert) => {
    const value = 'False';
    const { targetSelector, targetElem, mismatchElem } = context;
    const scriptletArgs = [targetSelector, TARGET_ATTR_NAME, value];

    runScriptlet(name, scriptletArgs);

    assert.strictEqual(targetElem.getAttribute(TARGET_ATTR_NAME), value, `New attr value ${value} is correct`);
    assert.strictEqual(
        mismatchElem.getAttribute(TARGET_ATTR_NAME),
        null,
        `Attr ${TARGET_ATTR_NAME} is not added to mismatch element`,
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function has been called');

    clearGlobalProps('hit');

    context.changeTargetAttribute(TARGET_ATTR_NAME);

    const done = assert.async();
    setTimeout(() => {
        assert.strictEqual(targetElem.getAttribute(TARGET_ATTR_NAME), value, `New attr val ${value} is still correct`);
        assert.strictEqual(window.hit, 'FIRED', 'hit function has been called again');
        done();
    }, 30);
});

test('selector + attr + negative number', (assert) => {
    const value = '-100';
    const { targetSelector, targetElem, mismatchElem } = context;
    const scriptletArgs = [targetSelector, TARGET_ATTR_NAME, value];

    runScriptlet(name, scriptletArgs);

    assert.strictEqual(targetElem.getAttribute(TARGET_ATTR_NAME), null, `Attr ${TARGET_ATTR_NAME} is not added`);
    assert.strictEqual(
        mismatchElem.getAttribute(TARGET_ATTR_NAME),
        null,
        `Attr ${TARGET_ATTR_NAME} is not added to mismatch element either`,
    );
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
});

test('selector + attr + too big of a number', (assert) => {
    const value = '33000';
    const { targetSelector, targetElem, mismatchElem } = context;
    const scriptletArgs = [targetSelector, TARGET_ATTR_NAME, value];

    runScriptlet(name, scriptletArgs);

    assert.strictEqual(targetElem.getAttribute(TARGET_ATTR_NAME), null, `Attr ${TARGET_ATTR_NAME} is not added`);
    assert.strictEqual(
        mismatchElem.getAttribute(TARGET_ATTR_NAME),
        null,
        `Attr ${TARGET_ATTR_NAME} is not added to mismatch element either`,
    );
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
});

test('selector + attr + not allowed string', (assert) => {
    const value = 'trueNotAllowed';
    const { targetSelector, targetElem, mismatchElem } = context;
    const scriptletArgs = [targetSelector, TARGET_ATTR_NAME, value];

    runScriptlet(name, scriptletArgs);

    assert.strictEqual(targetElem.getAttribute(TARGET_ATTR_NAME), null, `Attr ${TARGET_ATTR_NAME} is not added`);
    assert.strictEqual(
        mismatchElem.getAttribute(TARGET_ATTR_NAME),
        null,
        `Attr ${TARGET_ATTR_NAME} is not added to mismatch element either`,
    );
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
});

test('copying another attribute value', (assert) => {
    const ANOTHER_ATTRIBUTE_NAME = 'another-attr';
    const ANOTHER_ATTRIBUTE_VALUE = '1234';
    const SPECIAL_VALUE = `[${ANOTHER_ATTRIBUTE_NAME}]`;

    const { targetSelector, targetElem, mismatchElem } = context;
    const scriptletArgs = [targetSelector, TARGET_ATTR_NAME, SPECIAL_VALUE];

    targetElem.setAttribute(ANOTHER_ATTRIBUTE_NAME, ANOTHER_ATTRIBUTE_VALUE);

    runScriptlet(name, scriptletArgs);

    assert.strictEqual(
        targetElem.getAttribute(TARGET_ATTR_NAME),
        ANOTHER_ATTRIBUTE_VALUE,
        `Value ${ANOTHER_ATTRIBUTE_VALUE} has been copied correctly`,
    );
    assert.strictEqual(
        targetElem.getAttribute(ANOTHER_ATTRIBUTE_NAME),
        ANOTHER_ATTRIBUTE_VALUE,
        'Another attribute is intact',
    );
    assert.strictEqual(
        mismatchElem.getAttribute(TARGET_ATTR_NAME),
        null,
        `Attr ${TARGET_ATTR_NAME} is not added to mismatch element`,
    );
    assert.strictEqual(window.hit, 'FIRED', 'hit function has been called');

    clearGlobalProps('hit');

    context.changeTargetAttribute(TARGET_ATTR_NAME);

    const done = assert.async();
    setTimeout(() => {
        assert.strictEqual(
            targetElem.getAttribute(TARGET_ATTR_NAME),
            ANOTHER_ATTRIBUTE_VALUE,
            `New attr val ${ANOTHER_ATTRIBUTE_VALUE} is still correct`,
        );
        assert.strictEqual(window.hit, 'FIRED', 'hit function has been called again');
        done();
    }, 30);
});

test('two rules on same element settle, logging enabled', async (assert) => {
    const { targetElem } = context;
    await checkTwoAttrRulesSettle(assert, name, { firstElem: targetElem, secondElem: targetElem });
});

test('two rules on same element settle, logging disabled', async (assert) => {
    const { targetElem } = context;
    await checkTwoAttrRulesSettle(assert, name, { firstElem: targetElem, secondElem: targetElem, verbose: false });
});

test('two rules on different elements settle', async (assert) => {
    const { targetElem, mismatchElem } = context;
    await checkTwoAttrRulesSettle(assert, name, { firstElem: targetElem, secondElem: mismatchElem });
});

test('two rules on same element settle, one of them copies attribute value', async (assert) => {
    const { targetElem } = context;
    targetElem.setAttribute('data-source', 'copied');
    await checkTwoAttrRulesSettle(assert, name, {
        firstElem: targetElem,
        secondElem: targetElem,
        secondValue: '[data-source]',
        secondExpected: 'copied',
    });
});

test('two rules on different elements settle, one of them copies attribute value', async (assert) => {
    const { targetElem, mismatchElem } = context;
    mismatchElem.setAttribute('data-source', 'copied');
    await checkTwoAttrRulesSettle(assert, name, {
        firstElem: targetElem,
        secondElem: mismatchElem,
        secondValue: '[data-source]',
        secondExpected: 'copied',
    });
});

test('copying missing attribute value settles and logs it only once', async (assert) => {
    const { targetElem } = context;
    // existing value should be overwritten once and not on each mutation
    targetElem.setAttribute(TARGET_ATTR_NAME, 'initial');
    let missingAttrLogCount = 0;
    console.log = (...args) => {
        if (typeof args[0] === 'string' && args[0].includes('No element attribute found to copy value from')) {
            missingAttrLogCount += 1;
        }
        nativeConsole(...args);
    };

    const { initialMutations, mutations, hits } = await runAttrRulesAndCountIdleChanges(name, [
        { elem: targetElem, attr: TARGET_ATTR_NAME, value: '[data-missing]' },
    ]);

    assert.ok(initialMutations > 0, 'initial attribute change is counted');
    assert.strictEqual(mutations, 0, 'no attribute mutations while page is idle');
    assert.strictEqual(hits, 0, 'hit is not called while page is idle');
    assert.strictEqual(missingAttrLogCount, 1, 'missing attribute is logged only on the initial change');
});

/**
 * Returns the message logged by the rule copying the value from missing attribute.
 *
 * @param {string} sourceAttr attribute to copy the value from, should be unique for the test,
 * since observers of rules from previous tests are still active
 * @returns {string} logged message
 */
const getMissingSourceMessage = (sourceAttr) => {
    return `${name}: No element attribute found to copy value from: [${sourceAttr}]`;
};

test('missing source attribute is logged once if target already holds copied missing value', async (assert) => {
    const { targetSelector, targetElem } = context;
    const sourceAttr = 'data-ag-missing-null';
    // e.g. set in page markup or by the same rule applied twice
    targetElem.setAttribute(TARGET_ATTR_NAME, 'null');
    const counter = createAttrMutationCounter([targetElem], [TARGET_ATTR_NAME]);

    const count = await countLogsAfterDomChange(
        name,
        [targetSelector, TARGET_ATTR_NAME, `[${sourceAttr}]`],
        getMissingSourceMessage(sourceAttr),
    );
    const mutations = counter.count;
    counter.disconnect();

    assert.strictEqual(count, 1, 'missing source attribute is logged once');
    assert.strictEqual(mutations, 0, 'attribute is not re-set');
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
});

test('missing source attribute is logged for a copy of processed element', async (assert) => {
    const { targetSelector, targetElem } = context;
    const sourceAttr = 'data-ag-missing-clone';
    let clone;

    const logs = await getLogs(async () => {
        runScriptlet(name, [targetSelector, TARGET_ATTR_NAME, `[${sourceAttr}]`]);
        // page copies the processed element, so the copy already holds the copied missing value
        clone = targetElem.cloneNode(true);
        document.body.appendChild(clone);
        await sleep(ATTR_SETTLE_DELAY_MS);
        await makeUnrelatedDomChange();
    });
    const count = logs.filter((log) => log === getMissingSourceMessage(sourceAttr)).length;
    clone.remove();

    assert.strictEqual(clone.getAttribute(TARGET_ATTR_NAME), 'null', 'copy holds the copied missing value');
    assert.strictEqual(count, 2, 'missing source attribute is logged once for each element');
});

test('missing source attribute is logged again only after it has been found', async (assert) => {
    const { targetSelector, targetElem } = context;
    const sourceAttr = 'data-ag-missing-again';

    const logs = await getLogs(async () => {
        runScriptlet(name, [targetSelector, TARGET_ATTR_NAME, `[${sourceAttr}]`]);
        // page changes the target, while the source attribute is still missing
        targetElem.setAttribute(TARGET_ATTR_NAME, 'page-value');
        await sleep(ATTR_SETTLE_DELAY_MS);
        assert.strictEqual(targetElem.getAttribute(TARGET_ATTR_NAME), 'null', 'page change is overwritten');

        targetElem.setAttribute(sourceAttr, 'copied');
        await sleep(ATTR_SETTLE_DELAY_MS);
        assert.strictEqual(targetElem.getAttribute(TARGET_ATTR_NAME), 'copied', 'found value is copied');

        targetElem.removeAttribute(sourceAttr);
        await sleep(ATTR_SETTLE_DELAY_MS);
        await makeUnrelatedDomChange();
    });
    const count = logs.filter((log) => log === getMissingSourceMessage(sourceAttr)).length;

    assert.strictEqual(count, 2, 'missing source attribute is logged once before and once after it is found');
});

test('attribute is not re-set and hit is not called if value already matches', (assert) => {
    const { targetSelector, targetElem } = context;
    const plainAttr = 'data-ag-test-a';
    const copyAttr = 'data-ag-test-b';
    targetElem.setAttribute(plainAttr, '1');
    targetElem.setAttribute('data-source', 'copied');
    targetElem.setAttribute(copyAttr, 'copied');

    const counter = createAttrMutationCounter([targetElem], [plainAttr, copyAttr]);

    runScriptlet(name, [targetSelector, plainAttr, '1']);
    runScriptlet(name, [targetSelector, copyAttr, '[data-source]']);

    const done = assert.async();
    // mutation observer callbacks are async, so wait for them
    setTimeout(() => {
        const mutations = counter.count;
        counter.disconnect();
        assert.strictEqual(targetElem.getAttribute(plainAttr), '1', `${plainAttr} value is unchanged`);
        assert.strictEqual(targetElem.getAttribute(copyAttr), 'copied', `${copyAttr} value is unchanged`);
        assert.strictEqual(mutations, 0, 'setAttribute is not called for matching values');
        assert.strictEqual(window.hit, undefined, 'hit function has not been called');
        done();
    }, ATTR_SETTLE_DELAY_MS);
});

test('invalid selector is logged only once', async (assert) => {
    const selector = '..ag-test-invalid-selector';
    const count = await countLogsAfterDomChange(
        name,
        [selector, TARGET_ATTR_NAME, '1'],
        `${name}: Invalid selector arg: '${selector}'`,
    );
    assert.strictEqual(count, 1, 'invalid selector is logged once');
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
});

test('invalid attribute name is logged only once', async (assert) => {
    const { targetSelector, targetElem } = context;
    const attr = 'ag-test invalid';
    const count = await countLogsAfterDomChange(
        name,
        [targetSelector, attr, '1'],
        `${name}: Invalid attribute name: '${attr}'`,
    );
    assert.strictEqual(count, 1, 'invalid attribute name is logged once');
    assert.strictEqual(targetElem.attributes.length, 1, 'no attribute has been set');
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
});

test('error for one element does not stop setting attribute on other elements and is logged once', async (assert) => {
    await checkAttrErrorForOneElement(assert, name);
});

/**
 * Checks that an invalid name of the attribute to copy the value from is logged once for the rule
 * and the rule does nothing, instead of treating the attribute as missing on each matched element.
 *
 * @param {object} assert QUnit assert
 * @param {string} value value argument with the invalid attribute name, e.g. '[data a]'
 */
const checkInvalidSourceAttrIsLoggedOnce = async (assert, value) => {
    const { targetElem, mismatchElem } = context;
    const elems = [targetElem, mismatchElem];
    // several elements are matched, so the name should be logged once for the rule and not for each element
    const selector = elems.map((elem) => `#${elem.id}`).join(', ');

    const logs = await getLogs(async () => {
        runScriptlet(name, [selector, TARGET_ATTR_NAME, value]);
        await makeUnrelatedDomChange();
    });
    const invalidValueCount = logs.filter((log) => {
        return log === `${name}: Invalid attribute value provided: '${value}'`;
    }).length;
    const missingSourceCount = logs.filter((log) => log === getMissingSourceMessage(value.slice(1, -1))).length;

    assert.strictEqual(invalidValueCount, 1, 'invalid attribute name is logged once');
    assert.strictEqual(missingSourceCount, 0, 'attribute is not logged as missing');
    elems.forEach((elem) => {
        assert.strictEqual(elem.hasAttribute(TARGET_ATTR_NAME), false, `attribute has not been set to #${elem.id}`);
    });
    assert.strictEqual(window.hit, undefined, 'hit function has not been called');
};

test('invalid attribute name to copy value from is logged only once', async (assert) => {
    await checkInvalidSourceAttrIsLoggedOnce(assert, '[data-ag invalid]');
});

test('empty attribute name to copy value from is logged only once', async (assert) => {
    await checkInvalidSourceAttrIsLoggedOnce(assert, '[]');
});

/**
 * Waits for the observers of the rules, which are throttled.
 *
 * @returns {Promise<void>} promise which is resolved after the delay
 */
const waitForObservers = () => sleep(ATTR_SETTLE_DELAY_MS);

/**
 * Creates an iframe which loads nothing, with the given attributes.
 *
 * @param {{[key: string]: string}} attrs attributes of the iframe
 * @returns {HTMLIFrameElement} iframe added to the document
 */
const createIframe = (attrs) => {
    const iframe = document.createElement('iframe');
    Object.keys(attrs).forEach((key) => iframe.setAttribute(key, attrs[key]));
    document.body.appendChild(iframe);
    return iframe;
};

const UBO_NAMES = ['ubo-set-attr.js', 'ubo-set-attr'];

test.each('uBO rule: copies the value, or sets an empty one if it is missing', UBO_NAMES, (assert, uboName) => {
    // 2embed.*##+js(set-attr, iframe#iframesrc, src, [data-src])
    const iframe = createIframe({ id: 'iframesrc', src: 'about:blank#ad', 'data-src': 'about:blank#video' });
    const missing = createIframe({ class: 'iframesrc-missing', src: 'about:blank#ad' });
    // The document of the test page is complete, so the attribute is set immediately
    runScriptlet(uboName, ['iframe#iframesrc', 'src', '[data-src]']);
    runScriptlet(uboName, ['iframe.iframesrc-missing', 'src', '[data-src]']);

    assert.strictEqual(iframe.getAttribute('src'), 'about:blank#video', 'Value copied');
    assert.strictEqual(missing.getAttribute('src'), '', 'Empty value set, as in uBO');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    iframe.remove();
    missing.remove();
});

test('uBO rule: number is set without leading zeros, as in uBO, an AdGuard rule sets it as it is', (assert) => {
    // www.google.*##+js(set-attr, c-wiz[data-p] [data-query] a[target="_blank"][role="link"], rlhc, 1),
    // with `007` instead of `1`
    runScriptlet('ubo-set-attr', [context.targetSelector, 'rlhc', '007']);
    assert.strictEqual(context.targetElem.getAttribute('rlhc'), '7', 'Number set by the uBO rule');

    runScriptlet(name, [context.targetSelector, 'data-rlhc', '007']);
    assert.strictEqual(context.targetElem.getAttribute('data-rlhc'), '007', 'Number set by the AdGuard rule');
});

test('uBO rule: value which uBO rejects is not set, as in uBO, an AdGuard rule sets it', (assert) => {
    runScriptlet('ubo-set-attr', [context.targetSelector, 'rlhc', '12abc']);
    assert.strictEqual(context.targetElem.getAttribute('rlhc'), null, 'Value not set by the uBO rule');

    runScriptlet(name, [context.targetSelector, 'rlhc', '12abc']);
    assert.strictEqual(context.targetElem.getAttribute('rlhc'), '12abc', 'Value set by the AdGuard rule, as before');
});

test('uBO rule keeps the value set by the page, as in uBO, an AdGuard rule sets its own one again', async (assert) => {
    // statisticsanddata.org##+js(set-attr, iframe[data-src-cmplz][src="about:blank"], src, [data-src-cmplz])
    const uboIframe = createIframe({ class: 'cmplz-ubo', src: 'about:blank', 'data-src-cmplz': 'about:blank#video' });
    runScriptlet('ubo-set-attr', ['iframe.cmplz-ubo[data-src-cmplz]', 'src', '[data-src-cmplz]']);
    // eslint-disable-next-line max-len
    // polskieradio24.pl,smartphonevergleich.de#%#//scriptlet('set-attr', 'iframe[data-cmp-src]', 'src', '[data-cmp-src]')
    const adgIframe = createIframe({ class: 'cmp-adg', src: 'about:blank', 'data-cmp-src': 'about:blank#video' });
    runScriptlet(name, ['iframe.cmp-adg[data-cmp-src]', 'src', '[data-cmp-src]']);
    // Adding the element is a change of the DOM, after which the uBO rule sets the attribute again as well,
    // so the page changes the attributes only after that
    await waitForObservers();

    uboIframe.setAttribute('src', 'about:blank#page');
    adgIframe.setAttribute('src', 'about:blank#page');
    await waitForObservers();

    assert.strictEqual(uboIframe.getAttribute('src'), 'about:blank#page', 'Value of the page kept by the uBO rule');
    assert.strictEqual(adgIframe.getAttribute('src'), 'about:blank#video', 'Value set again by the AdGuard rule');
    uboIframe.remove();
    adgIframe.remove();
});

test('uBO rule does not copy a value to an event handler, as in uBO, an AdGuard rule does', (assert) => {
    context.targetElem.setAttribute('data-handler', 'void 0');

    runScriptlet('ubo-set-attr', [context.targetSelector, 'onclick', '[data-handler]']);
    assert.strictEqual(context.targetElem.getAttribute('onclick'), null, 'Event handler not set by the uBO rule');

    runScriptlet(name, [context.targetSelector, 'onclick', '[data-handler]']);
    assert.strictEqual(context.targetElem.getAttribute('onclick'), 'void 0', 'Event handler set by the AdGuard rule');
});

test('uBO rule: quotes escaped by the converter are unescaped', (assert) => {
    // A selector with `'`, e.g. `[data-x='1']`, is converted by AGTree to `[data-x=\'1\']`,
    // which CoreLibs passes as it is
    context.targetElem.setAttribute('data-x', '1');
    runScriptlet('ubo-set-attr', [`${context.targetSelector}[data-x=\\'1\\']`, TARGET_ATTR_NAME, 'true']);

    assert.strictEqual(context.targetElem.getAttribute(TARGET_ATTR_NAME), 'true', 'Escape removed');
});

test('AdGuard rule with runAt option', (assert) => {
    // apkmoddone.com#%#//scriptlet('set-attr', '.adsbygoogle', 'data-ad-status', '0'), with `runAt`
    // The document of the test page is complete, so the attribute is set immediately
    runScriptlet(name, [context.targetSelector, 'data-ad-status', '0', 'runAt', 'interactive']);

    assert.strictEqual(context.targetElem.getAttribute('data-ad-status'), '0', 'Attribute set');
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
});
