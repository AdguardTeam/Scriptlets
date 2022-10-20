/* eslint-disable no-underscore-dangle, no-console */
import { runScriptlet, clearGlobalProps } from '../helpers';
import { prepareCookie } from '../../src/helpers';

const { test, module } = QUnit;
const name = 'trusted-click-element';

const PANEL_ID = 'panel';
const CLICKABLE_NAME = 'clickable';
const SELECTORS_DELIMITER = ',';

// Generate selectors for each clickable element
const createSelectorsString = (clickOrder) => {
    const selectors = clickOrder.map((elemNum) => `#${PANEL_ID} > #${CLICKABLE_NAME}${elemNum}`);
    return selectors.join(SELECTORS_DELIMITER);
};

// Create clickable element with it's count as id and assertion as onclick
const createClickable = (elementNum) => {
    const clickableId = `${CLICKABLE_NAME}${elementNum}`;
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = clickableId;
    checkbox.onclick = (e) => {
        e.currentTarget.setAttribute('clicked', true);
        window.clickOrder.push(elementNum);
    };
    return checkbox;
};

const createPanel = () => {
    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    document.body.appendChild(panel);
    return panel;
};

const removePanel = () => document.getElementById('panel').remove();

const clearCookie = (cName) => {
    document.cookie = `${cName}=; max-age=0`;
};

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
    window.clickOrder = [];
};

const afterEach = () => {
    removePanel();
    clearGlobalProps('hit', '__debug', 'clickOrder');
};

module(name, { beforeEach, afterEach });

