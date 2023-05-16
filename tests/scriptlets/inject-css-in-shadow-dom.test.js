/* eslint-disable no-underscore-dangle, no-console */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'inject-css-in-shadow-dom';

const nativeAttachShadow = window.Element.prototype.attachShadow;
const nativeConsole = console.log;

const TARGET_ID1 = 'target1';
const CSS_TEXT1 = `#${TARGET_ID1} { color: rgb(255, 0, 0)  !important }`;
const CSS_TEXT2 = `#${TARGET_ID1} { background: lightblue url("https://www.w3schools.com/cssref/img_tree.gif"); }  !important }`;
const CSS_TEXT3 = `#${TARGET_ID1} { background:image-set("https://www.w3schools.com/cssref/img_tree.gif") !important }`;
const INVALID_CSS_TEXT = `#${TARGET_ID1} { color: rgb(255, 0, 0) } !important`;
const HOST_ID1 = 'host1';
const HOST_ID2 = 'host2';

const appendTarget = (parent, id) => {
    const target = document.createElement('div');
    target.id = id;
    target.innerText = id;
    return parent.appendChild(target);
};

const appendHost = (id) => {
    const host = document.createElement('div');
    host.id = id;
    return document.body.appendChild(host);
};

const removeHosts = () => {
    const hostIds = [HOST_ID1, HOST_ID2];
    hostIds.forEach((id) => {
        const host = document.getElementById(id);
        if (host) {
            host.remove();
        }
    });
};

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug');
    removeHosts();
    window.Element.prototype.attachShadow = nativeAttachShadow;
    console.log = nativeConsole;
};

module(name, { beforeEach, afterEach });

// some browsers do not support ShadowRoot
// for example, Firefox 52 which is used for browserstack tests
// https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot
const isSupported = typeof Element.prototype.attachShadow !== 'undefined';

