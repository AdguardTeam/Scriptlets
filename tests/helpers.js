export const clearGlobalProps = (...props) => {
    props.forEach((prop) => {
        try {
            delete window[prop];
        } catch (e) {
            try {
                // Safari does not allow to delete property
                window[prop] = null;
            } catch (e) {
                // some tests can not set property of window which has only a getter.
                // e.g. 'popAdsProp' and 'popns' for set-popads-dummy scriptlet
            }
        }
    });
};

/**
 * Returns random number from range inclusively min and max
 *
 * @param {number} min minimum range limit
 * @param {number} max maximum range limit
 * @returns {number}
 */
export const getRandomNumber = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

// eslint-disable-next-line no-eval
export const evalWrapper = eval;

/**
 * Fetches and parses the redirects YAML file, returning an instance of Redirects.
 * @typedef {import('./path/to/redirects').Redirects} Redirects
 * @returns {Promise<Redirects>} A promise that resolves to an instance of Redirects.
 */
export const getRedirectsInstance = async () => {
    const yamlResponse = await fetch('./scriptlets/redirects.yml');
    const yamlString = await yamlResponse.text();
    return new window.Redirects(yamlString);
};

/**
 * Runs scriptlet with given args
 *
 * @param {string} name scriptlet name
 * @param {Array|undefined} args array of scriptlet args
 * @param {boolean} [verbose=true]
 */
export const runScriptlet = (name, args, verbose = true) => {
    const params = {
        name,
        args,
        verbose,
    };
    const resultString = window.scriptlets.invoke(params);

    // Create a trustedTypes policy for eval,
    // it's required for a test with CSP "require-trusted-types-for" for "trusted-replace-node-text" scriptlet
    if (window.trustedTypes) {
        const policy = window.trustedTypes.createPolicy('myEscapePolicy', {
            createScript: (string) => string,
        });
        const sanitizedString = policy.createScript(resultString);
        evalWrapper(sanitizedString);
    } else {
        evalWrapper(resultString);
    }
};

/**
 * Runs redirect
 *
 * @param {string} name redirect name
 * @param {boolean} [verbose=true]
 */
export const runRedirect = (name, verbose = true) => {
    const params = {
        name,
        verbose,
    };
    const resultString = window.scriptlets.redirects.getCode(params);
    evalWrapper(resultString);
};

/**
 * Clear cookie by name
 *
 * @param {string} cName
 */
export const clearCookie = (cName) => {
    // Without "path=/;" cookie is not to be re-set with no value
    document.cookie = `${cName}=; path=/; max-age=0`;
};

export const isSafariBrowser = () => navigator.vendor === 'Apple Computer, Inc.';

export const PANEL_ID = 'panel';
export const CLICKABLE_NAME = 'clickable';
export const SELECTORS_DELIMITER = ',';

/**
 * Generates a CSS selector string based on the order of clicked elements.
 *
 * @param {number[]} clickOrder - An array of numbers representing the order in which elements were clicked.
 * @returns {string} A string of CSS selectors corresponding to the click order.
 */
export const createSelectorsString = (clickOrder) => {
    const selectors = clickOrder.map((elemNum) => `#${PANEL_ID} > #${CLICKABLE_NAME}${elemNum}`);
    return selectors.join(SELECTORS_DELIMITER);
};

/**
 * Creates a clickable checkbox element with a unique ID and an onClick assertion.
 *
 * @param {number} elementNum - The number for this element.
 * @param {string} [text=''] - Optional text content for the checkbox.
 * @returns {HTMLInputElement} The created checkbox element.
 */
export const createClickable = (elementNum, text = '') => {
    const clickableId = `${CLICKABLE_NAME}${elementNum}`;
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = clickableId;
    checkbox.textContent = text;
    checkbox.onclick = (e) => {
        e.currentTarget.setAttribute('clicked', true);
        window.clickOrder.push(elementNum);
    };
    return checkbox;
};
/**
 * Creates a panel div element with the specified ID and appends it to the body.
 *
 * @returns {HTMLDivElement} The created panel element.
 */
export const createPanel = () => {
    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    document.body.appendChild(panel);
    return panel;
};

/**
 * Removes the panel element from the document.
 */
export const removePanel = () => document.getElementById('panel').remove();