test('Single element clicked', (assert) => {
    const ELEM_COUNT = 1;
    // Check elements for being clicked and hit func execution
    const ASSERTIONS = ELEM_COUNT + 1;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = `#${PANEL_ID} > #${CLICKABLE_NAME}${ELEM_COUNT}`;

    runScriptlet(name, [selectorsString]);
    const panel = createPanel();
    const clickable = createClickable(1);
    panel.appendChild(clickable);

    setTimeout(() => {
        assert.ok(clickable.getAttribute('clicked'), 'Element should be clicked');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 150);
});

test('Single element clicked, delay is set', (assert) => {
    const ELEM_COUNT = 1;
    const DELAY = 300;
    // Check elements for being clicked and hit func execution
    const ASSERTIONS = (ELEM_COUNT + 1) * 2;
    assert.expect(ASSERTIONS);
    const done = assert.async();
    const done2 = assert.async();
    const selectorsString = `#${PANEL_ID} > #${CLICKABLE_NAME}${ELEM_COUNT}`;

    runScriptlet(name, [selectorsString, '', DELAY]);
    const panel = createPanel();
    const clickable = createClickable(1);
    panel.appendChild(clickable);

    setTimeout(() => {
        assert.notOk(clickable.getAttribute('clicked'), 'Element should not be clicked before delay');
        assert.strictEqual(window.hit, undefined, 'hit should not fire before delay');
        done();
    }, 200);

    setTimeout(() => {
        assert.ok(clickable.getAttribute('clicked'), 'Element should be clicked after delay');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed after delay');
        done2();
    }, 400);
});

test('Multiple elements clicked', (assert) => {
    const CLICK_ORDER = [1, 2, 3];
    // Assert elements for being clicked, hit func execution & click order
    const ASSERTIONS = CLICK_ORDER.length + 2;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = createSelectorsString(CLICK_ORDER);

    runScriptlet(name, [selectorsString]);
    const panel = createPanel();
    const clickables = [];
    CLICK_ORDER.forEach((number) => {
        const clickable = createClickable(number);
        panel.appendChild(clickable);
        clickables.push(clickable);
    });

    setTimeout(() => {
        clickables.forEach((clickable) => {
            assert.ok(clickable.getAttribute('clicked'), 'Element should be clicked');
        });
        assert.strictEqual(CLICK_ORDER.join(), window.clickOrder.join(), 'Elements were clicked in a given order');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 150);
});

test('Multiple elements clicked, non-ordered render', (assert) => {
    const CLICK_ORDER = [2, 1, 3];
    // Assert elements for being clicked, hit func execution & click order
    const ASSERTIONS = CLICK_ORDER.length + 2;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = createSelectorsString(CLICK_ORDER);

    runScriptlet(name, [selectorsString]);
    const panel = createPanel();
    const clickables = [];
    CLICK_ORDER.forEach((number) => {
        const clickable = createClickable(number);
        panel.appendChild(clickable);
        clickables.push(clickable);
    });

    setTimeout(() => {
        clickables.forEach((clickable) => {
            assert.ok(clickable.getAttribute('clicked'), 'Element should be clicked');
        });
        assert.strictEqual(CLICK_ORDER.join(), window.clickOrder.join(), 'Elements were clicked in a given order');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 150);
});

test('extraMatch - single cookie match, matched', (assert) => {
    const cookieKey1 = 'first';
    const cookieData = prepareCookie(cookieKey1, 'true');
    document.cookie = cookieData;
    const EXTRA_MATCH_STR = `cookie:${cookieKey1}`;

    const ELEM_COUNT = 1;
    // Check elements for being clicked and hit func execution
    const ASSERTIONS = ELEM_COUNT + 1;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = `#${PANEL_ID} > #${CLICKABLE_NAME}${ELEM_COUNT}`;

    runScriptlet(name, [selectorsString, EXTRA_MATCH_STR]);
    const panel = createPanel();
    const clickable = createClickable(1);
    panel.appendChild(clickable);

    setTimeout(() => {
        assert.ok(clickable.getAttribute('clicked'), 'Element should be clicked');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 150);
    clearCookie(cookieKey1);
});

test('extraMatch - single cookie match, not matched', (assert) => {
    const cookieKey1 = 'first';
    const cookieKey2 = 'second';
    const cookieData = prepareCookie(cookieKey1, 'true');
    document.cookie = cookieData;
    const EXTRA_MATCH_STR = `cookie:${cookieKey2}`;

    const ELEM_COUNT = 1;
    // Check elements for being clicked and hit func execution
    const ASSERTIONS = ELEM_COUNT + 1;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = `#${PANEL_ID} > #${CLICKABLE_NAME}${ELEM_COUNT}`;

    runScriptlet(name, [selectorsString, EXTRA_MATCH_STR]);
    const panel = createPanel();
    const clickable = createClickable(1);
    panel.appendChild(clickable);

    setTimeout(() => {
        assert.notOk(clickable.getAttribute('clicked'), 'Element should not be clicked');
        assert.strictEqual(window.hit, undefined, 'hit should not fire');
        done();
    }, 150);
    clearCookie(cookieKey1);
});

test('extraMatch - string+regex cookie input, matched', (assert) => {
    const cookieKey1 = 'first';
    const cookieVal1 = 'true';
    const cookieData1 = prepareCookie(cookieKey1, cookieVal1);
    document.cookie = cookieData1;
    const EXTRA_MATCH_STR = 'cookie:/firs/=true';

    const ELEM_COUNT = 1;
    // Check elements for being clicked and hit func execution
    const ASSERTIONS = ELEM_COUNT + 1;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = `#${PANEL_ID} > #${CLICKABLE_NAME}${ELEM_COUNT}`;

    runScriptlet(name, [selectorsString, EXTRA_MATCH_STR]);
    const panel = createPanel();
    const clickable = createClickable(1);
    panel.appendChild(clickable);

    setTimeout(() => {
        assert.ok(clickable.getAttribute('clicked'), 'Element should be clicked');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 150);
    clearCookie(cookieKey1);
});

test('extraMatch - single localStorage match, matched', (assert) => {
    const itemName = 'item';
    window.localStorage.setItem(itemName, 'value');
    const EXTRA_MATCH_STR = `localStorage:${itemName}`;

    const ELEM_COUNT = 1;
    // Check elements for being clicked and hit func execution
    const ASSERTIONS = ELEM_COUNT + 1;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = `#${PANEL_ID} > #${CLICKABLE_NAME}${ELEM_COUNT}`;

    runScriptlet(name, [selectorsString, EXTRA_MATCH_STR]);
    const panel = createPanel();
    const clickable = createClickable(1);
    panel.appendChild(clickable);

    setTimeout(() => {
        assert.ok(clickable.getAttribute('clicked'), 'Element should be clicked');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 150);
    window.localStorage.clear();
});

test('extraMatch - single localStorage match, not matched', (assert) => {
    const itemName = 'item';
    const itemName2 = 'key';
    window.localStorage.setItem(itemName, 'value');
    const EXTRA_MATCH_STR = `localStorage:${itemName2}`;

    const ELEM_COUNT = 1;
    // Check elements for being clicked and hit func execution
    const ASSERTIONS = ELEM_COUNT + 1;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = `#${PANEL_ID} > #${CLICKABLE_NAME}${ELEM_COUNT}`;

    runScriptlet(name, [selectorsString, EXTRA_MATCH_STR]);
    const panel = createPanel();
    const clickable = createClickable(1);
    panel.appendChild(clickable);

    setTimeout(() => {
        assert.notOk(clickable.getAttribute('clicked'), 'Element should not be clicked');
        assert.strictEqual(window.hit, undefined, 'hit should not fire');
        done();
    }, 150);
    window.localStorage.clear();
});

test('extraMatch - complex string+regex cookie input & whitespaces & comma in regex, matched', (assert) => {
    const cookieKey1 = 'first';
    const cookieVal1 = 'true';
    const cookieData1 = prepareCookie(cookieKey1, cookieVal1);
    const cookieKey2 = 'sec';
    const cookieVal2 = '1-1';
    const cookieData2 = prepareCookie(cookieKey2, cookieVal2);
    const cookieKey3 = 'third';
    const cookieVal3 = 'true';
    const cookieData3 = prepareCookie(cookieKey3, cookieVal3);

    document.cookie = cookieData1;
    document.cookie = cookieData2;
    document.cookie = cookieData3;

    const EXTRA_MATCH_STR = 'cookie:/firs/=true,cookie:sec=/(1-1){1,2}/,  cookie:third=true';

    const ELEM_COUNT = 1;
    // Check elements for being clicked and hit func execution
    const ASSERTIONS = ELEM_COUNT + 1;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = `#${PANEL_ID} > #${CLICKABLE_NAME}${ELEM_COUNT}`;

    runScriptlet(name, [selectorsString, EXTRA_MATCH_STR]);
    const panel = createPanel();
    const clickable = createClickable(1);
    panel.appendChild(clickable);

    setTimeout(() => {
        assert.ok(clickable.getAttribute('clicked'), 'Element should be clicked');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 150);
    clearCookie(cookieKey1);
});