if (!isSupported) {
    test('unsupported', (assert) => {
        assert.ok(true, 'Browser does not support it');
    });
} else {
    test('apply style to all shadow dom subtrees', (assert) => {
        runScriptlet(name, [CSS_TEXT1]);

        const host1 = appendHost(HOST_ID1);
        const shadowRoot1 = host1.attachShadow({ mode: 'closed' });
        appendTarget(shadowRoot1, TARGET_ID1);

        const host2 = appendHost(HOST_ID2);
        const shadowRoot2 = host2.attachShadow({ mode: 'closed' });
        appendTarget(shadowRoot2, TARGET_ID1);

        // First shadow root, style applied
        const target1 = shadowRoot1.getElementById(TARGET_ID1);
        assert.strictEqual(getComputedStyle(target1).color, 'rgb(255, 0, 0)', 'style was applied to shadowRoot #1');
        // Second shadow root, style applied
        const target2 = shadowRoot2.getElementById(TARGET_ID1);
        assert.strictEqual(getComputedStyle(target2).color, 'rgb(255, 0, 0)', 'style was applied to shadowRoot #2');

        assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
    });

    test('apply style to specific shadow dom subtree', (assert) => {
        runScriptlet(name, [CSS_TEXT1, `#${HOST_ID1}`]);

        const host1 = appendHost(HOST_ID1);
        const shadowRoot1 = host1.attachShadow({ mode: 'closed' });
        appendTarget(shadowRoot1, TARGET_ID1);

        const host2 = appendHost(HOST_ID2);
        const shadowRoot2 = host2.attachShadow({ mode: 'closed' });
        appendTarget(shadowRoot2, TARGET_ID1);

        // First shadow root, style applied
        const target1 = shadowRoot1.getElementById(TARGET_ID1);
        assert.strictEqual(getComputedStyle(target1).color, 'rgb(255, 0, 0)', 'style was applied to shadowRoot #1');
        // Second shadow root, style should no be applied
        const target2 = shadowRoot2.getElementById(TARGET_ID1);
        assert.strictEqual(getComputedStyle(target2).color, 'rgb(0, 0, 0)', 'style was not applied to shadowRoot #2');

        assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
    });

    test('do not apply style with url function, logged correctly', (assert) => {
        assert.expect(3);
        console.log = function log(input) {
            if (input.includes('trace')) {
                return;
            }
            assert.strictEqual(
                input,
                `${name}: "url()" function is not allowed for css rules`,
                'message logged correctly',
            );
        };

        runScriptlet(name, [CSS_TEXT2]);

        const host1 = appendHost(HOST_ID1);
        const shadowRoot1 = host1.attachShadow({ mode: 'closed' });
        appendTarget(shadowRoot1, TARGET_ID1);

        // style with url() function should not be applied
        const target1 = shadowRoot1.getElementById(TARGET_ID1);
        const target1Background = getComputedStyle(target1).background;

        assert.ok(!target1Background.match(/url\(.*\)/i), 'url() style was not applied to shadowRoot #1');
        assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
    });

    test('do not apply style with image-set function, logged correctly', (assert) => {
        assert.expect(3);
        console.log = function log(input) {
            if (input.includes('trace')) {
                return;
            }
            assert.strictEqual(
                input,
                `${name}: "url()" function is not allowed for css rules`,
                'message logged correctly',
            );
        };

        runScriptlet(name, [CSS_TEXT3]);

        const host1 = appendHost(HOST_ID1);
        const shadowRoot1 = host1.attachShadow({ mode: 'closed' });
        appendTarget(shadowRoot1, TARGET_ID1);

        // style with url() function should not be applied
        const target1 = shadowRoot1.getElementById(TARGET_ID1);
        const target1Background = getComputedStyle(target1).background;

        assert.ok(!target1Background.match(/image-set\(.*\)/i), 'image-set() style was not applied to shadowRoot #1');
        assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
    });

    test('do not apply invalid style, logged correctly', (assert) => {
        assert.expect(3);
        console.log = function log(input) {
            if (typeof input !== 'string' || input.includes('trace')) {
                return;
            }

            const logMessage = `${name}: Unable to apply the rule '${INVALID_CSS_TEXT}' due to:`;
            assert.ok(input.startsWith(logMessage), 'message logged correctly');
        };

        runScriptlet(name, [INVALID_CSS_TEXT]);

        const host1 = appendHost(HOST_ID1);
        const shadowRoot1 = host1.attachShadow({ mode: 'closed' });
        appendTarget(shadowRoot1, TARGET_ID1);

        // style with url() function should not be applied
        const target1 = shadowRoot1.getElementById(TARGET_ID1);
        const target1Color = getComputedStyle(target1).color;

        assert.strictEqual(target1Color, 'rgb(0, 0, 0)', 'style was not applied to shadowRoot #1');
        assert.strictEqual(window.hit, undefined, 'hit should NOT fire');
    });

    test('test complex layouts', (assert) => {
        // <body>
        //   <div#host1>
        //   |  #shadow-root (closed)
        //   |  |  <div#shadowInner>
        //   |  |  |  #shadow-root (open)
        //   |  |  |  |  <p#target1></p>
        //   |  |  </div>
        //   </div>
        // </body>
        runScriptlet(name, [CSS_TEXT1]);

        const host1 = appendHost(HOST_ID1);
        const shadowRoot1 = host1.attachShadow({ mode: 'closed' });

        const shadowInner = document.createElement('div');
        shadowRoot1.append(shadowInner);
        const shadowRoot2 = shadowInner.attachShadow({ mode: 'open' });
        appendTarget(shadowRoot2, TARGET_ID1);

        const target1 = shadowRoot2.getElementById(TARGET_ID1);
        assert.strictEqual(getComputedStyle(target1).color, 'rgb(255, 0, 0)', 'style was applied to shadowRoot #1');
        assert.strictEqual(window.hit, 'FIRED', 'hit function was executed');
    });
}