/**
 * Time to let attribute scriptlets apply initial values and let their throttled DOM observers settle.
 */
export const ATTR_SETTLE_DELAY_MS = 100;

/**
 * Idle window during which no attribute mutations are expected once attribute scriptlets have settled.
 */
export const ATTR_IDLE_WINDOW_MS = 300;

/**
 * Returns a promise which resolves after given delay.
 *
 * @param {number} ms delay in milliseconds
 * @returns {Promise<void>}
 */
export const sleep = (ms) => new Promise((resolve) => {
    setTimeout(resolve, ms);
});

/**
 * Makes an unrelated DOM mutation which wakes up DOM observers of scriptlet rules
 * and waits until they handle it.
 *
 * @param {number} [delay=ATTR_SETTLE_DELAY_MS] time to wait for observers in milliseconds
 * @returns {Promise<void>}
 */
export const makeUnrelatedDomChange = async (delay = ATTR_SETTLE_DELAY_MS) => {
    const unrelatedElem = document.createElement('div');
    document.body.appendChild(unrelatedElem);
    unrelatedElem.remove();

    await sleep(delay);
};

/**
 * Replaces `console.log` to collect logged messages.
 *
 * @returns {{logs: string[], restore: Function}} collected messages and function which restores `console.log`
 */
const interceptConsoleLog = () => {
    const logs = [];
    // eslint-disable-next-line no-console
    const nativeConsoleLog = console.log;
    // eslint-disable-next-line no-console
    console.log = (...args) => {
        logs.push(args.join(' '));
    };
    const restore = () => {
        // eslint-disable-next-line no-console
        console.log = nativeConsoleLog;
    };
    return { logs, restore };
};

/**
 * Runs given function and returns messages logged by it synchronously.
 * Observers of rules from previous tests are still active, but they log asynchronously,
 * so their messages are not collected.
 *
 * @param {Function} fn function to run
 * @returns {string[]} logged messages
 */
export const getSyncLogs = (fn) => {
    const { logs, restore } = interceptConsoleLog();
    try {
        fn();
    } finally {
        restore();
    }
    return logs;
};

/**
 * Runs given async function and returns messages logged until it is finished,
 * including messages of observers of rules from previous tests, which are still active.
 *
 * @param {Function} fn async function to run
 * @returns {Promise<string[]>} logged messages
 */
export const getLogs = async (fn) => {
    const { logs, restore } = interceptConsoleLog();
    try {
        await fn();
    } finally {
        restore();
    }
    return logs;
};

/**
 * Runs scriptlet rule, makes an unrelated DOM mutation which wakes up the rule observer, if any,
 * and counts how many times given message has been logged.
 *
 * @param {string} name scriptlet name
 * @param {string[]} args scriptlet args
 * @param {string} message message to count, should be unique for the rule
 * @returns {Promise<number>} number of logged messages
 */
export const countLogsAfterDomChange = async (name, args, message) => {
    const logs = await getLogs(async () => {
        runScriptlet(name, args);
        await makeUnrelatedDomChange();
    });
    return logs.filter((log) => log === message).length;
};

/**
 * Counts attribute mutations on given elements.
 *
 * Each element is observed directly, so mutations are counted even if the element is detached
 * or inside a shadow root. Elements are deduplicated, because calling `observe()` again for
 * an already observed node replaces its options instead of merging them.
 *
 * @param {Element[]} elems elements to observe, duplicates are allowed
 * @param {string[]} attrs attribute names to observe
 * @returns {object} counter with `count`, `reset()` and `disconnect()`
 */
export const createAttrMutationCounter = (elems, attrs) => {
    let count = 0;
    const observer = new MutationObserver((mutations) => {
        count += mutations.length;
    });
    new Set(elems).forEach((elem) => observer.observe(elem, { attributes: true, attributeFilter: attrs }));
    // records which are queued but not yet delivered to the callback
    const flush = () => {
        count += observer.takeRecords().length;
    };
    return {
        get count() {
            flush();
            return count;
        },
        reset() {
            flush();
            count = 0;
        },
        disconnect() {
            observer.disconnect();
        },
    };
};

