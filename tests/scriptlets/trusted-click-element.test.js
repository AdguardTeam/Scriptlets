/* eslint-disable no-underscore-dangle, no-console */
import {
    runScriptlet,
    clearGlobalProps,
    PANEL_ID,
    CLICKABLE_NAME,
    createSelectorsString,
    createPanel,
    removePanel,
    createClickable,
} from '../helpers';
import { serializeCookie } from '../../src/helpers';

const { test, module } = QUnit;
const name = 'trusted-click-element';

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

test('Element already in DOM is clicked', (assert) => {
    const ELEM_COUNT = 1;
    const ASSERTIONS = ELEM_COUNT + 1;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = `#${PANEL_ID} > #${CLICKABLE_NAME}${ELEM_COUNT}`;
    const panel = createPanel();
    const clickable = createClickable(1);
    panel.appendChild(clickable);

    runScriptlet(name, [selectorsString]);

    setTimeout(() => {
        assert.ok(clickable.getAttribute('clicked'), 'Element should be clicked');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 150);
});

test('Element added to DOM is clicked', (assert) => {
    const ELEM_COUNT = 1;
    const ASSERTIONS = ELEM_COUNT + 1;
    assert.expect(ASSERTIONS);

    const done = assert.async();
    const selectorsString = `#${PANEL_ID} > #${CLICKABLE_NAME}${ELEM_COUNT}`;
    const panel = createPanel();

    runScriptlet(name, [selectorsString]);

    const clickable = createClickable(1);
    panel.appendChild(clickable);

    setTimeout(() => {
        assert.ok(clickable.getAttribute('clicked'), 'Element should be clicked');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 150);
});

test('Element added to DOM, removed and then added again - should be clicked', (assert) => {
    const DELAY = 100;
    const ELEM_COUNT = 1;
    const ASSERTIONS = ELEM_COUNT + 1;
    assert.expect(ASSERTIONS);

    const done = assert.async();
    const selectorsString = `#${PANEL_ID} > #${CLICKABLE_NAME}${ELEM_COUNT}`;

    runScriptlet(name, [selectorsString, '', DELAY]);

    const panelToRemove = createPanel();
    const clickableToRemove = createClickable(1);
    panelToRemove.appendChild(clickableToRemove);

    let clickable;
    setTimeout(() => {
        removePanel();
        const panel = createPanel();
        clickable = createClickable(1);
        panel.appendChild(clickable);
    }, 10);

    setTimeout(() => {
        assert.ok(clickable.getAttribute('clicked'), 'Element should be clicked');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 150);
});

test('Multiple elements clicked - one element loaded before scriptlet, rest added later', (assert) => {
    const CLICK_ORDER = [1, 2, 3];
    // Assert elements for being clicked, hit func execution & click order
    const ASSERTIONS = CLICK_ORDER.length + 2;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = createSelectorsString(CLICK_ORDER);

    const panel = createPanel();

    const clickables = [];
    const clickable1 = createClickable(1);
    panel.appendChild(clickable1);
    clickables.push(clickable1);

    runScriptlet(name, [selectorsString]);

    const clickable2 = createClickable(2);
    panel.appendChild(clickable2);
    clickables.push(clickable2);

    const clickable3 = createClickable(3);
    panel.appendChild(clickable3);
    clickables.push(clickable3);

    setTimeout(() => {
        clickables.forEach((clickable) => {
            assert.ok(clickable.getAttribute('clicked'), 'Element should be clicked');
        });
        assert.strictEqual(CLICK_ORDER.join(), window.clickOrder.join(), 'Elements were clicked in a given order');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 400);
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

test('Multiple elements - breaks when middle element not found', (assert) => {
    const CLICK_ORDER = [1, 2, 3];
    // Element 2 is missing, so only element 1 should be clicked
    // Element 3 should NOT be clicked because element 2 is missing
    const ASSERTIONS = 3; // element1 clicked, element3 not clicked, hit not fired
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = createSelectorsString(CLICK_ORDER);

    runScriptlet(name, [selectorsString]);
    const panel = createPanel();

    // Only create elements 1 and 3, skip element 2
    const clickable1 = createClickable(1);
    panel.appendChild(clickable1);

    const clickable3 = createClickable(3);
    panel.appendChild(clickable3);

    setTimeout(() => {
        assert.ok(clickable1.getAttribute('clicked'), 'Element 1 should be clicked');
        assert.notOk(clickable3.getAttribute('clicked'), 'Element 3 should NOT be clicked (element 2 missing)');
        assert.strictEqual(window.hit, undefined, 'hit should not fire (sequence incomplete)');
        done();
    }, 400);
});

test('Multiple elements - element disconnected then reconnected', (assert) => {
    const CLICK_ORDER = [1, 2, 3];
    const DELAY = 300; // Delay before clicking starts
    // Element 2 will be disconnected after being found but before clicking starts
    // The scriptlet should handle the disconnected element and re-find it
    const ASSERTIONS = 4; // 3 elements clicked + hit fired
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = createSelectorsString(CLICK_ORDER);
    const panel = createPanel();

    // Create all elements first
    const clickable1 = createClickable(1);
    panel.appendChild(clickable1);

    const clickable2 = createClickable(2);
    panel.appendChild(clickable2);

    const clickable3 = createClickable(3);
    panel.appendChild(clickable3);

    // Disconnect element 2 before clicking starts (but after observer finds it)
    setTimeout(() => {
        clickable2.remove();
    }, 100);

    // Reconnect element 2 so findAndClickElement can find it again
    setTimeout(() => {
        panel.appendChild(clickable2);
    }, 250);

    // Start scriptlet with delay so elements are found first
    runScriptlet(name, [selectorsString, '', DELAY]);

    setTimeout(() => {
        assert.ok(clickable1.getAttribute('clicked'), 'Element 1 should be clicked');
        assert.ok(clickable2.getAttribute('clicked'), 'Element 2 should be clicked (after reconnection)');
        assert.ok(clickable3.getAttribute('clicked'), 'Element 3 should be clicked');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 800);
});

test('extraMatch - single cookie match, matched', (assert) => {
    const cookieKey1 = 'first';
    const cookieData = serializeCookie(cookieKey1, 'true', '/');
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

test('extraMatch - text match, matched', (assert) => {
    const textToMatch = 'Accept cookie';
    const EXTRA_MATCH_STR = `containsText:${textToMatch}`;

    const ELEM_COUNT = 1;
    // Check elements for being clicked and hit func execution
    const ASSERTIONS = ELEM_COUNT + 1;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = `#${PANEL_ID} > #${CLICKABLE_NAME}${ELEM_COUNT}`;

    runScriptlet(name, [selectorsString, EXTRA_MATCH_STR]);
    const panel = createPanel();
    const clickable = createClickable(1, textToMatch);
    panel.appendChild(clickable);

    setTimeout(() => {
        assert.ok(clickable.getAttribute('clicked'), 'Element should be clicked');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 150);
});

test('extraMatch - text match, few elements, matched only first element with text', (assert) => {
    const textToMatch = 'Accept cookie';
    const EXTRA_MATCH_STR = `containsText:${textToMatch}`;

    const ELEM_COUNT = 1;
    // Check hit func execution, one element should be clicked, and one should not be clicked (3)
    const ASSERTIONS = ELEM_COUNT + 1 + 1;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = `#${PANEL_ID} > [id^="${CLICKABLE_NAME}"]`;

    runScriptlet(name, [selectorsString, EXTRA_MATCH_STR]);
    const panel = createPanel();
    const clickableNotMatched = createClickable(1, 'Not match');
    const clickableMatched = createClickable(1, textToMatch);
    const clickableMatchedShouldNotBeClicked = createClickable(1, textToMatch);
    panel.appendChild(clickableNotMatched);
    panel.appendChild(clickableMatched);
    panel.appendChild(clickableMatchedShouldNotBeClicked);

    setTimeout(() => {
        assert.ok(clickableMatched.getAttribute('clicked'), 'Element should be clicked');
        assert.notOk(clickableMatchedShouldNotBeClicked.getAttribute('clicked'), 'Element should NOT be clicked');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 150);
});

test('extraMatch - text match regexp, matched', (assert) => {
    const textToMatch = 'Reject foo bar cookie';
    const EXTRA_MATCH_STR = 'containsText:/Reject.*cookie/';

    const ELEM_COUNT = 1;
    // Check elements for being clicked and hit func execution
    const ASSERTIONS = ELEM_COUNT + 1;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = `#${PANEL_ID} > #${CLICKABLE_NAME}${ELEM_COUNT}`;

    runScriptlet(name, [selectorsString, EXTRA_MATCH_STR]);
    const panel = createPanel();
    const clickable = createClickable(1, textToMatch);
    panel.appendChild(clickable);

    setTimeout(() => {
        assert.ok(clickable.getAttribute('clicked'), 'Element should be clicked');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 150);
});

test('extraMatch - text match, not matched', (assert) => {
    const textToMatch = 'foo';
    const EXTRA_MATCH_STR = `containsText:${textToMatch}`;

    const ELEM_COUNT = 1;
    // Check elements for being clicked and hit func execution
    const ASSERTIONS = ELEM_COUNT + 1;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = `#${PANEL_ID} > #${CLICKABLE_NAME}${ELEM_COUNT}`;

    runScriptlet(name, [selectorsString, EXTRA_MATCH_STR]);
    const panel = createPanel();
    const clickable = createClickable(1, 'bar');
    panel.appendChild(clickable);

    setTimeout(() => {
        assert.notOk(clickable.getAttribute('clicked'), 'Element should not be clicked');
        assert.strictEqual(window.hit, undefined, 'hit should not fire');
        done();
    }, 150);
});

test('extraMatch - single cookie match, not matched', (assert) => {
    const cookieKey1 = 'first';
    const cookieKey2 = 'second';
    const cookieData = serializeCookie(cookieKey1, 'true', '/');
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
    const cookieData1 = serializeCookie(cookieKey1, cookieVal1, '/');
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
    const cookieData1 = serializeCookie(cookieKey1, cookieVal1, '/');
    const cookieKey2 = 'sec';
    const cookieVal2 = '1-1';
    const cookieData2 = serializeCookie(cookieKey2, cookieVal2, '/');
    const cookieKey3 = 'third';
    const cookieVal3 = 'true';
    const cookieData3 = serializeCookie(cookieKey3, cookieVal3, '/');

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
    const cookieData = serializeCookie(cookieKey1, 'true', '/');
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

test('extraMatch - cookie revert + text match, click', (assert) => {
    const textToMatch = 'Continue';
    const cookieKey = 'revertTextTest';
    const EXTRA_MATCH_STR = `!cookie:${cookieKey}, containsText:${textToMatch}`;

    const ELEM_COUNT = 1;
    // Check elements for being clicked and hit func execution
    const ASSERTIONS = ELEM_COUNT + 1;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = `#${PANEL_ID} > #${CLICKABLE_NAME}${ELEM_COUNT}`;

    runScriptlet(name, [selectorsString, EXTRA_MATCH_STR]);
    const panel = createPanel();
    const clickable = createClickable(1, textToMatch);
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
    const cookieData = serializeCookie(cookieKey, cookieVal, '/');
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
    const cookieData = serializeCookie(cookieKey, 'true', '/');
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
    const cookieData = serializeCookie(cookieKey, cookieVal, '/');
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
    const cookieData1 = serializeCookie(cookieKey1, cookieVal1, '/');
    const cookieKey2 = 'sec';
    const cookieVal2 = '1-1';
    const cookieData2 = serializeCookie(cookieKey2, cookieVal2, '/');
    const cookieKey3 = 'third';
    const cookieVal3 = 'true';
    const cookieData3 = serializeCookie(cookieKey3, cookieVal3, '/');

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

    const panels = [];

    setTimeout(() => {
        const panel = createPanel();
        panels.push(panel);
    }, 100);

    setTimeout(() => {
        const panel = createPanel();
        const clickable = createClickable(1);
        panel.appendChild(clickable);
    }, 101);

    setTimeout(() => {
        const panel = createPanel();
        panels.push(panel);
    }, 102);

    setTimeout(() => {
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        panels.forEach((panel) => panel.remove());
        done();
    }, 200);
});

// https://github.com/AdguardTeam/AdguardFilters/issues/152341
test('Open shadow dom element clicked', (assert) => {
    const ELEM_COUNT = 1;
    // Check elements for being clicked and hit func execution
    const ASSERTIONS = ELEM_COUNT + 1;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = `#${PANEL_ID} >>> div > #${CLICKABLE_NAME}${ELEM_COUNT}`;

    runScriptlet(name, [selectorsString]);

    const panel = createPanel();
    const shadowRoot = panel.attachShadow({ mode: 'open' });
    const div = document.createElement('div');
    const clickable = createClickable(1);
    div.appendChild(clickable);
    shadowRoot.appendChild(div);

    setTimeout(() => {
        assert.ok(clickable.getAttribute('clicked'), 'Element should be clicked');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 150);
});

test('Closed shadow dom element clicked', (assert) => {
    const ELEM_COUNT = 1;
    // Check elements for being clicked and hit func execution
    const ASSERTIONS = ELEM_COUNT + 1;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = `#${PANEL_ID} >>> div > #${CLICKABLE_NAME}${ELEM_COUNT}`;

    runScriptlet(name, [selectorsString]);

    const panel = createPanel();
    const shadowRoot = panel.attachShadow({ mode: 'closed' });
    const div = document.createElement('div');
    const clickable = createClickable(1);
    div.appendChild(clickable);
    shadowRoot.appendChild(div);

    setTimeout(() => {
        assert.ok(clickable.getAttribute('clicked'), 'Element should be clicked');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 150);
});

test('Closed shadow dom element clicked - text', (assert) => {
    const textToMatch = 'Accept cookie';
    const EXTRA_MATCH_STR = `containsText:${textToMatch}`;

    const ELEM_COUNT = 1;
    // Check hit func execution, one element should be clicked, and one should not be clicked (3)
    const ASSERTIONS = ELEM_COUNT + 1 + 1;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = `#${PANEL_ID} >>> div > [id^="${CLICKABLE_NAME}"]`;

    runScriptlet(name, [selectorsString, EXTRA_MATCH_STR]);

    const panel = createPanel();
    const shadowRoot = panel.attachShadow({ mode: 'closed' });
    const div = document.createElement('div');
    const clickableNotMatched = createClickable(1, 'Not match');
    const clickableMatched = createClickable(1, textToMatch);
    const clickableMatchedShouldNOTBeClicked = createClickable(1, textToMatch);
    div.appendChild(clickableNotMatched);
    div.appendChild(clickableMatched);
    div.appendChild(clickableMatchedShouldNOTBeClicked);
    shadowRoot.appendChild(div);

    setTimeout(() => {
        assert.ok(clickableMatched.getAttribute('clicked'), 'Element should be clicked');
        assert.notOk(clickableMatchedShouldNOTBeClicked.getAttribute('clicked'), 'Element should NOT be clicked');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 150);
});

test('Closed shadow DOM remains closed and element clicked', (assert) => {
    // Closed shadow DOMs should remain closed (shadowRoot stays null)
    // while elements inside are still queried and clicked via internal WeakMap tracking.
    const ASSERTIONS = 3;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = `#${PANEL_ID} >>> div > #${CLICKABLE_NAME}1`;

    runScriptlet(name, [selectorsString]);

    // Create shadow DOM with mode: 'closed' — scriptlet should NOT force it open
    const panel = createPanel();
    const panelShadowRoot = panel.attachShadow({ mode: 'closed' });
    const div = document.createElement('div');
    const clickable = createClickable(1);
    div.appendChild(clickable);
    panelShadowRoot.appendChild(div);

    setTimeout(() => {
        // Shadow root should remain closed — not exposed to external code
        assert.strictEqual(panel.shadowRoot, null, 'Shadow DOM mode should remain closed');

        // Element inside shadow DOM should be clicked
        assert.ok(clickable.getAttribute('clicked'), 'Element inside shadow DOM should be clicked');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 150);
});

test('Closed shadow DOM not exposed to external code', (assert) => {
    // Verify that other elements with closed shadow DOM are not exposed
    // when the scriptlet uses >>> combinator — prevents breaking Cloudflare Turnstile etc.
    const ASSERTIONS = 3;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = `#${PANEL_ID} >>> div > #${CLICKABLE_NAME}1`;

    runScriptlet(name, [selectorsString]);

    // Target element with closed shadow DOM (scriptlet should track it internally)
    const panel = createPanel();
    const panelShadowRoot = panel.attachShadow({ mode: 'closed' });
    const div = document.createElement('div');
    const clickable = createClickable(1);
    div.appendChild(clickable);
    panelShadowRoot.appendChild(div);

    // Unrelated element with closed shadow DOM (should also remain unexposed)
    const unrelated = document.createElement('div');
    unrelated.id = 'unrelated-shadow-host';
    document.body.appendChild(unrelated);
    unrelated.attachShadow({ mode: 'closed' });

    setTimeout(() => {
        // Neither shadow host should expose its shadow root
        assert.strictEqual(panel.shadowRoot, null, 'Target shadow host should remain closed');
        assert.strictEqual(unrelated.shadowRoot, null, 'Unrelated shadow host should remain closed');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        unrelated.remove();
        done();
    }, 150);
});

test('Nested closed shadow DOM element clicked', (assert) => {
    // Two levels of closed shadow DOM, both tracked via WeakMap so elements can be queried.
    const ELEM_COUNT = 1;
    const ASSERTIONS = ELEM_COUNT + 1;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = `#${PANEL_ID} >>> .inner-host >>> div > #${CLICKABLE_NAME}1`;

    runScriptlet(name, [selectorsString]);

    // First level: #panel with closed shadow DOM (forced open)
    const panel = createPanel();
    const firstShadowRoot = panel.attachShadow({ mode: 'closed' });

    // Inside first shadow DOM: .inner-host element with its own closed shadow DOM
    const innerHost = document.createElement('div');
    innerHost.className = 'inner-host';
    firstShadowRoot.appendChild(innerHost);

    // Second level: .inner-host with closed shadow DOM (forced open)
    const secondShadowRoot = innerHost.attachShadow({ mode: 'closed' });
    const div = document.createElement('div');
    const clickable = createClickable(1);
    div.appendChild(clickable);
    secondShadowRoot.appendChild(div);

    setTimeout(() => {
        assert.ok(clickable.getAttribute('clicked'), 'Element in nested closed shadow DOM should be clicked');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 150);
});

test('isTrusted is spoofed for click events', (assert) => {
    const ASSERTIONS = 3;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = `#${PANEL_ID} > #${CLICKABLE_NAME}1`;
    const panel = createPanel();

    const clickable = createClickable(1);
    panel.appendChild(clickable);

    let receivedIsTrusted = null;
    clickable.addEventListener('click', (e) => {
        receivedIsTrusted = e.isTrusted;
    });

    runScriptlet(name, [selectorsString]);

    setTimeout(() => {
        assert.ok(clickable.getAttribute('clicked'), 'Element should be clicked');
        assert.strictEqual(receivedIsTrusted, true, 'isTrusted should be spoofed to true');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 150);
});

test('isTrusted spoofing - removeEventListener still works', (assert) => {
    const ASSERTIONS = 3;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = `#${PANEL_ID} > #${CLICKABLE_NAME}1`;
    const panel = createPanel();

    const clickable = createClickable(1);
    panel.appendChild(clickable);

    let listenerCalled = false;
    const listener = () => {
        listenerCalled = true;
    };

    // Add then immediately remove the listener
    clickable.addEventListener('click', listener);
    clickable.removeEventListener('click', listener);

    runScriptlet(name, [selectorsString]);

    setTimeout(() => {
        assert.ok(clickable.getAttribute('clicked'), 'Element should be clicked');
        assert.strictEqual(listenerCalled, false, 'Removed listener should not be called');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 150);
});

test('isTrusted spoofing - removeEventListener works with EventListenerObject', (assert) => {
    const ASSERTIONS = 3;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = `#${PANEL_ID} > #${CLICKABLE_NAME}1`;
    const panel = createPanel();

    const clickable = createClickable(1);
    panel.appendChild(clickable);

    let listenerCalled = false;
    const listenerObj = {
        handleEvent() {
            listenerCalled = true;
        },
    };

    // Add then immediately remove the EventListenerObject
    clickable.addEventListener('click', listenerObj);
    clickable.removeEventListener('click', listenerObj);

    runScriptlet(name, [selectorsString]);

    setTimeout(() => {
        assert.ok(clickable.getAttribute('clicked'), 'Element should be clicked');
        assert.strictEqual(listenerCalled, false, 'Removed EventListenerObject should not be called');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 150);
});

test('Shadow DOM bridge observer - deferred content triggers click', (assert) => {
    // Element added to shadow DOM after a delay should still be found and clicked
    // thanks to the bridge MutationObserver on the shadow root.
    const ASSERTIONS = 2;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = `#${PANEL_ID} >>> div > #${CLICKABLE_NAME}1`;

    runScriptlet(name, [selectorsString]);

    // Create shadow DOM first, but don't add content yet
    const panel = createPanel();
    const shadowRoot = panel.attachShadow({ mode: 'closed' });

    let clickable;
    // Add content inside shadow DOM after a delay
    setTimeout(() => {
        const div = document.createElement('div');
        clickable = createClickable(1);
        div.appendChild(clickable);
        shadowRoot.appendChild(div);
    }, 50);

    setTimeout(() => {
        assert.ok(clickable.getAttribute('clicked'), 'Deferred element inside shadow DOM should be clicked');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 300);
});

test('observerTimeout - valid time limit parameter', (assert) => {
    const ELEM_COUNT = 1;
    const OBSERVER_TIMEOUT_SEC = 15; // 15 seconds
    // Check elements for being clicked and hit func execution
    const ASSERTIONS = ELEM_COUNT + 1;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = `#${PANEL_ID} > #${CLICKABLE_NAME}${ELEM_COUNT}`;

    // Pass empty strings for extraMatch, delay, and reload, then observerTimeout
    runScriptlet(name, [selectorsString, '', '', '', OBSERVER_TIMEOUT_SEC]);
    const panel = createPanel();
    const clickable = createClickable(1);
    panel.appendChild(clickable);

    setTimeout(() => {
        assert.ok(clickable.getAttribute('clicked'), 'Element should be clicked');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 150);
});

test('observerTimeout - invalid time limit (negative)', (assert) => {
    const ELEM_COUNT = 1;
    const OBSERVER_TIMEOUT_SEC = -10;
    // Check elements for NOT being clicked (scriptlet should exit early due to invalid param)
    const ASSERTIONS = ELEM_COUNT + 1;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = `#${PANEL_ID} > #${CLICKABLE_NAME}${ELEM_COUNT}`;

    runScriptlet(name, [selectorsString, '', '', '', OBSERVER_TIMEOUT_SEC]);
    const panel = createPanel();
    const clickable = createClickable(1);
    panel.appendChild(clickable);

    setTimeout(() => {
        assert.notOk(clickable.getAttribute('clicked'), 'Element should not be clicked - invalid observerTimeout');
        assert.strictEqual(window.hit, undefined, 'hit should not fire');
        done();
    }, 150);
});

test('observerTimeout - invalid time limit (NaN string)', (assert) => {
    const ELEM_COUNT = 1;
    const OBSERVER_TIMEOUT_SEC = 'invalid';
    // Check elements for NOT being clicked (scriptlet should exit early due to invalid param)
    const ASSERTIONS = ELEM_COUNT + 1;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = `#${PANEL_ID} > #${CLICKABLE_NAME}${ELEM_COUNT}`;

    runScriptlet(name, [selectorsString, '', '', '', OBSERVER_TIMEOUT_SEC]);
    const panel = createPanel();
    const clickable = createClickable(1);
    panel.appendChild(clickable);

    setTimeout(() => {
        assert.notOk(clickable.getAttribute('clicked'), 'Element should not be clicked - invalid observerTimeout');
        assert.strictEqual(window.hit, undefined, 'hit should not fire');
        done();
    }, 150);
});

test('observerTimeout - observer stops after timeout expires', (assert) => {
    const OBSERVER_TIMEOUT_SEC = 1; // 1 second timeout

    // Check first element is clicked before timeout, second element is not clicked after timeout
    const ASSERTIONS = 3;
    assert.expect(ASSERTIONS);

    const done = assert.async();

    const selectorsString = `#${PANEL_ID} > .${CLICKABLE_NAME}`;
    const panel = createPanel();

    runScriptlet(name, [selectorsString, '', '', '', OBSERVER_TIMEOUT_SEC]);

    // Add first clickable element before timeout
    const clickable1 = createClickable(1);
    clickable1.className = CLICKABLE_NAME;
    panel.appendChild(clickable1);

    // Check first element is clicked before observer timeout (1 second) expires
    setTimeout(() => {
        assert.ok(clickable1.getAttribute('clicked'), 'First element should be clicked before timeout');
    }, 500);

    // Add second clickable element after timeout expires
    const clickable2 = createClickable(2);
    clickable2.className = CLICKABLE_NAME;
    setTimeout(() => {
        panel.appendChild(clickable2);
    }, 1500);

    // Verify second element is not clicked after observer timeout (1 second) expires
    setTimeout(() => {
        assert.notOk(clickable2.getAttribute('clicked'), 'Second element should not be clicked after timeout');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed for first element');
        done();
    }, 1500);
});

test('React element with __reactProps$ is clicked via React handlers', (assert) => {
    const ELEM_COUNT = 1;
    const ASSERTIONS = 3;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = `#${PANEL_ID} > #${CLICKABLE_NAME}${ELEM_COUNT}`;
    const panel = createPanel();

    // Create element that simulates a React component
    const reactElement = document.createElement('button');
    reactElement.id = `${CLICKABLE_NAME}${ELEM_COUNT}`;

    // Simulate React's internal props structure
    const reactPropsKey = '__reactProps$testkey123';
    let onFocusCalled = false;
    let onClickCalled = false;

    reactElement[reactPropsKey] = {
        onFocus: () => {
            onFocusCalled = true;
        },
        onClick: () => {
            onClickCalled = true;
            reactElement.setAttribute('clicked', 'true');
            window.clickOrder.push(ELEM_COUNT);
        },
    };

    panel.appendChild(reactElement);

    runScriptlet(name, [selectorsString]);

    setTimeout(() => {
        assert.ok(onFocusCalled, 'React onFocus handler should be called');
        assert.ok(onClickCalled, 'React onClick handler should be called');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 150);
});
