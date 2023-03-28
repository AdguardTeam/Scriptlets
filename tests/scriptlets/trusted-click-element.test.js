/* eslint-disable no-underscore-dangle, no-console */
import { runScriptlet, clearGlobalProps } from '../helpers';
import { concatCookieNameValuePath } from '../../src/helpers';

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
    // Without "path=/;" cookie is not removed
    document.cookie = `${cName}=; path=/; max-age=0`;
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
    }, 400);
});

test('Multiple elements clicked - delay test', (assert) => {
    const CLICK_ORDER = [1, 2, 3];
    // Assert elements for being clicked, hit func execution & click order
    // & 2 x test delay with 3 tests (first - clicked|not clicked|not clicked; second - clicked|clicked|not clicked)
    const ASSERTIONS = CLICK_ORDER.length + 2 + 3 + 3;
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
        assert.ok(panel.querySelector('#clickable1').getAttribute('clicked'), 'Element should be clicked');
        assert.notOk(panel.querySelector('#clickable2').getAttribute('clicked'), 'Element should not be clicked');
        assert.notOk(panel.querySelector('#clickable3').getAttribute('clicked'), 'Element should not be clicked');
    }, 100);

    setTimeout(() => {
        assert.ok(panel.querySelector('#clickable1').getAttribute('clicked'), 'Element should be clicked');
        assert.ok(panel.querySelector('#clickable2').getAttribute('clicked'), 'Element should be clicked');
        assert.notOk(panel.querySelector('#clickable3').getAttribute('clicked'), 'Element should not be clicked');
    }, 200);

    setTimeout(() => {
        clickables.forEach((clickable) => {
            assert.ok(clickable.getAttribute('clicked'), 'Element should be clicked');
        });
        assert.strictEqual(CLICK_ORDER.join(), window.clickOrder.join(), 'Elements were clicked in a given order');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 400);
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
    }, 400);
});

test('extraMatch - single cookie match, matched', (assert) => {
    const cookieKey1 = 'first';
    const cookieData = concatCookieNameValuePath(cookieKey1, 'true', '/');
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
    const cookieData = concatCookieNameValuePath(cookieKey1, 'true', '/');
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
    const cookieData1 = concatCookieNameValuePath(cookieKey1, cookieVal1, '/');
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
    const cookieData1 = concatCookieNameValuePath(cookieKey1, cookieVal1, '/');
    const cookieKey2 = 'sec';
    const cookieVal2 = '1-1';
    const cookieData2 = concatCookieNameValuePath(cookieKey2, cookieVal2, '/');
    const cookieKey3 = 'third';
    const cookieVal3 = 'true';
    const cookieData3 = concatCookieNameValuePath(cookieKey3, cookieVal3, '/');

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

test('extraMatch - single cookie match + single localStorage match, matched', (assert) => {
    const cookieKey1 = 'cookieMatch';
    const cookieData = concatCookieNameValuePath(cookieKey1, 'true', '/');
    document.cookie = cookieData;
    const itemName = 'itemMatch';
    window.localStorage.setItem(itemName, 'value');
    const EXTRA_MATCH_STR = `cookie:${cookieKey1}, localStorage:${itemName}`;

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
    window.localStorage.clear();
});

test('extraMatch - single cookie revert, click', (assert) => {
    const cookieKey = 'revertTest';
    const EXTRA_MATCH_STR = `!cookie:${cookieKey}`;

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
});

test('extraMatch - single cookie with value revert match, should click', (assert) => {
    const cookieKey = 'clickValue';
    const cookieVal = 'true';
    const cookieData = concatCookieNameValuePath(cookieKey, cookieVal, '/');
    document.cookie = cookieData;
    const EXTRA_MATCH_STR = `!cookie:${cookieKey}=false`;

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
        clearCookie(cookieKey);
        done();
    }, 150);
});

test('extraMatch - single cookie revert match, should not click', (assert) => {
    const cookieKey = 'doNotClick';
    const cookieData = concatCookieNameValuePath(cookieKey, 'true', '/');
    document.cookie = cookieData;
    const EXTRA_MATCH_STR = `!cookie:${cookieKey}`;

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
        clearCookie(cookieKey);
        done();
    }, 150);
});

test('extraMatch - single cookie with value revert match, should not click', (assert) => {
    const cookieKey = 'doNotClickValue';
    const cookieVal = 'true';
    const cookieData = concatCookieNameValuePath(cookieKey, cookieVal, '/');
    document.cookie = cookieData;
    const EXTRA_MATCH_STR = `!cookie:${cookieKey}=${cookieVal}`;

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
        clearCookie(cookieKey);
        done();
    }, 150);
});

test('extraMatch - single localStorage revert, click', (assert) => {
    const itemName = 'revertItem';
    const EXTRA_MATCH_STR = `!localStorage:${itemName}`;

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
});

test('extraMatch - single localStorage revert match, should not click', (assert) => {
    const itemName = 'revertItem2';
    window.localStorage.setItem(itemName, 'value');
    const EXTRA_MATCH_STR = `!localStorage:${itemName}`;

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

test('extraMatch - single cookie match + single localStorage match, revert - click', (assert) => {
    const cookieKey1 = 'cookieRevertAndItem';
    const itemName = 'itemRevertAndCookie';
    const EXTRA_MATCH_STR = `!cookie:${cookieKey1}, !localStorage:${itemName}`;

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
});

test('extraMatch - complex string+regex cookie input&whitespaces&comma in regex, revert should not click', (assert) => {
    const cookieKey1 = 'first';
    const cookieVal1 = 'true';
    const cookieData1 = concatCookieNameValuePath(cookieKey1, cookieVal1, '/');
    const cookieKey2 = 'sec';
    const cookieVal2 = '1-1';
    const cookieData2 = concatCookieNameValuePath(cookieKey2, cookieVal2, '/');
    const cookieKey3 = 'third';
    const cookieVal3 = 'true';
    const cookieData3 = concatCookieNameValuePath(cookieKey3, cookieVal3, '/');

    document.cookie = cookieData1;
    document.cookie = cookieData2;
    document.cookie = cookieData3;

    const EXTRA_MATCH_STR = '!cookie:/firs/=true,cookie:sec=/(1-1){1,2}/,  !cookie:third=true';

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

test('extraMatch - complex string+regex cookie input&whitespaces&comma in regex, revert should click', (assert) => {
    const EXTRA_MATCH_STR = '!cookie:/firs/=true,cookie:sec=/(1-1){1,2}/,  !cookie:third=true';

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
});

// https://github.com/AdguardTeam/Scriptlets/issues/284#issuecomment-1419464354
test('Test - wait for an element to click', (assert) => {
    const ELEM_COUNT = 1;
    const selectorsString = `#${PANEL_ID} > #${CLICKABLE_NAME}${ELEM_COUNT}`;

    assert.expect(1);
    const done = assert.async();

    runScriptlet(name, [selectorsString]);

    setTimeout(() => {
        createPanel();
    }, 100);

    setTimeout(() => {
        const panel = createPanel();
        const clickable = createClickable(1);
        panel.appendChild(clickable);
    }, 101);

    setTimeout(() => {
        createPanel();
    }, 102);

    setTimeout(() => {
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        removePanel();
        done();
    }, 200);
});