/**
 * Runs scriptlet rules which change attributes, lets them settle and then counts attribute mutations and hits
 * while the page is idle, except for one unrelated DOM mutation which wakes up the rules' observers.
 * Non-zero counts mean that the rules keep re-applying themselves, e.g. due to a mutation loop.
 * `window.__debug` set by the test is still called and restored when the function is finished.
 *
 * @param {string} name scriptlet name
 * @param {Array<{elem: Element, attr: string, args: string[]}>} rules rules to run,
 * `elem` and `attr` are the element and the attribute changed by the rule, `args` are the scriptlet args
 * @param {boolean} [verbose=true] whether logging (hit) is enabled
 * @returns {Promise<{initialMutations: number, mutations: number, hits: number}>} `initialMutations` is
 * the number of mutations made while the rules were applied, non-zero value proves that the counter observes
 * the right elements and attributes; `mutations` and `hits` are counts collected during the idle window,
 * `hits` includes only hits of given rules
 */
export const runRulesAndCountIdleChanges = async (name, rules, verbose = true) => {
    const rulesArgs = new Set(rules.map(({ args }) => JSON.stringify(args)));
    let hits = 0;
    // eslint-disable-next-line no-underscore-dangle
    const testDebug = window.__debug;
    // eslint-disable-next-line no-underscore-dangle
    window.__debug = (source) => {
        // observers of rules from previous tests are still active, so their hits are not counted
        if (rulesArgs.has(JSON.stringify(source.args))) {
            hits += 1;
        }
        // so that e.g. `window.hit` set by the test's handler is still updated
        if (typeof testDebug === 'function') {
            testDebug(source);
        }
    };

    const counter = createAttrMutationCounter(
        rules.map((rule) => rule.elem),
        rules.map((rule) => rule.attr),
    );

    try {
        rules.forEach(({ args }) => {
            runScriptlet(name, args, verbose);
        });

        await sleep(ATTR_SETTLE_DELAY_MS);
        const initialMutations = counter.count;
        counter.reset();
        hits = 0;

        await makeUnrelatedDomChange(ATTR_IDLE_WINDOW_MS);
        const mutations = counter.count;

        return { initialMutations, mutations, hits };
    } finally {
        counter.disconnect();
        // eslint-disable-next-line no-underscore-dangle
        window.__debug = testDebug;
    }
};

/**
 * Runs scriptlet rules which change attributes and checks that after they are applied the page stays idle,
 * i.e. attributes are not re-set and hit is not called on unrelated DOM mutations,
 * see `runRulesAndCountIdleChanges` for details.
 *
 * @param {object} assert QUnit assert
 * @param {string} name scriptlet name
 * @param {Array<{elem: Element, attr: string, args: string[]}>} rules rules to run,
 * see `runRulesAndCountIdleChanges`
 * @param {Function} checkApplied function which checks the result of the rules, called after they are applied
 * @param {boolean} [verbose=true] whether logging (hit) is enabled
 */
export const checkRulesSettle = async (assert, name, rules, checkApplied, verbose = true) => {
    const { initialMutations, mutations, hits } = await runRulesAndCountIdleChanges(name, rules, verbose);

    checkApplied();
    assert.ok(initialMutations > 0, 'initial attribute changes are counted');
    assert.strictEqual(mutations, 0, 'no attribute mutations while page is idle');
    if (verbose) {
        assert.strictEqual(hits, 0, 'hit is not called while page is idle');
    }
};

/**
 * Converts attribute scriptlet rules to rules for `runRulesAndCountIdleChanges`,
 * each rule matches its element by id.
 *
 * @param {Array<{elem: Element, attr: string, value: string}>} rules attribute rules
 * @returns {Array<{elem: Element, attr: string, args: string[]}>} rules with scriptlet args
 */
const toAttrScriptletRules = (rules) => rules.map(({ elem, attr, value }) => ({
    elem,
    attr,
    args: [`#${elem.id}`, attr, value],
}));

/**
 * Runs attribute scriptlet rules and counts attribute mutations and hits while the page is idle,
 * see `runRulesAndCountIdleChanges` for details.
 *
 * @param {string} name scriptlet name
 * @param {Array<{elem: Element, attr: string, value: string}>} rules rules to run,
 * each rule matches its element by id
 * @param {boolean} [verbose=true] whether logging (hit) is enabled
 * @returns {Promise<{initialMutations: number, mutations: number, hits: number}>} counts,
 * see `runRulesAndCountIdleChanges`
 */
