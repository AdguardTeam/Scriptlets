/* eslint-disable no-underscore-dangle */
import {
    runScriptlet,
    clearGlobalProps,
    PANEL_ID,
    CLICKABLE_NAME,
    createSelectorsString,
    createPanel,
    removePanel,
    createClickable,
    allowSpoofedClicksReset,
    getSyncLogs,
} from '../helpers';
import { serializeCookie, spoofClickEventsIsTrusted } from '../../src/helpers';

// Spoofed clicks are deleted after each test, so the hook is installed again.
// Scriptlets run in the realm of the test page, so they define the property with the wrapper as well.
allowSpoofedClicksReset();

const { test, module } = QUnit;
const name = 'trusted-click-element';

const nativeAddEventListener = EventTarget.prototype.addEventListener;
const nativeRemoveEventListener = EventTarget.prototype.removeEventListener;
const spoofedClicksKey = Symbol.for('adg-spoof-click-isTrusted');

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
    // Restore native event listener methods in case they were patched
    EventTarget.prototype.addEventListener = nativeAddEventListener;
    EventTarget.prototype.removeEventListener = nativeRemoveEventListener;
    delete EventTarget.prototype[spoofedClicksKey];
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

test('Multiple elements clicked - empty and commented out selectors are skipped', (assert) => {
    const CLICK_ORDER = [7, 8];
    // Assert elements for being clicked, hit func execution & click order
    const ASSERTIONS = CLICK_ORDER.length + 2;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    // Numbers not used by other tests, as their scriptlets may still wait for elements
    // Doubled and trailing commas, and a selector with only a CSS comment
    const selectorsString = [
        `#${PANEL_ID} > #${CLICKABLE_NAME}7`,
        '',
        `/* #${CLICKABLE_NAME}9 */`,
        `#${PANEL_ID} > #${CLICKABLE_NAME}8`,
        '',
    ].join(', ');

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

test('Multiple elements clicked - commas inside pseudo-classes and attribute values are not delimiters', (assert) => {
    const CLICK_ORDER = [1, 2];
    // Assert elements for being clicked, hit func execution & click order
    const ASSERTIONS = CLICK_ORDER.length + 2;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = [
        `#${PANEL_ID} > :is(#${CLICKABLE_NAME}1, #${CLICKABLE_NAME}9)`,
        `#${PANEL_ID} > input[title="Accept, agree"]`,
    ].join(', ');

    runScriptlet(name, [selectorsString]);
    const panel = createPanel();
    const clickables = [];
    CLICK_ORDER.forEach((number) => {
        const clickable = createClickable(number);
        panel.appendChild(clickable);
        clickables.push(clickable);
    });
    clickables[1].title = 'Accept, agree';

    setTimeout(() => {
        clickables.forEach((clickable) => {
            assert.ok(clickable.getAttribute('clicked'), 'Element should be clicked');
        });
        assert.strictEqual(CLICK_ORDER.join(), window.clickOrder.join(), 'Elements were clicked in a given order');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 400);
});

test('Multiple elements clicked - CSS comments do not affect splitting by delimiters', (assert) => {
    const CLICK_ORDER = [1, 2];
    // Assert elements for being clicked, hit func execution & click order
    const ASSERTIONS = CLICK_ORDER.length + 2;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const HOST_ID = 'host';
    // Parenthesis inside comment should not hide the comma and the shadow combinator
    const selectorsString = [
        `#${PANEL_ID} > #${CLICKABLE_NAME}1/*(*/`,
        `#${PANEL_ID} > #${HOST_ID}/*(*/ >>> #${CLICKABLE_NAME}2`,
    ].join(', ');

    runScriptlet(name, [selectorsString]);
    const panel = createPanel();
    const clickable1 = createClickable(1);
    panel.appendChild(clickable1);
    const host = document.createElement('div');
    host.id = HOST_ID;
    panel.appendChild(host);
    const clickable2 = createClickable(2);
    host.attachShadow({ mode: 'open' }).appendChild(clickable2);

    setTimeout(() => {
        assert.ok(clickable1.getAttribute('clicked'), 'First element should be clicked');
        assert.ok(clickable2.getAttribute('clicked'), 'Element inside shadow DOM should be clicked');
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

test('Multiple elements - next element not clicked if previous one is removed before delayed click', (assert) => {
    const DELAY = 100;
    const ASSERTIONS = 3;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    // Numbers not used by other tests, as their scriptlets may still wait for elements, e.g. for `#clickable2`
    const selectorsString = createSelectorsString([5, 6]);
    const panel = createPanel();
    const clickable1 = createClickable(5);
    const clickable2 = createClickable(6);
    panel.appendChild(clickable1);
    panel.appendChild(clickable2);

    runScriptlet(name, [selectorsString, '', DELAY]);

    // First element cannot be found again for the delayed click
    setTimeout(() => {
        clickable1.remove();
    }, 10);

    setTimeout(() => {
        assert.notOk(clickable1.getAttribute('clicked'), 'First element should not be clicked');
        assert.notOk(clickable2.getAttribute('clicked'), 'Second element should NOT be clicked before the first one');
        assert.strictEqual(window.hit, undefined, 'hit should not fire');
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

test('extraMatch - invalid click type is logged, element clicked by default click', (assert) => {
    const ASSERTIONS = 3;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    // Number not used by other tests, as their scriptlets may still wait for elements
    const selectorsString = `#${PANEL_ID} > #${CLICKABLE_NAME}4`;

    const loggedMessages = getSyncLogs(() => runScriptlet(name, [selectorsString, 'clickType:synthetic']));

    const panel = createPanel();
    const clickable = createClickable(4);
    panel.appendChild(clickable);

    setTimeout(() => {
        assert.deepEqual(
            loggedMessages,
            [`${name}: Passed click type 'synthetic' is invalid`],
            'Invalid click type logged',
        );
        assert.ok(clickable.getAttribute('clicked'), 'Element should be clicked');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 150);
});

[
    { extraMatchStr: 'isTrusted:all', isTrusted: true, logged: [] },
    { extraMatchStr: '', isTrusted: false, logged: [] },
    {
        extraMatchStr: 'isTrusted:any',
        isTrusted: false,
        logged: [`${name}: Passed isTrusted value 'isTrusted:any' is invalid`],
    },
].forEach(({ extraMatchStr, isTrusted, logged }) => {
    test(`extraMatch - '${extraMatchStr}', click dispatched by a page handler is trusted: ${isTrusted}`, (assert) => {
        const DELAY = 50;
        const done = assert.async();
        const panel = createPanel();
        const toggle = document.createElement('div');
        toggle.id = 'trusted-toggle';
        const hidden = document.createElement('input');
        hidden.type = 'checkbox';
        panel.append(toggle, hidden);

        const loggedMessages = getSyncLogs(() => {
            runScriptlet(name, [`#${PANEL_ID} > #trusted-toggle`, extraMatchStr, DELAY]);
        });

        // Custom control forwards the click to a hidden native one, which accepts only trusted clicks
        toggle.addEventListener('click', () => hidden.click());
        const received = [];
        hidden.addEventListener('click', (event) => { received.push(event); });
        hidden.addEventListener('click', (event) => { received.push(event); });

        setTimeout(() => {
            assert.deepEqual(loggedMessages, logged, 'Only an invalid value is logged');
            assert.deepEqual(received.map((event) => event.isTrusted), [isTrusted, isTrusted], 'Page click trust');
            assert.strictEqual(received[0], received[1], 'All listeners receive the same event');
            assert.ok(hidden.checked, 'Page click checks the hidden control');
            assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
            done();
        }, 150);
    });
});

test('extraMatch - text match containing isTrusted marker, matched', (assert) => {
    const ASSERTIONS = 3;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const textToMatch = 'isTrusted: yes';
    // Number not used by other tests, as their scriptlets may still wait for elements
    const panel = createPanel();
    const clickable = createClickable(15, textToMatch);
    panel.appendChild(clickable);

    const loggedMessages = getSyncLogs(() => {
        runScriptlet(name, [`#${PANEL_ID} > #${CLICKABLE_NAME}15`, `containsText:${textToMatch}`]);
    });

    setTimeout(() => {
        assert.deepEqual(loggedMessages, [], 'Text is not taken for an isTrusted value');
        assert.ok(clickable.getAttribute('clicked'), 'Element should be clicked');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 150);
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

test('extraMatch - text match, element re-rendered before delayed click, matched element clicked', (assert) => {
    const DELAY = 100;
    const textToMatch = 'Reject';
    const EXTRA_MATCH_STR = `containsText:${textToMatch}`;

    // Check hit func execution, one element should be clicked, and one should not be clicked
    const ASSERTIONS = 3;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = `#${PANEL_ID} > [id^="${CLICKABLE_NAME}"]`;

    const panelToRemove = createPanel();
    panelToRemove.appendChild(createClickable(1, 'Accept'));
    panelToRemove.appendChild(createClickable(2, textToMatch));

    runScriptlet(name, [selectorsString, EXTRA_MATCH_STR, DELAY]);

    // Found element is disconnected before the delayed click, so the scriptlet should find it again
    let clickableNotMatched;
    let clickableMatched;
    setTimeout(() => {
        removePanel();
        const panel = createPanel();
        clickableNotMatched = createClickable(1, 'Accept');
        clickableMatched = createClickable(2, textToMatch);
        panel.appendChild(clickableNotMatched);
        panel.appendChild(clickableMatched);
    }, 10);

    setTimeout(() => {
        assert.ok(clickableMatched.getAttribute('clicked'), 'Element with text should be clicked');
        assert.notOk(clickableNotMatched.getAttribute('clicked'), 'Element without text should NOT be clicked');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 200);
});

test('extraMatch - text match regexp with g flag, element already in DOM, matched', (assert) => {
    const ASSERTIONS = 2;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = `#${PANEL_ID} > #${CLICKABLE_NAME}1`;

    // Element is found by the initial check and then queried again,
    // so the second text check should not start from the end of the first match
    const panel = createPanel();
    const clickable = createClickable(1, 'Reject');
    panel.appendChild(clickable);

    runScriptlet(name, [selectorsString, 'containsText:/Reject/g']);

    setTimeout(() => {
        assert.ok(clickable.getAttribute('clicked'), 'Element should be clicked');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 150);
});

test('extraMatch - text match regexp with g flag, element re-rendered before delayed click, matched', (assert) => {
    const DELAY = 100;
    const ASSERTIONS = 2;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = `#${PANEL_ID} > #${CLICKABLE_NAME}1`;

    // Text is matched twice before the re-render, so the regexp `lastIndex` points past the end of the new text
    const panelToRemove = createPanel();
    panelToRemove.appendChild(createClickable(1, 'Reject Reject'));

    runScriptlet(name, [selectorsString, 'containsText:/Reject/g', DELAY]);

    let clickable;
    setTimeout(() => {
        removePanel();
        const panel = createPanel();
        clickable = createClickable(1, 'Reject');
        panel.appendChild(clickable);
    }, 10);

    setTimeout(() => {
        assert.ok(clickable.getAttribute('clicked'), 'Re-rendered element should be clicked');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 200);
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

test('Closed shadow DOM with mode read once by native attachShadow element clicked', (assert) => {
    const ASSERTIONS = 3;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = `#${PANEL_ID} >>> div > #${CLICKABLE_NAME}31`;

    runScriptlet(name, [selectorsString]);

    const panel = createPanel();
    let reads = 0;
    // Reports closed on the first read only, which is the one of native attachShadow
    const shadowRoot = panel.attachShadow({
        get mode() {
            reads += 1;
            return reads === 1 ? 'closed' : 'open';
        },
    });
    const div = document.createElement('div');
    const clickable = createClickable(31);
    div.appendChild(clickable);
    shadowRoot.appendChild(div);

    setTimeout(() => {
        assert.strictEqual(panel.shadowRoot, null, 'Shadow DOM mode should be closed');
        assert.ok(clickable.getAttribute('clicked'), 'Element inside closed shadow DOM should be clicked');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 150);
});

test('isTrusted is spoofed for click events', (assert) => {
    const ASSERTIONS = 3;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = `#${PANEL_ID} > #${CLICKABLE_NAME}1`;

    // Run scriptlet before adding event listener to ensure isTrusted is spoofed
    // and before creating the panel and clickable to ensure they are tracked by the scriptlet
    runScriptlet(name, [selectorsString]);

    const panel = createPanel();

    const clickable = createClickable(1);
    panel.appendChild(clickable);

    let receivedIsTrusted = null;
    clickable.addEventListener('click', (e) => {
        receivedIsTrusted = e.isTrusted;
    });

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

test('cancelBubble can be set without error in spoofed event', (assert) => {
    const ASSERTIONS = 4;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = `#${PANEL_ID} > #${CLICKABLE_NAME}1`;

    // Run scriptlet before adding event listener to ensure isTrusted is spoofed
    // and before creating the panel and clickable to ensure they are tracked by the scriptlet
    runScriptlet(name, [selectorsString]);

    const panel = createPanel();

    const clickable = createClickable(1);
    panel.appendChild(clickable);

    let receivedIsTrusted = null;
    let cancelBubbleIsSet = null;
    clickable.addEventListener('click', (e) => {
        try {
            receivedIsTrusted = e.isTrusted;
            e.cancelBubble = true;
            cancelBubbleIsSet = e.cancelBubble;
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error in click event listener:', error);
            cancelBubbleIsSet = false;
        }
    });

    setTimeout(() => {
        assert.ok(clickable.getAttribute('clicked'), 'Element should be clicked');
        assert.strictEqual(receivedIsTrusted, true, 'isTrusted should be spoofed to true');
        assert.strictEqual(cancelBubbleIsSet, true, 'cancelBubble should be settable to true');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 150);
});

test('isTrusted is spoofed for onclick events', (assert) => {
    const ASSERTIONS = 3;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = `#${PANEL_ID} > #${CLICKABLE_NAME}1`;

    runScriptlet(name, [selectorsString]);

    const panel = createPanel();

    let receivedIsTrustedClick = null;

    const clickable = createClickable(1);

    clickable.onclick = (e) => {
        e.currentTarget.setAttribute('clicked', true);
        receivedIsTrustedClick = e.isTrusted;
    };

    panel.appendChild(clickable);

    setTimeout(() => {
        assert.ok(clickable.getAttribute('clicked'), 'Element should be clicked');
        assert.strictEqual(receivedIsTrustedClick, true, 'isTrusted should be spoofed to true');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 150);
});

test('hooks are not installed when the scriptlet exits early', (assert) => {
    // The shadow combinator makes the scriptlet hook attachShadow as well.
    // The selector never matches, so the running instance cannot click anything in later tests.
    const selectorsString = `#${PANEL_ID} >>> #adg-never-matches`;
    createPanel();
    // Earlier shadow DOM tests may have left their attachShadow proxies in place
    const attachShadowBefore = Element.prototype.attachShadow;
    const isEventListenerHookInstalled = () => {
        return EventTarget.prototype.addEventListener !== nativeAddEventListener
            || EventTarget.prototype.removeEventListener !== nativeRemoveEventListener
            || spoofedClicksKey in EventTarget.prototype;
    };
    const isAttachShadowHookInstalled = () => {
        return Element.prototype.attachShadow !== attachShadowBefore;
    };

    // Arguments after the selector: extraMatch, delay, reload, observerTimeout
    [
        { description: 'Invalid observer timeout', args: ['', '', '', '-1'] },
        { description: 'Invalid delay', args: ['', 'abc'] },
        { description: 'Invalid reload delay', args: ['', '', 'reloadAfterClick:abc'] },
        { description: 'Unmatched cookie', args: ['cookie:adg-never-set-cookie'] },
        { description: 'Unmatched localStorage item', args: ['localStorage:adg-never-set-item'] },
    ].forEach(({ description, args }) => {
        runScriptlet(name, [selectorsString, ...args]);
        assert.notOk(isEventListenerHookInstalled(), `${description} leaves event listener methods intact`);
        assert.notOk(isAttachShadowHookInstalled(), `${description} leaves attachShadow intact`);
    });

    [
        `#${PANEL_ID} >>> xpath(.//input[)`,
        `#${PANEL_ID} >>> xpath(count(.//input))`,
        `#${PANEL_ID} >>> xpath(.//input`,
        // invalid CSS selectors, including misspelled XPath ones
        `#${PANEL_ID} >>> ..input`,
        `#${PANEL_ID} > input, div:not(`,
        'xpath (//input)',
        `#${PANEL_ID} xpath(//input)`,
        // empty part between shadow combinators
        `#${PANEL_ID} >>>  >>> input`,
        // only empty selectors
        ' , ',
        ' , /* #panel */',
    ].forEach((invalidSelector) => {
        const loggedMessages = getSyncLogs(() => runScriptlet(name, [invalidSelector]));
        const description = `Invalid selector '${invalidSelector}'`;
        // Errors thrown by the scriptlet are logged as well, so only the invalid selector message is expected
        assert.ok(
            loggedMessages.length === 1
            && loggedMessages[0].startsWith(`${name}: Invalid selector arg: '`),
            `${description} is logged`,
        );
        assert.notOk(isEventListenerHookInstalled(), `${description} leaves event listener methods intact`);
        assert.notOk(isAttachShadowHookInstalled(), `${description} leaves attachShadow intact`);
    });

    runScriptlet(name, [selectorsString, '', '', '', '1']);
    assert.ok(isEventListenerHookInstalled(), 'Running scriptlet hooks event listener methods');
    assert.ok(isAttachShadowHookInstalled(), 'Running scriptlet hooks attachShadow');

    Element.prototype.attachShadow = attachShadowBefore;
});

test('Shadow combinator inside a string does not hook attachShadow', (assert) => {
    const CLICK_ORDER = [1, 2];
    // Assert attachShadow, elements for being clicked and hit func execution
    const ASSERTIONS = CLICK_ORDER.length + 2;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const TITLE = ' >>> ';
    const selectorsString = [
        `#${PANEL_ID} > #${CLICKABLE_NAME}1[title="${TITLE}"]`,
        `xpath(//input[@id="${CLICKABLE_NAME}2"][@title="${TITLE}"])`,
    ].join(', ');

    const panel = createPanel();
    const clickables = [];
    CLICK_ORDER.forEach((number) => {
        const clickable = createClickable(number);
        clickable.title = TITLE;
        panel.appendChild(clickable);
        clickables.push(clickable);
    });

    // Earlier shadow DOM tests may have left their attachShadow proxies in place
    const attachShadowBefore = Element.prototype.attachShadow;
    runScriptlet(name, [selectorsString]);
    assert.strictEqual(Element.prototype.attachShadow, attachShadowBefore, 'attachShadow should not be hooked');
    Element.prototype.attachShadow = attachShadowBefore;

    setTimeout(() => {
        clickables.forEach((clickable) => {
            assert.ok(clickable.getAttribute('clicked'), 'Element should be clicked');
        });
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 400);
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

test('XPath - element clicked', (assert) => {
    const ASSERTIONS = 2;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = `xpath(//div[@id="${PANEL_ID}"]/input[@id="${CLICKABLE_NAME}1"])`;

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

test('XPath - functions and logical operators select elements', (assert) => {
    // Numbers not used by other tests, as their scriptlets may still wait for elements
    const CLICK_ORDER = [11, 12, 13, 14];
    const TEXTS = ['  Accept\n    all ', 'Reject cookies', 'Save', 'Dismiss'];
    // Assert elements for being clicked, hit func execution & click order
    const ASSERTIONS = CLICK_ORDER.length + 2;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const inPanel = (predicate) => {
        return `xpath(//div[@id="${PANEL_ID}"]/input[${predicate}])`;
    };
    const selectorsString = [
        inPanel('normalize-space(text())="Accept all"'),
        inPanel('contains(text(), "Reject")'),
        inPanel(`starts-with(@id, "${CLICKABLE_NAME}1") and text()="Save"`),
        inPanel('text()="Close" or text()="Dismiss"'),
    ].join(', ');

    runScriptlet(name, [selectorsString]);
    const panel = createPanel();
    const clickables = CLICK_ORDER.map((number, i) => {
        const clickable = createClickable(number, TEXTS[i]);
        panel.appendChild(clickable);
        return clickable;
    });

    setTimeout(() => {
        clickables.forEach((clickable) => {
            assert.ok(clickable.getAttribute('clicked'), `Element '${clickable.textContent}' should be clicked`);
        });
        assert.strictEqual(CLICK_ORDER.join(), window.clickOrder.join(), 'Elements were clicked in a given order');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 800);
});

test('XPath - functions and logical operators select elements inside closed shadow DOM', (assert) => {
    // Numbers not used by other tests, as their scriptlets may still wait for elements
    const CLICK_ORDER = [21, 22, 23, 24];
    const TEXTS = ['  Accept\n    all ', 'Reject cookies', 'Save', 'Dismiss'];
    // Assert elements for being clicked, hit func execution & click order
    const ASSERTIONS = CLICK_ORDER.length + 2;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    // Shadow host is selected by XPath with functions as well
    const HOST_XPATH = `xpath(//div[starts-with(@id, "${PANEL_ID}") and not(@class)])`;
    const inShadow = (predicate) => {
        return `${HOST_XPATH} >>> xpath(descendant-or-self::input[${predicate}])`;
    };
    const selectorsString = [
        inShadow('normalize-space()="Accept all"'),
        inShadow('contains(., "Reject")'),
        inShadow(`starts-with(@id, "${CLICKABLE_NAME}2") and starts-with(., "Save")`),
        inShadow(`@id="${CLICKABLE_NAME}99" or .="Dismiss"`),
    ].join(', ');

    runScriptlet(name, [selectorsString]);

    const panel = createPanel();
    const shadowRoot = panel.attachShadow({ mode: 'closed' });
    const clickables = CLICK_ORDER.map((number, i) => createClickable(number, TEXTS[i]));
    // First element is a top-level element of the shadow root, others are nested
    shadowRoot.appendChild(clickables[0]);
    const div = document.createElement('div');
    clickables.slice(1).forEach((clickable) => div.appendChild(clickable));
    shadowRoot.appendChild(div);

    setTimeout(() => {
        clickables.forEach((clickable) => {
            assert.ok(clickable.getAttribute('clicked'), `Element '${clickable.textContent}' should be clicked`);
        });
        assert.strictEqual(CLICK_ORDER.join(), window.clickOrder.join(), 'Elements were clicked in a given order');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 800);
});

test('XPath - multiple elements clicked, commas inside XPath are not delimiters', (assert) => {
    const CLICK_ORDER = [1, 2, 3];
    // Assert elements for being clicked, hit func execution & click order
    const ASSERTIONS = CLICK_ORDER.length + 2;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = [
        `xpath(//input[contains(@id, "${CLICKABLE_NAME}1")])`,
        `#${PANEL_ID} > #${CLICKABLE_NAME}2`,
        `xpath(//*[@id=concat("${CLICKABLE_NAME}", "3")])`,
    ].join(', ');

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

test('XPath - extraMatch text match, matched only first element with text', (assert) => {
    const textToMatch = 'Accept cookie';
    const EXTRA_MATCH_STR = `containsText:${textToMatch}`;

    // Check hit func execution, one element should be clicked, and one should not be clicked
    const ASSERTIONS = 3;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = `xpath(//div[@id="${PANEL_ID}"]/input)`;

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

test('XPath - shadow host selected by XPath, element inside open shadow DOM clicked', (assert) => {
    const ASSERTIONS = 2;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = `xpath(//div[@id="${PANEL_ID}"]) >>> div > #${CLICKABLE_NAME}1`;

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

test('XPath - element added to closed shadow DOM clicked by relative XPath', (assert) => {
    const ASSERTIONS = 3;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = `#${PANEL_ID} >>> xpath(.//input[@id="${CLICKABLE_NAME}1"])`;

    runScriptlet(name, [selectorsString]);

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
        assert.strictEqual(panel.shadowRoot, null, 'Shadow DOM mode should remain closed');
        assert.ok(clickable.getAttribute('clicked'), 'Element inside shadow DOM should be clicked');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 300);
});

test('XPath - top-level and nested elements of shadow DOM clicked by descendant-or-self axis', (assert) => {
    const CLICK_ORDER = [1, 2];
    // Assert elements for being clicked, hit func execution & click order
    const ASSERTIONS = CLICK_ORDER.length + 2;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    // Shadow root cannot be an XPath context node, so its top-level elements are,
    // and `.//` would skip them
    const selectorsString = CLICK_ORDER
        .map((number) => `#${PANEL_ID} >>> xpath(descendant-or-self::input[@id="${CLICKABLE_NAME}${number}"])`)
        .join(', ');

    runScriptlet(name, [selectorsString]);

    const panel = createPanel();
    const shadowRoot = panel.attachShadow({ mode: 'open' });
    const topLevelClickable = createClickable(1);
    shadowRoot.appendChild(topLevelClickable);
    const div = document.createElement('div');
    const nestedClickable = createClickable(2);
    div.appendChild(nestedClickable);
    shadowRoot.appendChild(div);

    setTimeout(() => {
        assert.ok(topLevelClickable.getAttribute('clicked'), 'Top-level element should be clicked');
        assert.ok(nestedClickable.getAttribute('clicked'), 'Nested element should be clicked');
        assert.strictEqual(CLICK_ORDER.join(), window.clickOrder.join(), 'Elements were clicked in a given order');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 400);
});

test('XPath - element inside nested closed shadow DOM clicked', (assert) => {
    const ASSERTIONS = 2;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = [
        `xpath(//div[@id="${PANEL_ID}"])`,
        'xpath(descendant-or-self::div[@class="inner-host"])',
        `xpath(.//input[@id="${CLICKABLE_NAME}1"])`,
    ].join(' >>> ');

    runScriptlet(name, [selectorsString]);

    const panel = createPanel();
    const firstShadowRoot = panel.attachShadow({ mode: 'closed' });

    const innerHost = document.createElement('div');
    innerHost.className = 'inner-host';
    firstShadowRoot.appendChild(innerHost);

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

test('XPath - evaluation error does not throw, nothing is clicked', (assert) => {
    const ASSERTIONS = 3;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    // Type error in the predicate passes validation, as it is thrown only if there are inputs to apply it to
    const selectorsString = `xpath(//div[@id="${PANEL_ID}"]/input[count(1)])`;

    // Element in DOM before the scriptlet runs, so the error would be thrown by the initial check
    const panel = createPanel();
    const clickable = createClickable(1);
    panel.appendChild(clickable);

    const loggedMessages = getSyncLogs(() => runScriptlet(name, [selectorsString]));

    // Trigger the observer, its callback errors are reported by QUnit as global failures
    panel.appendChild(createClickable(2));

    setTimeout(() => {
        assert.deepEqual(loggedMessages, [], 'Nothing logged');
        assert.notOk(clickable.getAttribute('clicked'), 'Element should not be clicked');
        assert.strictEqual(window.hit, undefined, 'hit should not fire');
        done();
    }, 150);
});

test('XPath - invalid expression is logged with the reason, nothing is clicked', (assert) => {
    const ASSERTIONS = 3;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const xpathSelector = `xpath(.//input[contains(@id, "${CLICKABLE_NAME}"])`;
    const invalidSelector = `#${PANEL_ID} >>> ${xpathSelector}`;
    const selectorsString = `#${PANEL_ID} > #${CLICKABLE_NAME}1, ${invalidSelector}`;

    const loggedMessages = getSyncLogs(() => runScriptlet(name, [selectorsString]));

    const panel = createPanel();
    const clickable = createClickable(1);
    panel.appendChild(clickable);

    setTimeout(() => {
        assert.deepEqual(
            loggedMessages,
            [`${name}: Invalid selector arg: '${invalidSelector}', invalid XPath expression '${xpathSelector}'`],
            'Selector and reason are logged',
        );
        assert.notOk(clickable.getAttribute('clicked'), 'Element should not be clicked');
        assert.strictEqual(window.hit, undefined, 'hit should not fire');
        done();
    }, 150);
});

test('XPath - absolute path after shadow combinator selects elements of shadow tree only', (assert) => {
    const ASSERTIONS = 3;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    // Number not used by other tests, as their scriptlets may still wait for elements
    const ELEMENT_NUM = 32;
    // Page element with the same id, which is selected instead in browsers
    // which evaluate absolute path inside shadow DOM against the document, e.g. Chromium before 146
    const pageClickable = createClickable(ELEMENT_NUM);
    document.body.appendChild(pageClickable);

    const panel = createPanel();
    const shadowRoot = panel.attachShadow({ mode: 'open' });
    const div = document.createElement('div');
    const clickable = createClickable(ELEMENT_NUM);
    div.appendChild(clickable);
    shadowRoot.appendChild(div);

    const xpath = `//input[@id="${CLICKABLE_NAME}${ELEMENT_NUM}"]`;
    const isEvaluatedInShadowTree = document.evaluate(
        xpath,
        div,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null,
    ).singleNodeValue === clickable;

    runScriptlet(name, [`#${PANEL_ID} >>> xpath(${xpath})`]);

    setTimeout(() => {
        assert.notOk(pageClickable.getAttribute('clicked'), 'Page element should not be clicked');
        assert.strictEqual(
            !!clickable.getAttribute('clicked'),
            isEvaluatedInShadowTree,
            `Element inside shadow DOM should be clicked if the browser supports it: ${isEvaluatedInShadowTree}`,
        );
        assert.strictEqual(window.hit, isEvaluatedInShadowTree ? 'FIRED' : undefined, 'hit func executed if clicked');
        pageClickable.remove();
        done();
    }, 150);
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

test('React element with __reactProps$ is clicked via React handlers and preventDefault is called', (assert) => {
    const ELEM_COUNT = 1;
    const ASSERTIONS = 5;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = `#${PANEL_ID} > #${CLICKABLE_NAME}${ELEM_COUNT}`;
    const panel = createPanel();

    // Create element that simulates a React component
    const reactElement = document.createElement('button');
    reactElement.id = `${CLICKABLE_NAME}${ELEM_COUNT}`;

    // Simulate React's internal props structure
    const reactPropsKey = '__reactProps$testkey0000';
    let onFocusCalled = false;
    let onClickCalled = false;
    let receivedIsTrustedFocus = null;
    let receivedIsTrustedClick = null;

    reactElement[reactPropsKey] = {
        onFocus: (e) => {
            onFocusCalled = true;
            receivedIsTrustedFocus = e.isTrusted;
        },
        onClick: (e) => {
            onClickCalled = true;
            reactElement.setAttribute('clicked', 'true');
            e.preventDefault();
            receivedIsTrustedClick = e.isTrusted;
            window.clickOrder.push(ELEM_COUNT);
        },
    };

    panel.appendChild(reactElement);

    runScriptlet(name, [selectorsString]);

    setTimeout(() => {
        assert.ok(onFocusCalled, 'React onFocus handler should be called');
        assert.ok(onClickCalled, 'React onClick handler should be called');
        assert.strictEqual(receivedIsTrustedFocus, true, 'React onFocus handler should receive isTrusted=true');
        assert.strictEqual(receivedIsTrustedClick, true, 'React onClick handler should receive isTrusted=true');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 150);
});

test('clickType:native forces native dispatch over React internal handlers', (assert) => {
    const ELEM_COUNT = 1;
    const ASSERTIONS = 8;
    assert.expect(ASSERTIONS);
    const done = assert.async();

    const selectorsString = `#${PANEL_ID} > #${CLICKABLE_NAME}1`;

    runScriptlet(name, [selectorsString, 'clickType:native']);

    const panel = createPanel();

    // Create element that simulates a React component
    const reactElement = document.createElement('button');
    reactElement.id = `${CLICKABLE_NAME}${ELEM_COUNT}`;

    // Simulate React's internal props structure
    const reactPropsKey = '__reactProps$test_abc123';
    let onFocusCalled = false;
    let onClickCalled = false;
    let receivedIsTrustedFocus = null;
    let receivedIsTrustedClick = null;

    // React handlers should be present but should not be called due to clickType:native
    reactElement[reactPropsKey] = {
        onFocus: (e) => {
            onFocusCalled = true;
            receivedIsTrustedFocus = e.isTrusted;
            reactElement.setAttribute('react-focused', 'true');
        },
        onClick: (e) => {
            onClickCalled = true;
            receivedIsTrustedClick = e.isTrusted;
            reactElement.setAttribute('react-clicked', 'true');
            e.preventDefault();
        },
    };

    reactElement.onclick = () => {
        reactElement.setAttribute('clicked', 'true');
    };

    panel.appendChild(reactElement);

    setTimeout(() => {
        assert.ok(reactElement.getAttribute('clicked'), 'Element should be clicked via native dispatch');
        assert.notOk(reactElement.getAttribute('react-focused'), 'React focus handler should not be called');
        assert.notOk(reactElement.getAttribute('react-clicked'), 'React click handler should not be called');
        assert.strictEqual(onFocusCalled, false, 'React onFocus handler should not be called');
        assert.strictEqual(onClickCalled, false, 'React onClick handler should not be called');
        assert.strictEqual(receivedIsTrustedFocus, null, 'React onFocus handler should not be called');
        assert.strictEqual(receivedIsTrustedClick, null, 'React onClick handler should not be called');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 150);
});

module(`${name} - event listener compatibility`, (hooks) => {
    let documentListeners;

    const listenOnDocument = (listener, capture = false) => {
        document.addEventListener('click', listener, capture);
        documentListeners.push(() => document.removeEventListener('click', listener, capture));
    };

    /**
     * Routes click listener registrations to browser-generated, trusted focusin events.
     * The real helper still wraps 'click' listeners and checks the original event's isTrusted.
     * focus() supplies a trusted bubbling event without an external input driver; label.click() is browser-dependent.
     */
    const useTrustedFocusEvents = () => {
        EventTarget.prototype.addEventListener = function addListener(type, listener, options) {
            return nativeAddEventListener.call(this, type === 'click' ? 'focusin' : type, listener, options);
        };
        EventTarget.prototype.removeEventListener = function removeListener(type, listener, options) {
            return nativeRemoveEventListener.call(this, type === 'click' ? 'focusin' : type, listener, options);
        };
    };

    /**
     * Records the original trust of target events with a listener registered before the hook.
     *
     * @returns {boolean[]} isTrusted values of the observed target events.
     */
    const observeOriginalTrust = () => {
        const target = document.getElementById('target');
        const originalTrust = [];
        listenOnDocument((event) => {
            if (event.target === target) {
                originalTrust.push(event.isTrusted);
            }
        }, true);
        return originalTrust;
    };

    /**
     * Opens #popup from a #root click and closes it on a later outside click.
     * Document listeners are installed synchronously: capture has passed,
     * but document bubble can still receive the opening event.
     *
     * @param {object} assert QUnit assert.
     * @param {string} savedEvent Where the opening event is saved from: 'argument' or 'window.event'.
     *
     * @returns {object} Popup trace and document listener call counters.
     */
    const installPopupGuard = (assert, savedEvent) => {
        const root = document.getElementById('root');
        const target = document.getElementById('target');
        const popup = document.getElementById('popup');
        const state = { trace: [], captureCalls: 0, bubbleCalls: 0 };

        root.addEventListener('click', (event) => {
            if (event.target !== target || !popup.hidden) {
                return;
            }
            popup.hidden = false;
            state.trace.push('open');
            let openingEvent = savedEvent === 'argument' ? event : window.event;
            assert.ok(openingEvent, 'Opening event is available during popup setup');
            const onCapture = () => { state.captureCalls += 1; };
            const onBubble = (documentEvent) => {
                state.bubbleCalls += 1;
                if (documentEvent === openingEvent) {
                    openingEvent = undefined;
                    state.trace.push('ignore opening');
                    return;
                }
                if (popup.contains(documentEvent.target)) {
                    return;
                }
                popup.hidden = true;
                state.trace.push('close');
                document.removeEventListener('click', onCapture, true);
                document.removeEventListener('click', onBubble);
            };
            listenOnDocument(onCapture, true);
            listenOnDocument(onBubble);
        });

        return state;
    };

    /**
     * Runs two open/close cycles of the popup installed by installPopupGuard().
     *
     * @param {object} assert QUnit assert.
     * @param {object} state State returned by installPopupGuard().
     * @param {Function} activate Triggers a click-like event on the passed element.
     * @param {boolean[]} originalTrust Values recorded by observeOriginalTrust().
     * @param {boolean} isTrusted Expected original trust of the opening event.
     */
    const assertPopupCycles = (assert, state, activate, originalTrust, isTrusted) => {
        const target = document.getElementById('target');
        const popup = document.getElementById('popup');
        for (let cycle = 0; cycle < 2; cycle += 1) {
            activate(target);
            assert.strictEqual(originalTrust[cycle], isTrusted, 'Opening event has the expected original trust');
            assert.notOk(popup.hidden, 'Opening event keeps the popup open');
            assert.deepEqual(state.trace.slice(-2), ['open', 'ignore opening'], 'Opening event was ignored');
            if (cycle === 0) {
                assert.strictEqual(state.captureCalls, 0, 'New capture listener misses the opening event');
                assert.strictEqual(state.bubbleCalls, 1, 'New bubble listener receives the opening event');
            }
            activate(document.getElementById('inside'));
            assert.notOk(popup.hidden, 'Inside event keeps the popup open');
            activate(document.getElementById('outside'));
            assert.ok(popup.hidden, 'Outside event closes the popup');
        }
        assert.deepEqual(state.trace, [
            'open', 'ignore opening', 'close', 'open', 'ignore opening', 'close',
        ], 'The popup can complete two open/close cycles');
    };

    hooks.beforeEach(() => {
        beforeEach();
        documentListeners = [];
        createPanel().innerHTML = `
            <div id="root">
                <button type="button" id="target">Open</button>
                <div id="popup" hidden><button id="inside">Inside</button></div>
            </div>
            <button id="outside">Outside</button>
        `;
    });

    hooks.afterEach(() => {
        // Remove document listeners while the helper can still look up their wrappers.
        documentListeners.forEach((remove) => remove());
        afterEach();
    });

    [false, true].forEach((capture) => {
        ['function', 'object'].forEach((kind) => {
            const createListener = (callback) => {
                return kind === 'function' ? callback : { handleEvent: callback };
            };

            test(`remove independently across targets: ${kind}, capture=${capture}`, (assert) => {
                spoofClickEventsIsTrusted();
                const first = new EventTarget();
                const second = new EventTarget();
                let calls = 0;
                const listener = createListener(() => { calls += 1; });
                first.addEventListener('click', listener, capture);
                second.addEventListener('click', listener, { capture });

                first.removeEventListener('click', listener, { capture });
                first.dispatchEvent(new Event('click'));
                assert.strictEqual(calls, 0, 'Removed target no longer invokes the listener');
                second.dispatchEvent(new Event('click'));
                assert.strictEqual(calls, 1, 'Other target remains registered');

                second.removeEventListener('click', listener, capture);
                second.dispatchEvent(new Event('click'));
                assert.strictEqual(calls, 1, 'Other target remains removable');
            });

            test(`duplicate registration after cross-target removal: ${kind}, capture=${capture}`, (assert) => {
                spoofClickEventsIsTrusted();
                const first = new EventTarget();
                const second = new EventTarget();
                let calls = 0;
                const listener = createListener(() => { calls += 1; });
                first.addEventListener('click', listener, capture);
                second.addEventListener('click', listener, capture);
                first.removeEventListener('click', listener, capture);

                second.addEventListener('click', listener, { capture });
                second.dispatchEvent(new Event('click'));
                assert.strictEqual(calls, 1, 'Re-registering the same listener does not duplicate it');
                second.removeEventListener('click', listener, capture);
                second.dispatchEvent(new Event('click'));
                assert.strictEqual(calls, 1, 'Removal leaves no duplicate behind');
            });

            test(`removal from an unrelated target: ${kind}, capture=${capture}`, (assert) => {
                spoofClickEventsIsTrusted();
                const target = new EventTarget();
                const unrelated = new EventTarget();
                let calls = 0;
                const listener = createListener(() => { calls += 1; });
                target.addEventListener('click', listener, capture);

                unrelated.removeEventListener('click', listener, capture);
                target.dispatchEvent(new Event('click'));
                assert.strictEqual(calls, 1, 'Unrelated removal leaves the registration active');
                target.removeEventListener('click', listener, capture);
                target.dispatchEvent(new Event('click'));
                assert.strictEqual(calls, 1, 'The actual registration remains removable');
            });
        });
    });

    test('capture and bubble registrations remain independent', (assert) => {
        spoofClickEventsIsTrusted();
        const target = new EventTarget();
        let calls = 0;
        const listener = () => { calls += 1; };
        target.addEventListener('click', listener, true);
        target.addEventListener('click', listener, false);
        target.dispatchEvent(new Event('click'));
        assert.strictEqual(calls, 2, 'Both capture modes register independently');

        target.removeEventListener('click', listener, { capture: true });
        target.dispatchEvent(new Event('click'));
        assert.strictEqual(calls, 3, 'Removing capture retains the bubble listener');
        target.removeEventListener('click', listener, false);
        target.dispatchEvent(new Event('click'));
        assert.strictEqual(calls, 3, 'Both registrations can be removed');
    });

    test('once and AbortSignal retain native listener lifetime', (assert) => {
        spoofClickEventsIsTrusted();
        const target = new EventTarget();
        const controller = new AbortController();
        let calls = 0;
        const listener = () => { calls += 1; };
        const dispatch = () => {
            target.dispatchEvent(new Event('click'));
        };
        target.addEventListener('click', listener, { once: true, signal: controller.signal });
        dispatch();
        dispatch();
        assert.strictEqual(calls, 1, 'A once listener fires once');

        target.addEventListener('click', listener, { signal: controller.signal });
        dispatch();
        assert.strictEqual(calls, 2, 'A once listener can be registered again');
        controller.abort();
        dispatch();
        assert.strictEqual(calls, 2, 'Abort removes the registered wrapper');

        target.addEventListener('click', listener, { signal: controller.signal });
        dispatch();
        assert.strictEqual(calls, 2, 'An already aborted signal does not register a listener');
        target.addEventListener('click', listener);
        dispatch();
        assert.strictEqual(calls, 3, 'The listener can be registered after signal cleanup');
        target.removeEventListener('click', listener);
        dispatch();
        assert.strictEqual(calls, 3, 'The new registration is removable');
    });

    test('scriptlet-generated clicks share one spoofed event and preserve receivers', (assert) => {
        const done = assert.async();
        const root = document.getElementById('root');
        const target = document.getElementById('target');
        let originalEvent;
        const records = [];
        target.addEventListener('click', (event) => { originalEvent = event; });
        runScriptlet(name, ['#target', '', '50'], false);

        const record = (position, receiver, event) => {
            records.push({
                position,
                receiver,
                event,
                currentTarget: event.currentTarget,
            });
        };
        target.addEventListener('click', function onClick(event) {
            record('target function', this, event);
        });
        const listener = {
            handleEvent(event) { record('target object', this, event); },
        };
        target.addEventListener('click', listener);
        root.addEventListener('click', function onBubble(event) {
            record('root bubble', this, event);
        });
        listenOnDocument(function onDocumentClick(event) {
            record('document bubble', this, event);
        });

        setTimeout(() => {
            assert.strictEqual(originalEvent?.isTrusted, false, 'The generated click was originally untrusted');
            assert.deepEqual(records.map(({ position }) => position), [
                'target function', 'target object', 'root bubble', 'document bubble',
            ], 'All listener positions received the click');
            const delivered = records[0]?.event;
            assert.strictEqual(delivered?.isTrusted, true, 'Wrapped listeners receive spoofed trust');
            assert.notStrictEqual(delivered, originalEvent, 'The spoofed event proxies the original one');
            const receivers = [target, listener, root, document];
            const currentTargets = [target, target, root, document];
            records.forEach((entry, index) => {
                assert.strictEqual(entry.event, delivered, `${entry.position}: same spoofed event`);
                assert.strictEqual(entry.receiver, receivers[index], `${entry.position}: correct receiver`);
                assert.strictEqual(
                    entry.currentTarget,
                    currentTargets[index],
                    `${entry.position}: native currentTarget is accessible through the proxy`,
                );
            });
            done();
        }, 250);
    });

    test('every event of a scriptlet click is spoofed and shared by its handlers', (assert) => {
        const done = assert.async();
        const target = document.getElementById('target');
        const eventTypes = [
            'pointerover',
            'pointerenter',
            'mouseover',
            'mouseenter',
            'pointerdown',
            'mousedown',
            'pointerup',
            'mouseup',
            'click',
        ];
        const originals = new Map();
        const received = new Map();
        eventTypes.forEach((type) => {
            target.addEventListener(type, (event) => { originals.set(type, event); });
        });
        runScriptlet(name, ['#target', '', '50'], false);
        eventTypes.forEach((type) => {
            const record = (event) => {
                received.set(type, (received.get(type) || []).concat(event));
            };
            target.addEventListener(type, record);
            target.addEventListener(type, { handleEvent: record });
            target[`on${type}`] = record;
        });

        setTimeout(() => {
            assert.deepEqual([...received.keys()], eventTypes, 'All events were dispatched in order');
            eventTypes.forEach((type) => {
                const events = received.get(type) || [];
                assert.strictEqual(events.length, 3, `${type}: function, object and inline handlers were called`);
                assert.strictEqual(originals.get(type)?.isTrusted, false, `${type}: original event is untrusted`);
                assert.ok(events.every((event) => event.isTrusted), `${type}: handlers receive spoofed trust`);
                assert.ok(events.every((event) => event === events[0]), `${type}: handlers share one event`);
                assert.notStrictEqual(events[0], originals.get(type), `${type}: spoofed event proxies the original`);
            });
            done();
        }, 250);
    });

    /**
     * Makes the label forward clicks to its control as untrusted events, as some browsers do, e.g. Firefox.
     * Others forward them as trusted, e.g. the Chrome version which Puppeteer runs the tests in,
     * so the spoofing of forwarded clicks would not be tested there otherwise.
     * The control is resolved on the click, as browsers do, so it may be changed by page handlers before.
     * Unlike browsers, which forward the click after its propagation, it is forwarded from the label listener.
     *
     * @param {HTMLLabelElement} label Label which forwards clicks.
     */
    const forwardUntrustedLabelClicks = (label) => {
        nativeAddEventListener.call(label, 'click', (event) => {
            const { control } = label;
            // Clicks forwarded to the control bubble up to the label as well
            if (!control || event.target === control) {
                return;
            }
            event.preventDefault();
            control.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }));
        });
    };

    [
        {
            description: 'a label with the for attribute',
            html: '<label id="clicked" for="control">Label</label><input type="checkbox" id="control">',
        },
        {
            description: 'an element inside a label',
            html: '<label><span id="clicked">Label</span><input type="checkbox" id="control"></label>',
        },
    ].forEach(({ description, html }) => {
        test(`click forwarded from ${description} to its control is spoofed`, (assert) => {
            const done = assert.async();
            document.getElementById('root').insertAdjacentHTML('beforeend', html);
            const clicked = document.getElementById('clicked');
            const control = document.getElementById('control');
            forwardUntrustedLabelClicks(document.querySelector('#root label'));
            const observed = [];
            const received = [];
            control.addEventListener('click', (event) => { observed.push(event); });
            runScriptlet(name, ['#clicked', '', '50'], false);
            control.addEventListener('click', (event) => { received.push(event); });

            setTimeout(() => {
                assert.strictEqual(received.length, 1, 'Control listener receives the forwarded click');
                assert.ok(received[0]?.isTrusted, 'Forwarded click is trusted');
                assert.ok(control.checked, 'Forwarded click checks the control');
                clicked.click();
                assert.strictEqual(received[1], observed[1], 'Forwarded page click is passed through unchanged');
                done();
            }, 250);
        });
    });

    ['document', 'open', 'closed'].forEach((mode) => {
        test(`click forwarded untrusted from a label is spoofed for all listeners: ${mode} tree`, (assert) => {
            const done = assert.async();
            runScriptlet(name, [mode === 'document' ? '#clicked' : '#host >>> #clicked', '', '50'], false);
            const host = document.createElement('div');
            host.id = 'host';
            document.getElementById('root').append(host);
            const tree = mode === 'document' ? host : host.attachShadow({ mode });
            tree.innerHTML = '<label id="clicked"><input type="checkbox"></label>';
            const control = tree.querySelector('input');
            forwardUntrustedLabelClicks(tree.querySelector('#clicked'));
            // Page listeners registered after the scriptlet: before, at and after the control in the event path.
            // Outside the shadow tree, both clicks target the shadow host.
            const trust = { window: [], control: [], document: [] };
            const onWindowClick = (event) => { trust.window.push(event.isTrusted); };
            window.addEventListener('click', onWindowClick, true);
            documentListeners.push(() => window.removeEventListener('click', onWindowClick, true));
            control.addEventListener('click', (event) => { trust.control.push(event.isTrusted); });
            listenOnDocument((event) => { trust.document.push(event.isTrusted); });

            setTimeout(() => {
                assert.deepEqual(trust, {
                    window: [true, true],
                    control: [true],
                    document: [true, true],
                }, 'The scriptlet click and the click forwarded from it are trusted for all listeners');
                assert.ok(control.checked, 'Forwarded click checks the control');
                done();
            }, 250);
        });
    });

    ['open', 'closed'].forEach((mode) => {
        test(`click forwarded untrusted from a label containing a shadow host is spoofed: ${mode} tree`, (assert) => {
            const done = assert.async();
            document.getElementById('root').insertAdjacentHTML(
                'beforeend',
                '<label id="label"><div id="host"></div><input type="checkbox" id="control"></label>',
            );
            // Clicked element is inside a shadow tree, so the label is not its ancestor in that tree
            runScriptlet(name, ['#host >>> #clicked', '', '50'], false);
            document.getElementById('host').attachShadow({ mode }).innerHTML = '<span id="clicked">Label</span>';
            const label = document.getElementById('label');
            const control = document.getElementById('control');
            forwardUntrustedLabelClicks(label);
            const trust = [];
            control.addEventListener('click', (event) => { trust.push(event.isTrusted); });

            setTimeout(() => {
                assert.deepEqual(trust, [true], 'Click forwarded to the control is trusted');
                assert.ok(control.checked, 'Forwarded click checks the control');
                done();
            }, 250);
        });
    });

    test('click forwarded untrusted from a label wrapping the slot of the clicked element is spoofed', (assert) => {
        const done = assert.async();
        // Checkbox web component: its light DOM text is slotted into a label inside its shadow tree.
        // Slots of closed shadow roots are not exposed, so only an open one is supported.
        document.getElementById('root').insertAdjacentHTML(
            'beforeend',
            '<div id="host"><span id="clicked">Accept</span></div>',
        );
        const shadowRoot = document.getElementById('host').attachShadow({ mode: 'open' });
        shadowRoot.innerHTML = '<label id="label"><input type="checkbox" id="control"><slot></slot></label>';
        const control = shadowRoot.getElementById('control');
        forwardUntrustedLabelClicks(shadowRoot.getElementById('label'));
        runScriptlet(name, ['#clicked', '', '50'], false);
        const trust = [];
        control.addEventListener('click', (event) => { trust.push(event.isTrusted); });

        setTimeout(() => {
            assert.deepEqual(trust, [true], 'Click forwarded to the control is trusted');
            assert.ok(control.checked, 'Forwarded click checks the control');
            done();
        }, 250);
    });

    test('click forwarded untrusted from a label is spoofed if the clicked element is replaced', (assert) => {
        const done = assert.async();
        document.getElementById('root').insertAdjacentHTML(
            'beforeend',
            '<label id="label"><span id="clicked">Accept</span><input type="checkbox" id="control"></label>',
        );
        const clicked = document.getElementById('clicked');
        const control = document.getElementById('control');
        // Page re-renders on click, so the clicked element is not in the label when the label forwards the click
        nativeAddEventListener.call(clicked, 'click', () => {
            const rendered = document.createElement('span');
            rendered.textContent = 'Accept';
            clicked.replaceWith(rendered);
        });
        forwardUntrustedLabelClicks(document.getElementById('label'));
        runScriptlet(name, ['#clicked', '', '50'], false);
        const trust = [];
        control.addEventListener('click', (event) => { trust.push(event.isTrusted); });

        setTimeout(() => {
            assert.deepEqual(trust, [true], 'Click forwarded to the control is trusted');
            assert.ok(control.checked, 'Forwarded click checks the control');
            done();
        }, 250);
    });

    test('click forwarded untrusted to a control is spoofed for the inline handler of the clicked label', (assert) => {
        const done = assert.async();
        document.getElementById('root').insertAdjacentHTML(
            'beforeend',
            '<label id="clicked">Accept <input type="checkbox" id="control"></label>',
        );
        const label = document.getElementById('clicked');
        const control = document.getElementById('control');
        // Click forwarded to the control bubbles up to the clicked label,
        // before it reaches any listener which would spoof it
        const inline = [];
        label.onclick = (event) => { inline.push(event); };
        forwardUntrustedLabelClicks(label);
        runScriptlet(name, ['#clicked', '', '50'], false);
        const received = [];
        listenOnDocument((event) => { received.push(event); });

        setTimeout(() => {
            const inlineForwarded = inline.filter((event) => event.target === control);
            const receivedForwarded = received.filter((event) => event.target === control);
            assert.strictEqual(inlineForwarded.length, 1, 'Inline handler receives the forwarded click');
            assert.ok(inlineForwarded[0]?.isTrusted, 'Forwarded click is trusted for the inline handler');
            assert.strictEqual(inlineForwarded[0], receivedForwarded[0], 'Inline handler and listeners share it');
            done();
        }, 250);
    });

    test('page click on the clicked control inside a label is not spoofed', (assert) => {
        const done = assert.async();
        document.getElementById('root').insertAdjacentHTML(
            'beforeend',
            '<label id="label"><input type="checkbox" id="clicked"> Accept</label>',
        );
        const control = document.getElementById('clicked');
        // The label does not forward a click on its control,
        // so a click which the page dispatches on the control in response is its own
        let isPageClickDispatched = false;
        nativeAddEventListener.call(control, 'click', () => {
            if (!isPageClickDispatched) {
                isPageClickDispatched = true;
                control.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            }
        });
        runScriptlet(name, ['#clicked', '', '50'], false);
        const trust = [];
        control.addEventListener('click', (event) => { trust.push(event.isTrusted); });

        setTimeout(() => {
            // Page click is dispatched from an earlier listener, so it arrives before the scriptlet click
            assert.deepEqual(trust, [false, true], 'Only the scriptlet click is trusted');
            done();
        }, 250);
    });

    [
        {
            description: 'changes the label for attribute',
            changeControl: (label) => {
                label.htmlFor = 'other-control';
            },
        },
        {
            description: 'replaces the control',
            changeControl: (label, control) => {
                const rendered = document.createElement('input');
                rendered.type = 'checkbox';
                control.replaceWith(rendered);
                rendered.id = 'control';
            },
        },
    ].forEach(({ description, changeControl }) => {
        ['', 'isTrusted:all'].forEach((extraMatch) => {
            const mode = extraMatch || 'default';
            const title = 'forwarded click is spoofed for delegated listener'
                + ` if control handler ${description}: ${mode}`;
            test(title, (assert) => {
                const done = assert.async();
                document.getElementById('root').insertAdjacentHTML('beforeend', `
                    <label id="clicked" for="control">Label</label>
                    <input type="checkbox" id="control">
                    <input type="checkbox" id="other-control">
                `);
                const label = document.getElementById('clicked');
                const control = document.getElementById('control');
                // Control re-renders on its own click, before a delegated listener, e.g. of a framework, receives it.
                // Inline handler of the control is not hooked, so it runs before any hooked listener.
                control.onclick = () => changeControl(label, control);
                forwardUntrustedLabelClicks(label);
                runScriptlet(name, ['#clicked', extraMatch, '50'], false);
                const forwarded = [];
                listenOnDocument((event) => {
                    if (event.target === control) {
                        forwarded.push(event.isTrusted);
                    }
                });

                setTimeout(() => {
                    assert.deepEqual(forwarded, [true], 'Delegated listener receives the forwarded click as trusted');
                    done();
                }, 250);
            });
        });
    });

    test('click forwarded untrusted from a label which the clicked element is moved into is spoofed', (assert) => {
        const done = assert.async();
        document.getElementById('root').insertAdjacentHTML('beforeend', `
            <span id="clicked">Accept</span>
            <label id="label"><input type="checkbox" id="control"></label>
        `);
        const clicked = document.getElementById('clicked');
        const label = document.getElementById('label');
        const control = document.getElementById('control');
        // Page re-renders on mousedown, so the clicked element is in the label when the click is dispatched
        nativeAddEventListener.call(clicked, 'mousedown', () => { label.prepend(clicked); });
        forwardUntrustedLabelClicks(label);
        runScriptlet(name, ['#clicked', '', '50'], false);
        const trust = [];
        control.addEventListener('click', (event) => { trust.push(event.isTrusted); });

        setTimeout(() => {
            assert.deepEqual(trust, [true], 'Click forwarded to the control is trusted');
            assert.ok(control.checked, 'Forwarded click checks the control');
            done();
        }, 250);
    });

    test('page click on another element in the shadow tree of the control is not spoofed', (assert) => {
        const done = assert.async();
        document.getElementById('root').insertAdjacentHTML(
            'beforeend',
            '<div id="host"><span id="clicked">Accept</span></div>',
        );
        const host = document.getElementById('host');
        const shadowRoot = host.attachShadow({ mode: 'open' });
        shadowRoot.innerHTML = '<label id="label"><input type="checkbox" id="control"><slot></slot></label>'
            + '<span id="ripple"></span>';
        const label = shadowRoot.getElementById('label');
        const control = shadowRoot.getElementById('control');
        const ripple = shadowRoot.getElementById('ripple');
        // Component dispatches its own click on another element of its shadow tree during the scriptlet click.
        // Outside the shadow tree, it targets the shadow host, as the click forwarded to the control does.
        nativeAddEventListener.call(label, 'click', (event) => {
            if (event.target !== control) {
                ripple.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
            }
        });
        forwardUntrustedLabelClicks(label);
        const rippleClicks = [];
        nativeAddEventListener.call(ripple, 'click', (event) => { rippleClicks.push(event); });
        runScriptlet(name, ['#clicked', '', '50'], false);
        const outside = [];
        host.addEventListener('click', (event) => { outside.push(event); });
        const trust = [];
        control.addEventListener('click', (event) => { trust.push(event.isTrusted); });

        setTimeout(() => {
            assert.strictEqual(rippleClicks.length, 1, 'Component dispatches its own click');
            assert.ok(outside.includes(rippleClicks[0]), 'Own click is passed unchanged outside the shadow tree');
            assert.deepEqual(trust, [true], 'Click forwarded to the control is trusted');
            done();
        }, 250);
    });

    [
        // Listeners outside the closed shadow root see its host as the origin of both clicks,
        // so they cannot be told apart from the click forwarded to the control
        { description: 'an element of the closed shadow root of the control', targetId: 'inner', isSpoofed: true },
        { description: 'the host of the closed shadow root of the control', targetId: 'closed-host', isSpoofed: true },
        // Listeners which see the host of an open shadow root see the host of the closed one inside it as well
        { description: 'the host of an open shadow root above it', targetId: 'open-host', isSpoofed: false },
        { description: 'an element of an open shadow root above it', targetId: 'sibling', isSpoofed: false },
    ].forEach(({ description, targetId, isSpoofed }) => {
        test(`page click on ${description} during the scriptlet click is spoofed: ${isSpoofed}`, (assert) => {
            const done = assert.async();
            runScriptlet(name, ['#open-host >>> #closed-host >>> #clicked', '', '50'], false);
            const openHost = document.createElement('div');
            openHost.id = 'open-host';
            document.getElementById('root').append(openHost);
            const openRoot = openHost.attachShadow({ mode: 'open' });
            openRoot.innerHTML = '<div id="closed-host"></div><span id="sibling"></span>';
            const closedHost = openRoot.getElementById('closed-host');
            const closedRoot = closedHost.attachShadow({ mode: 'closed' });
            closedRoot.innerHTML = '<label id="label"><span id="clicked">Accept</span>'
                + '<input type="checkbox" id="control"></label><span id="inner"></span>';
            const targets = {
                inner: closedRoot.getElementById('inner'),
                'closed-host': closedHost,
                'open-host': openHost,
                sibling: openRoot.getElementById('sibling'),
            };
            const label = closedRoot.getElementById('label');
            const clicked = closedRoot.getElementById('clicked');
            const pageClick = new MouseEvent('click', { bubbles: true, composed: true });
            let pageClickCount = 0;
            let isDispatchingPageClick = false;
            // Page dispatches its own click in response to the scriptlet click
            nativeAddEventListener.call(label, 'click', (event) => {
                if (event.target !== clicked || pageClickCount > 0) {
                    return;
                }
                pageClickCount += 1;
                isDispatchingPageClick = true;
                targets[targetId].dispatchEvent(pageClick);
                isDispatchingPageClick = false;
            });
            const received = [];
            listenOnDocument((event) => {
                if (isDispatchingPageClick) {
                    received.push(event);
                }
            });

            setTimeout(() => {
                assert.strictEqual(pageClickCount, 1, 'Page dispatches its own click');
                assert.strictEqual(received.length, 1, 'Page click reaches the document listener');
                assert.strictEqual(received[0].isTrusted, isSpoofed, 'Page click is spoofed only if indistinguishable');
                assert.strictEqual(received[0] === pageClick, !isSpoofed, 'Page click is passed unchanged otherwise');
                done();
            }, 250);
        });
    });

    test('click forwarded untrusted from a label is spoofed without composedPath() and getRootNode()', (assert) => {
        const done = assert.async();
        // Firefox 52 supports neither of them, nor shadow DOM
        const removedMethods = [
            { prototype: Event.prototype, property: 'composedPath' },
            { prototype: Node.prototype, property: 'getRootNode' },
        ].map(({ prototype, property }) => {
            const descriptor = Object.getOwnPropertyDescriptor(prototype, property);
            delete prototype[property];
            return { prototype, property, descriptor };
        });
        const restoreMethods = () => {
            removedMethods.forEach(({ prototype, property, descriptor }) => {
                Object.defineProperty(prototype, property, descriptor);
            });
        };
        // Restored on a setup error as well, as other tests use them
        let trust;
        let control;
        let otherClicks;
        try {
            document.getElementById('root').insertAdjacentHTML('beforeend', `
                <label id="label"><span id="clicked">Accept</span><input type="checkbox" id="control"></label>
                <span id="other"></span>
            `);
            const label = document.getElementById('label');
            control = document.getElementById('control');
            const other = document.getElementById('other');
            // Page dispatches its own click on another element during the scriptlet click,
            // which is checked for being forwarded to the control as well
            nativeAddEventListener.call(label, 'click', (event) => {
                if (event.target !== control) {
                    other.click();
                }
            });
            forwardUntrustedLabelClicks(label);
            runScriptlet(name, ['#clicked', '', '50'], false);
            trust = [];
            control.addEventListener('click', (event) => { trust.push(event.isTrusted); });
            otherClicks = [];
            other.addEventListener('click', (event) => { otherClicks.push(event.isTrusted); });
        } catch (error) {
            restoreMethods();
            throw error;
        }

        setTimeout(() => {
            restoreMethods();
            assert.deepEqual(trust, [true], 'Click forwarded to the control is trusted');
            assert.ok(control.checked, 'Forwarded click checks the control');
            assert.deepEqual(otherClicks, [false], 'Page click on another element is passed unchanged');
            done();
        }, 250);
    });

    ['mousedown', 'click'].forEach((eventType) => {
        test(`click forwarded untrusted to a control changed by a page ${eventType} handler is spoofed`, (assert) => {
            const done = assert.async();
            document.getElementById('root').insertAdjacentHTML('beforeend', `
                <label id="clicked" for="old-control">Label</label>
                <input type="checkbox" id="old-control">
                <input type="checkbox" id="control">
            `);
            const label = document.getElementById('clicked');
            const oldControl = document.getElementById('old-control');
            const control = document.getElementById('control');
            // Page re-renders on the event, so the label forwards the click to another control
            nativeAddEventListener.call(label, eventType, () => { label.htmlFor = 'control'; });
            forwardUntrustedLabelClicks(label);
            runScriptlet(name, ['#clicked', '', '50'], false);
            const trust = [];
            control.addEventListener('click', (event) => { trust.push(event.isTrusted); });

            setTimeout(() => {
                assert.deepEqual(trust, [true], 'Click forwarded to the new control is trusted');
                assert.ok(control.checked, 'Forwarded click checks the new control');
                assert.notOk(oldControl.checked, 'Old control is not clicked');
                done();
            }, 250);
        });
    });

    test('inline handlers share the spoofed event and can set event properties', (assert) => {
        const done = assert.async();
        const target = document.getElementById('target');
        let originalEvent;
        let listenerEvent;
        let inlineEvent;
        let inlineError = null;
        let documentClicks = 0;
        target.addEventListener('click', (event) => { originalEvent = event; });
        runScriptlet(name, ['#target', '', '50'], false);
        target.addEventListener('click', (event) => { listenerEvent = event; });
        target.onclick = (event) => {
            inlineEvent = event;
            try {
                event.returnValue = false;
                event.cancelBubble = true;
            } catch (error) {
                inlineError = error;
            }
        };
        listenOnDocument(() => { documentClicks += 1; });

        setTimeout(() => {
            assert.strictEqual(inlineError, null, 'Setting event properties does not throw');
            assert.strictEqual(inlineEvent?.isTrusted, true, 'Inline handler receives spoofed trust');
            assert.strictEqual(inlineEvent, listenerEvent, 'Inline handler and listener receive the same event');
            assert.ok(originalEvent?.defaultPrevented, 'returnValue reaches the original event');
            assert.strictEqual(documentClicks, 0, 'cancelBubble stops propagation');
            done();
        }, 250);
    });

    test('page clicks on the scriptlet-clicked element are not spoofed', (assert) => {
        const done = assert.async();
        const target = document.getElementById('target');
        const received = [];
        runScriptlet(name, ['#target', '', '50'], false);
        target.addEventListener('click', (event) => {
            received.push({ event, currentEvent: window.event });
        });
        // The page reacts to the scriptlet's mousedown with its own click.
        target.addEventListener('mousedown', () => target.click(), { once: true });

        setTimeout(() => {
            target.click();
            assert.deepEqual(
                received.map(({ event }) => event.isTrusted),
                [false, true, false],
                'Only the scriptlet click is spoofed',
            );
            [received[0], received[2]].forEach(({ event, currentEvent }, index) => {
                assert.strictEqual(event, currentEvent, `Page click ${index + 1} matches window.event`);
            });
            done();
        }, 250);
    });

    test('trusted browser events retain original identity throughout propagation', (assert) => {
        useTrustedFocusEvents();
        const root = document.getElementById('root');
        const target = document.getElementById('target');
        let originalEvent;
        const positions = [];
        listenOnDocument((event) => {
            if (event.target === target) {
                originalEvent = event;
            }
        }, true);
        spoofClickEventsIsTrusted();

        const record = (position, receiver, expectedReceiver, event, expectedTarget) => {
            if (event.target !== target) {
                return;
            }
            positions.push(position);
            assert.strictEqual(originalEvent.isTrusted, true, `${position}: original event is trusted`);
            assert.strictEqual(event, originalEvent, `${position}: original identity is preserved`);
            assert.strictEqual(event, window.event, `${position}: identity matches window.event`);
            assert.strictEqual(receiver, expectedReceiver, `${position}: correct receiver`);
            assert.strictEqual(event.currentTarget, expectedTarget, `${position}: correct currentTarget`);
        };
        root.addEventListener('click', function onCapture(event) {
            record('root capture', this, root, event, root);
        }, true);
        target.addEventListener('click', function onClick(event) {
            record('target function', this, target, event, target);
        });
        const listener = {
            handleEvent(event) {
                record('target object', this, listener, event, target);
            },
        };
        target.addEventListener('click', listener);
        root.addEventListener('click', function onBubble(event) {
            record('root bubble', this, root, event, root);
        });
        listenOnDocument(function onDocumentClick(event) {
            record('document bubble', this, document, event, document);
        });

        // The observer registered before the hook proves trust without relying on the spoofed argument.
        target.focus();
        assert.deepEqual(positions, [
            'root capture', 'target function', 'target object', 'root bubble', 'document bubble',
        ], 'All listener positions received the same trusted browser event');
    });

    ['argument', 'window.event'].forEach((savedEvent) => {
        [false, true].forEach((enabled) => {
            test(`popup opening guard: ${savedEvent}, trust hook=${enabled}`, (assert) => {
                useTrustedFocusEvents();
                const originalTrust = observeOriginalTrust();
                if (enabled) {
                    spoofClickEventsIsTrusted();
                }
                const state = installPopupGuard(assert, savedEvent);
                assertPopupCycles(assert, state, (element) => element.focus(), originalTrust, true);
            });
        });

        test(`popup opening guard with page clicks: ${savedEvent}`, (assert) => {
            const originalTrust = observeOriginalTrust();
            // A selector that never matches installs the hook without the scriptlet clicking anything.
            runScriptlet(name, ['#never-matches', '', '', '', '1'], false);
            const state = installPopupGuard(assert, savedEvent);
            assertPopupCycles(assert, state, (element) => element.click(), originalTrust, false);
        });
    });

    test('popup opened by a scriptlet click ignores its opening event saved from the argument', (assert) => {
        const done = assert.async();
        const popup = document.getElementById('popup');
        runScriptlet(name, ['#target', '', '50'], false);
        const state = installPopupGuard(assert, 'argument');

        setTimeout(() => {
            assert.notOk(popup.hidden, 'Scriptlet click keeps the popup open');
            assert.deepEqual(state.trace, ['open', 'ignore opening'], 'Opening event was ignored');
            document.getElementById('inside').click();
            assert.notOk(popup.hidden, 'Inside click keeps the popup open');
            document.getElementById('outside').click();
            assert.ok(popup.hidden, 'Outside click closes the popup');
            done();
        }, 250);
    });
});

module(`${name} - isTrusted:all`, { beforeEach, afterEach });

// Event types which are spoofed, and their constructors
const SPOOFED_EVENT_TYPES = [
    { type: 'pointerover', EventConstructor: PointerEvent },
    { type: 'pointerenter', EventConstructor: PointerEvent },
    { type: 'mouseover', EventConstructor: MouseEvent },
    { type: 'mouseenter', EventConstructor: MouseEvent },
    { type: 'pointerdown', EventConstructor: PointerEvent },
    { type: 'mousedown', EventConstructor: MouseEvent },
    { type: 'pointerup', EventConstructor: PointerEvent },
    { type: 'mouseup', EventConstructor: MouseEvent },
    { type: 'click', EventConstructor: MouseEvent },
];

/**
 * Creates the panel with an element for the scriptlet to click and another element of the page,
 * with ids not used by other tests, as their scriptlets may still wait for elements.
 *
 * @returns {{target: HTMLButtonElement, other: HTMLDivElement}} Element to click and another element.
 */
const createTrustedAllFixture = () => {
    const panel = createPanel();
    const target = document.createElement('button');
    target.id = 'trusted-all-target';
    const other = document.createElement('div');
    other.id = 'trusted-all-other';
    panel.append(target, other);
    return { target, other };
};

const TRUSTED_ALL_SELECTOR = `#${PANEL_ID} > #trusted-all-target`;

test('page events of all spoofed types are trusted', (assert) => {
    const { other } = createTrustedAllFixture();
    runScriptlet(name, [TRUSTED_ALL_SELECTOR, 'isTrusted:all']);
    const received = {};
    [...SPOOFED_EVENT_TYPES.map(({ type }) => type), 'dblclick'].forEach((type) => {
        other.addEventListener(type, (event) => { received[type] = event.isTrusted; });
    });

    SPOOFED_EVENT_TYPES.forEach(({ type, EventConstructor }) => {
        other.dispatchEvent(new EventConstructor(type, { bubbles: true }));
    });
    // Other types are not spoofed
    other.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

    const expected = Object.fromEntries(SPOOFED_EVENT_TYPES.map(({ type }) => [type, true]));
    expected.dblclick = false;
    assert.deepEqual(received, expected, 'Events of spoofed types are trusted, others are not');
});

test('page click is trusted for all kinds of listeners, which share one proxy', (assert) => {
    const { other } = createTrustedAllFixture();
    runScriptlet(name, [TRUSTED_ALL_SELECTOR, 'isTrusted:all']);
    const received = [];
    const onWindowClick = (event) => { received.push(event); };
    const documentListener = { handleEvent: (event) => { received.push(event); } };
    window.addEventListener('click', onWindowClick, true);
    document.addEventListener('click', documentListener);
    other.addEventListener('click', (event) => { received.push(event); }, { capture: true });
    other.addEventListener('click', (event) => {
        received.push(event);
        event.preventDefault();
    });

    const original = new MouseEvent('click', { bubbles: true, cancelable: true });
    other.dispatchEvent(original);
    window.removeEventListener('click', onWindowClick, true);
    document.removeEventListener('click', documentListener);

    assert.strictEqual(received.length, 4, 'All listeners receive the click');
    assert.ok(received.every((event) => event.isTrusted), 'All listeners receive a trusted click');
    assert.ok(received.every((event) => event === received[0]), 'All listeners receive the same proxy');
    assert.ok(received[0] instanceof MouseEvent, 'Proxy keeps the event type');
    assert.strictEqual(received[0].target, other, 'Proxy keeps the target');
    assert.notOk(original.isTrusted, 'Original event stays untrusted');
    assert.ok(original.defaultPrevented, 'Proxy cancels the original event');
});

test('page click dispatched after the scriptlet has clicked is trusted', (assert) => {
    const done = assert.async();
    const { target, other } = createTrustedAllFixture();
    runScriptlet(name, [TRUSTED_ALL_SELECTOR, 'isTrusted:all', '50']);
    // Registered after the scriptlet hooks addEventListener, but before its delayed click
    const scriptletClicks = [];
    target.addEventListener('click', (event) => { scriptletClicks.push(event.isTrusted); });
    const pageClicks = [];
    other.addEventListener('click', (event) => { pageClicks.push(event.isTrusted); });

    setTimeout(() => {
        // The scriptlet has clicked and finished, but spoofing stays enabled for the page
        other.click();
        assert.deepEqual(scriptletClicks, [true], 'Scriptlet click is trusted');
        assert.deepEqual(pageClicks, [true], 'Later page click is trusted');
        assert.strictEqual(window.hit, 'FIRED', 'hit func executed');
        done();
    }, 200);
});

test('page click is trusted if another rule has installed the hook without isTrusted:all', (assert) => {
    const { other } = createTrustedAllFixture();
    const pageClicks = [];
    // First rule installs the hook with the default spoofing
    runScriptlet(name, [`#${PANEL_ID} > #trusted-all-never-matches`]);
    other.addEventListener('click', (event) => { pageClicks.push(event.isTrusted); });
    other.click();

    // Second rule enables spoofing of all events for the whole page
    runScriptlet(name, [TRUSTED_ALL_SELECTOR, 'isTrusted:all']);
    other.click();

    assert.deepEqual(pageClicks, [false, true], 'Page click is trusted only after isTrusted:all is enabled');
});

test('page events are not spoofed for earlier listeners and inline handlers', (assert) => {
    const { target, other } = createTrustedAllFixture();
    const received = {
        earlier: [],
        inline: [],
        clickedInline: [],
        later: [],
    };
    // Registered before the scriptlet hooks addEventListener
    other.addEventListener('click', (event) => { received.earlier.push(event.isTrusted); });
    other.onclick = (event) => { received.inline.push(event.isTrusted); };
    // Inline handler of the clicked element is wrapped only for the click of the scriptlet
    target.onclick = (event) => { received.clickedInline.push(event.isTrusted); };
    runScriptlet(name, [TRUSTED_ALL_SELECTOR, 'isTrusted:all']);
    other.addEventListener('click', (event) => { received.later.push(event.isTrusted); });

    other.click();
    target.click();

    assert.deepEqual(received, {
        earlier: [false],
        inline: [false],
        clickedInline: [true, false],
        later: [true],
    }, 'Only listeners registered after the scriptlet receive a trusted page click');
});

test('page click on the clicked element reaches its inline handler as the same trusted proxy', (assert) => {
    const done = assert.async();
    const { target } = createTrustedAllFixture();
    const inline = [];
    let isPageClickDispatched = false;
    // Inline handler is registered before the listener, so it receives the page click first
    target.onclick = (event) => {
        inline.push(event);
        if (!isPageClickDispatched) {
            isPageClickDispatched = true;
            target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }
    };
    runScriptlet(name, [TRUSTED_ALL_SELECTOR, 'isTrusted:all', '50']);
    const received = [];
    target.addEventListener('click', (event) => { received.push(event); });

    setTimeout(() => {
        // Page click is dispatched from the inline handler, so the listener receives it before the scriptlet click
        assert.strictEqual(inline.length, 2, 'Inline handler receives the scriptlet click and the page click');
        assert.ok(inline.every((event) => event.isTrusted), 'Inline handler receives trusted clicks');
        assert.strictEqual(inline[1], received[0], 'Inline handler and listener receive the same page click');
        done();
    }, 200);
});

const TRUSTED_ALL_COOKIE = 'adg-trusted-all-cookie';
const TRUSTED_ALL_ITEM = 'adg-trusted-all-item';

[
    { extraMatch: 'containsText:Accept, isTrusted:all', isClicked: true, isPageClickTrusted: true },
    { extraMatch: 'isTrusted:all, containsText:Accept', isClicked: true, isPageClickTrusted: true },
    { extraMatch: `cookie:${TRUSTED_ALL_COOKIE}, isTrusted:all`, isClicked: true, isPageClickTrusted: true },
    { extraMatch: `isTrusted:all, localStorage:${TRUSTED_ALL_ITEM}`, isClicked: true, isPageClickTrusted: true },
    {
        extraMatch: `cookie:${TRUSTED_ALL_COOKIE}, localStorage:${TRUSTED_ALL_ITEM}`
            + ', containsText:Accept, isTrusted:all',
        isClicked: true,
        isPageClickTrusted: true,
    },
    // Scriptlet exits before installing the hook, so isTrusted:all is not enabled
    { extraMatch: 'cookie:adg-never-set-cookie, isTrusted:all', isClicked: false, isPageClickTrusted: false },
    { extraMatch: 'isTrusted:all, localStorage:adg-never-set-item', isClicked: false, isPageClickTrusted: false },
    // Element is not clicked, as its text does not match, but isTrusted:all is enabled once the scriptlet runs
    { extraMatch: 'containsText:Reject, isTrusted:all', isClicked: false, isPageClickTrusted: true },
    // Invalid value is logged and the default is used, while other conditions are still applied
    {
        extraMatch: 'containsText:Accept, isTrusted:any',
        isClicked: true,
        isPageClickTrusted: false,
        logged: [`${name}: Passed isTrusted value 'isTrusted:any' is invalid`],
    },
].forEach(({
    extraMatch,
    isClicked,
    isPageClickTrusted,
    logged = [],
}) => {
    test(`isTrusted combined with other extraMatch conditions: '${extraMatch}'`, (assert) => {
        const done = assert.async();
        document.cookie = `${TRUSTED_ALL_COOKIE}=1; path=/`;
        window.localStorage.setItem(TRUSTED_ALL_ITEM, '1');
        const { target, other } = createTrustedAllFixture();
        target.textContent = 'Accept';

        const loggedMessages = getSyncLogs(() => runScriptlet(name, [TRUSTED_ALL_SELECTOR, extraMatch, '50']));
        // Registered after the scriptlet hooks addEventListener, but before its delayed click
        const targetClicks = [];
        target.addEventListener('click', (event) => { targetClicks.push(event.isTrusted); });
        const pageClicks = [];
        other.addEventListener('click', (event) => { pageClicks.push(event.isTrusted); });

        setTimeout(() => {
            other.click();
            clearCookie(TRUSTED_ALL_COOKIE);
            window.localStorage.removeItem(TRUSTED_ALL_ITEM);

            assert.deepEqual(loggedMessages, logged, 'Only an invalid value is logged');
            assert.deepEqual(targetClicks, isClicked ? [true] : [], 'Element is clicked only if all conditions match');
            assert.deepEqual(pageClicks, [isPageClickTrusted], 'Page click is trusted only with isTrusted:all');
            done();
        }, 200);
    });
});