export const runAttrRulesAndCountIdleChanges = (name, rules, verbose = true) => runRulesAndCountIdleChanges(
    name,
    toAttrScriptletRules(rules),
    verbose,
);

/**
 * Runs two non-conflicting attribute scriptlet rules and checks that after they are applied
 * the page stays idle, i.e. there is no mutation loop and no repeated hits.
 *
 * @param {object} assert QUnit assert
 * @param {string} name scriptlet name
 * @param {object} options options
 * @param {Element} options.firstElem element matched by the first rule
 * @param {Element} options.secondElem element matched by the second rule, may be the same as `firstElem`
 * @param {string} [options.secondValue='1'] value argument of the second rule
 * @param {string} [options.secondExpected] expected attribute value set by the second rule,
 * defaults to `secondValue`
 * @param {boolean} [options.verbose=true] whether logging (hit) is enabled
 */
export const checkTwoAttrRulesSettle = async (assert, name, {
    firstElem,
    secondElem,
    secondValue = '1',
    secondExpected = secondValue,
    verbose = true,
}) => {
    const first = { elem: firstElem, attr: 'data-ag-test-a', value: '1' };
    const second = { elem: secondElem, attr: 'data-ag-test-b', value: secondValue };

    await checkRulesSettle(assert, name, toAttrScriptletRules([first, second]), () => {
        assert.strictEqual(firstElem.getAttribute(first.attr), first.value, `${first.attr} is set`);
        assert.strictEqual(secondElem.getAttribute(second.attr), secondExpected, `${second.attr} is set`);
    }, verbose);
};

/**
 * Checks that an error for one element matched by an attribute scriptlet rule, e.g. caused by the page,
 * does not stop setting the attribute on other elements, including ones added later,
 * does not prevent hit for changed elements and is logged only once.
 * Should be called once per scriptlet test page, since the rule observer is still active after the check.
 *
 * @param {object} assert QUnit assert
 * @param {string} name scriptlet name
 */
export const checkAttrErrorForOneElement = async (assert, name) => {
    const className = `ag-test-attr-error-${name}`;
    const attr = 'data-ag-test-error';
    const value = '1';
    const args = [`.${className}`, attr, value];

    const elems = [];
    const createElem = () => {
        const elem = document.createElement('div');
        elem.classList.add(className);
        document.body.appendChild(elem);
        elems.push(elem);
        return elem;
    };
    // failing element is in the middle, so the attribute is set to one element before the error and one after it
    const before = createElem();
    const failing = createElem();
    const after = createElem();
    // e.g. the page overrides the method for the element
    Object.defineProperty(failing, 'setAttribute', {
        value() {
            throw new Error('page error');
        },
        configurable: true,
    });

    let hits = 0;
    // eslint-disable-next-line no-underscore-dangle
    const testDebug = window.__debug;
    // eslint-disable-next-line no-underscore-dangle
    window.__debug = (source) => {
        // observers of rules from previous tests are still active, so their hits are not counted
        if (JSON.stringify(source.args) === JSON.stringify(args)) {
            hits += 1;
        }
        if (typeof testDebug === 'function') {
            testDebug(source);
        }
    };

    let initialHits;
    let added;
    let logs;
    try {
        logs = await getLogs(async () => {
            runScriptlet(name, args);
            await makeUnrelatedDomChange();
            initialHits = hits;
            added = createElem();
            await makeUnrelatedDomChange();
        });
    } finally {
        // eslint-disable-next-line no-underscore-dangle
        window.__debug = testDebug;
        elems.forEach((elem) => elem.remove());
    }

    assert.strictEqual(before.getAttribute(attr), value, 'element before the failing one is changed');
    assert.strictEqual(after.getAttribute(attr), value, 'element after the failing one is changed');
    assert.strictEqual(added.getAttribute(attr), value, 'element added later is changed by the DOM observer');
    assert.strictEqual(failing.hasAttribute(attr), false, 'failing element is not changed');
    assert.strictEqual(initialHits, 1, 'hit is called once for elements changed on the initial run');
    assert.strictEqual(hits, 2, 'hit is called for element added later');
    const errorLogs = logs.filter((log) => log.startsWith(`${name}: Failed to set [${attr}="${value}"]`));
    assert.strictEqual(errorLogs.length, 1, 'error is logged only once');
};
