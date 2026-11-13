/* eslint-disable no-underscore-dangle, no-console, max-len */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'trusted-replace-node-text';

const elements = [];

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const nativeConsole = console.log;

const afterEach = () => {
    elements.forEach((element) => element.remove());
    clearGlobalProps('hit', '__debug');
    console.log = nativeConsole;
};

module(name, { beforeEach, afterEach });

let policy;
if (window.trustedTypes) {
    policy = window.trustedTypes.createPolicy('myEscapePolicy', {
        createHTML: (string) => string,
        createScript: (string) => string,
    });
}

const addNode = (nodeName, textContent) => {
    const node = document.createElement(nodeName);
    if (nodeName === 'script' && policy) {
        node.textContent = policy.createScript(textContent);
    } else {
        node.textContent = textContent;
    }
    elements.push(node);
    document.body.appendChild(node);
    return node;
};

test('simple case', (assert) => {
    const done = assert.async();

    const nodeName = 'div';
    const textMatch = 'content!';
    const pattern = 'content';
    const replacement = 'replaced';

    const text = 'content!1';
    const expectedText = 'replaced!1';

    const nodeBefore = addNode('div', text);
    const safeNodeBefore = addNode('a', text);

    runScriptlet(name, [nodeName, textMatch, pattern, replacement]);

    const nodeAfter = addNode('div', text);
    const safeNodeAfter = addNode('span', text);
    setTimeout(() => {
        assert.strictEqual(nodeAfter.textContent, expectedText, 'text content should be modified');
        assert.strictEqual(nodeBefore.textContent, expectedText, 'text content should be modified');

        assert.strictEqual(safeNodeAfter.textContent, text, 'non-matched node should not be affected');
        assert.strictEqual(safeNodeBefore.textContent, text, 'non-matched node should not be affected');

        assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
        done();
    }, 1);
});

test('simple case - should not throw error when pattern and replacement are not provided', (assert) => {
    const done = assert.async();

    const nodeName = 'div';
    const textMatch = 'qwerty!';

    const text = 'qwerty!1';
    const expectedText = 'qwerty!1';

    const nodeBefore = addNode('div', text);
    const safeNodeBefore = addNode('a', text);

    runScriptlet(name, [nodeName, textMatch]);

    const nodeAfter = addNode('div', text);
    const safeNodeAfter = addNode('span', text);
    setTimeout(() => {
        assert.strictEqual(nodeAfter.textContent, expectedText, 'text content should not be modified');
        assert.strictEqual(nodeBefore.textContent, expectedText, 'text content should not be modified');

        assert.strictEqual(safeNodeAfter.textContent, text, 'non-matched node should not be affected');
        assert.strictEqual(safeNodeBefore.textContent, text, 'non-matched node should not be affected');

        // nothing has changed, so the text is not written again and hit is not fired
        assert.strictEqual(window.hit, undefined, 'hit function should not fire');
        done();
    }, 1);
});

test('simple case - check if quotes are correctly escaped in pattern and replacement', (assert) => {
    const done = assert.async();

    const nodeName = 'div';
    const textMatch = 'alert';
    const pattern = '/alert\\(\\\'test\\\'\\)/';
    const replacement = 'alert(\\\'replaced\\\')';
    const text = "alert('test')";
    const expectedText = "alert('replaced')";

    const nodeBefore = addNode('div', text);
    const safeNodeBefore = addNode('a', text);

    runScriptlet(name, [nodeName, textMatch, pattern, replacement]);

    const nodeAfter = addNode('div', text);
    const safeNodeAfter = addNode('span', text);
    setTimeout(() => {
        assert.strictEqual(nodeAfter.textContent, expectedText, 'text content should be modified');
        assert.strictEqual(nodeBefore.textContent, expectedText, 'text content should be modified');

        assert.strictEqual(safeNodeAfter.textContent, text, 'non-matched node should not be affected');
        assert.strictEqual(safeNodeBefore.textContent, text, 'non-matched node should not be affected');

        assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
        done();
    }, 1);
});

test('simple case - check if quotes are correctly escaped in result', (assert) => {
    const done = assert.async();

    const nodeName = 'div';
    const textMatch = 'alert';
    const pattern = 'foo';
    const replacement = 'bar';
    const text = 'alert("\\"foo\\"")';
    const expectedText = 'alert("\\"bar\\"")';

    const nodeBefore = addNode('div', text);
    const safeNodeBefore = addNode('a', text);

    runScriptlet(name, [nodeName, textMatch, pattern, replacement]);

    const nodeAfter = addNode('div', text);
    const safeNodeAfter = addNode('span', text);
    setTimeout(() => {
        assert.strictEqual(nodeAfter.textContent, expectedText, 'text content should be modified');
        assert.strictEqual(nodeBefore.textContent, expectedText, 'text content should be modified');

        assert.strictEqual(safeNodeAfter.textContent, text, 'non-matched node should not be affected');
        assert.strictEqual(safeNodeBefore.textContent, text, 'non-matched node should not be affected');

        assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
        done();
    }, 1);
});

test('using matchers as regexes', (assert) => {
    const done = assert.async();

    const nodeName = String.raw`/d\dv/`;
    const textMatch = String.raw`/content[$&+,:;=?@#|'<>.^*()%!-]/`;
    const pattern = '/content/';
    const replacement = 'replaced';

    const text = 'content!1';
    const expectedText = 'replaced!1';

    const nodeBefore = addNode('d1v', text);
    const safeNodeBefore = addNode('a', text);

    runScriptlet(name, [nodeName, textMatch, pattern, replacement]);

    const nodeAfter = addNode('d3v', text);
    const safeNodeAfter = addNode('span', text);
    setTimeout(() => {
        assert.strictEqual(nodeAfter.textContent, expectedText, 'text content should be modified');
        assert.strictEqual(nodeBefore.textContent, expectedText, 'text content should be modified');

        assert.strictEqual(safeNodeAfter.textContent, text, 'non-matched node should not be affected');
        assert.strictEqual(safeNodeBefore.textContent, text, 'non-matched node should not be affected');

        assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
        done();
    }, 1);
});

test('CSP require-trusted-types-for "script" - replace script content', (assert) => {
    const done = assert.async();

    // QUnit uses innerHTML to render tests, so we need to override it and add trusted types policy
    const nativeInnerHTMLSet = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML').set;
    Object.defineProperty(Element.prototype, 'innerHTML', {
        set(html) {
            if (policy) {
                const sanitizedHTML = policy.createHTML(html);
                // eslint-disable-next-line no-setter-return
                return nativeInnerHTMLSet.call(this, sanitizedHTML);
            }
            // eslint-disable-next-line no-setter-return
            return nativeInnerHTMLSet.call(this, html);
        },
    });

    const meta = document.createElement('meta');
    document.head.appendChild(meta);
    meta.setAttribute('http-equiv', 'Content-Security-Policy');
    meta.setAttribute('content', "require-trusted-types-for 'script'");

    const nodeName = 'script';
    const textMatch = 'window.showAds';
    const pattern = 'window.showAds = true';
    const replacement = 'window.showAds = false';

    const expectedText = 'window.showAds = false;';

    runScriptlet(name, [nodeName, textMatch, pattern, replacement]);

    const nodeAfter = addNode('script', 'window.showAds = true;');
    setTimeout(() => {
        assert.strictEqual(nodeAfter.textContent, expectedText, 'text content should be modified');
        assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
        clearGlobalProps('showAds');
        done();
    }, 1);
});

test('Log content', (assert) => {
    // There are 7 "asserts" in test but node is modified two times
    // so it's logged twice, that's why 9 is expected
    assert.expect(9);

    console.log = (...args) => {
        if (args.length === 1 && args[0].includes('foo log')) {
            assert.ok(args[0].includes('foo log'), 'should log text in console');
        }
        if (args.length === 1 && args[0].includes('bar log')) {
            assert.ok(args[0].includes('bar log'), 'should log text in console');
        }
        nativeConsole(...args);
    };

    const done = assert.async();

    const nodeName = 'div';
    const textMatch = 'log';
    const pattern = 'foo';
    const replacement = 'bar';
    const verbose = 'verbose';

    const text = 'foo log';
    const expectedText = 'bar log';

    const nodeBefore = addNode('div', text);
    const safeNodeBefore = addNode('a', text);

    runScriptlet(name, [nodeName, textMatch, pattern, replacement, verbose]);

    const nodeAfter = addNode('div', text);
    const safeNodeAfter = addNode('span', text);
    setTimeout(() => {
        assert.strictEqual(nodeAfter.textContent, expectedText, 'text content should be modified');
        assert.strictEqual(nodeBefore.textContent, expectedText, 'text content should be modified');

        assert.strictEqual(safeNodeAfter.textContent, text, 'non-matched node should not be affected');
        assert.strictEqual(safeNodeBefore.textContent, text, 'non-matched node should not be affected');

        assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
        done();
    }, 1);
});

/**
 * Adds a script node which is not executed, as its content is not a valid script,
 * to the end of the body.
 *
 * @param {string} textContent Text of the script.
 *
 * @returns {HTMLScriptElement} Added script node.
 */
const addInertScript = (textContent) => {
    const node = document.createElement('script');
    node.type = 'text/plain';
    node.textContent = policy ? policy.createScript(textContent) : textContent;
    elements.push(node);
    document.body.appendChild(node);
    return node;
};

/**
 * Adds an element with text to the end of the body.
 *
 * @param {string} nodeName Name of the element.
 * @param {string} textContent Text of the element.
 *
 * @returns {HTMLElement} Added element.
 */
const addElement = (nodeName, textContent) => {
    const node = document.createElement(nodeName);
    node.textContent = textContent;
    elements.push(node);
    document.body.appendChild(node);
    return node;
};

// Rules from uBO filter lists, converted to AdGuard syntax by AGTree,
// so that their arguments are the same as received by the scriptlet,
// e.g. `'` is escaped by the converter
module(`${name} with uBO arguments`, { beforeEach, afterEach });

test('string pattern replaces all occurrences', (assert) => {
    // bintv.fun,bintvs.fun##+js(rpnt, script, keydown, ooo)
    const node = addInertScript('addEventListener("keydown", f); window.onkeydown = f; // ubo-1');

    runScriptlet('ubo-rpnt', ['script', 'keydown', 'ooo']);

    assert.strictEqual(node.textContent, 'addEventListener("ooo", f); window.onooo = f; // ubo-1', 'all replaced');
    assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
});

test('regular expression without `g` flag replaces the first occurrence', (assert) => {
    // jobzhub.store##+js(rpnt, script, /initialTimeSeconds = \d+/, initialTimeSeconds = 7)
    const node = addInertScript('initialTimeSeconds = 30; initialTimeSeconds = 30; // ubo-2');

    runScriptlet('ubo-rpnt', ['script', '/initialTimeSeconds = \\d+/', 'initialTimeSeconds = 7']);

    assert.strictEqual(node.textContent, 'initialTimeSeconds = 7; initialTimeSeconds = 30; // ubo-2', 'first replaced');
});

test('regular expression with `g` flag and `$1` in replacement', (assert) => {
    // narto-drama.com##+js(rpnt, script, /const (adsShowModeTime|hilltopDirectLinkConsentRequired) = true;/g, const $1 = false;)
    const node = addInertScript('const adsShowModeTime = true; const hilltopDirectLinkConsentRequired = true; // ubo-3');

    runScriptlet('ubo-rpnt', [
        'script',
        '/const (adsShowModeTime|hilltopDirectLinkConsentRequired) = true;/g',
        'const $1 = false;',
    ]);

    assert.strictEqual(
        node.textContent,
        'const adsShowModeTime = false; const hilltopDirectLinkConsentRequired = false; // ubo-3',
        'all replaced with captured groups',
    );
});

test('regular expression with escaped characters and `$1` `$2` in replacement', (assert) => {
    // link.softoroom.org##+js(trusted-replace-node-text, script, /(setTimeout\([\s\S]*?createElement\('a'\)[\s\S]*?\}\,)\s*\d{4}(\);)/, $1 0$2)
    const node = addInertScript("setTimeout(function () { document.createElement('a').click(); }, 5000); // ubo-4");

    runScriptlet('ubo-trusted-replace-node-text', [
        'script',
        "/(setTimeout\\([\\s\\S]*?createElement\\(\\'a\\'\\)[\\s\\S]*?\\},)\\s*\\d{4}(\\);)/",
        '$1 0$2',
    ]);

    assert.strictEqual(
        node.textContent,
        "setTimeout(function () { document.createElement('a').click(); }, 0); // ubo-4",
        'delay replaced',
    );
});

test('no replacement removes the matched text', (assert) => {
    // baumbet.ro##+js(rpnt, script, window.location.reload)
    const node = addInertScript('if (adblock) { window.location.reload(); } // ubo-5');

    runScriptlet('ubo-rpnt', ['script', 'window.location.reload']);

    assert.strictEqual(node.textContent, 'if (adblock) { (); } // ubo-5', 'matched text removed');
});

test('quotes escaped by the converter are unescaped', (assert) => {
    // trainerscity.com##+js(rpnt, script, startTime: '5', startTime: '0')
    const node = addInertScript("player({ startTime: '5' }); // ubo-6");

    runScriptlet('ubo-rpnt', ['script', "startTime: \\'5\\'", "startTime: \\'0\\'"]);

    assert.strictEqual(node.textContent, "player({ startTime: '0' }); // ubo-6", 'quotes are not escaped');
});

test('`condition` option', (assert) => {
    // novelpia.com##+js(rpnt, style, .np{, .dummy{, condition, @media print)
    const matched = addElement('style', '@media print { .np{ display: none; } } /* ubo-7 */');
    const notMatched = addElement('style', '.np{ color: red; } /* ubo-7 */');

    runScriptlet('ubo-rpnt', ['style', '.np{', '.dummy{', 'condition', '@media print']);

    assert.strictEqual(matched.textContent, '@media print { .dummy{ display: none; } } /* ubo-7 */', 'replaced');
    assert.strictEqual(notMatched.textContent, '.np{ color: red; } /* ubo-7 */', 'not matched by condition');
});

test('`includes` option', (assert) => {
    // fsicomics.com##+js(rpnt, script, > 0, < 0, includes, clearInterval)
    const matched = addInertScript('if (timeLeft > 0) { clearInterval(timer); } // ubo-8');
    const notMatched = addInertScript('if (count > 0) { next(); } // ubo-8');

    runScriptlet('ubo-rpnt', ['script', '> 0', '< 0', 'includes', 'clearInterval']);

    assert.strictEqual(matched.textContent, 'if (timeLeft < 0) { clearInterval(timer); } // ubo-8', 'replaced');
    assert.strictEqual(notMatched.textContent, 'if (count > 0) { next(); } // ubo-8', 'not matched by includes');
});

test('`excludes` option', (assert) => {
    // primesrc.me,primewire.*##+js(rpnt, script, window.csrf_token =, window.userID = 1;window.csrf_token =, excludes, window.userID)
    const matched = addInertScript('window.csrf_token = "a"; // ubo-9');
    const excluded = addInertScript('window.userID = 5; window.csrf_token = "b"; // ubo-9');

    runScriptlet('ubo-rpnt', [
        'script',
        'window.csrf_token =',
        'window.userID = 1;window.csrf_token =',
        'excludes',
        'window.userID',
    ]);

    assert.strictEqual(matched.textContent, 'window.userID = 1;window.csrf_token = "a"; // ubo-9', 'replaced');
    assert.strictEqual(excluded.textContent, 'window.userID = 5; window.csrf_token = "b"; // ubo-9', 'excluded');
});

test('`sedCount` option, and `\\"` kept in arguments', (assert) => {
    // u.co.uk##+js(trusted-rpnt, script, /\\"ad_block\\":true/, \"ad_block\":false, includes, FeatureSwitchManager, sedCount, 1)
    const text = 'FeatureSwitchManager.init("{\\"ad_block\\":true}"); // ubo-10';
    const first = addInertScript(text);
    const second = addInertScript(text);

    runScriptlet('ubo-trusted-rpnt', [
        'script',
        '/\\\\"ad_block\\\\":true/',
        '\\"ad_block\\":false',
        'includes',
        'FeatureSwitchManager',
        'sedCount',
        '1',
    ]);

    assert.strictEqual(
        first.textContent,
        'FeatureSwitchManager.init("{\\"ad_block\\":false}"); // ubo-10',
        'first node replaced, with escaped quotes',
    );
    assert.strictEqual(second.textContent, text, 'second node not replaced');
});

test('nodes added after the document is interactive are not replaced by default', (assert) => {
    const done = assert.async();
    // heidisql.com##+js(rpnt, script, if(floovy()) {, if(false) {)
    runScriptlet('ubo-rpnt', ['script', 'if(floovy()) {', 'if(false) {']);
    const node = addInertScript('if(floovy()) { block(); } // ubo-11');

    setTimeout(() => {
        // `hit` is not checked, as observers of the previous tests may still be running on the page
        assert.strictEqual(node.textContent, 'if(floovy()) { block(); } // ubo-11', 'not replaced');
        done();
    }, 10);
});

test('`stay` option replaces nodes added later', (assert) => {
    const done = assert.async();
    // publicearn.*##+js(rpnt, script, Android/, false/, stay, 1)
    runScriptlet('ubo-rpnt', ['script', 'Android/', 'false/', 'stay', '1']);
    const node = addInertScript('if (/Android/.test(ua)) { block(); } // ubo-12');

    setTimeout(() => {
        assert.strictEqual(node.textContent, 'if (/false/.test(ua)) { block(); } // ubo-12', 'replaced');
        assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
        done();
    }, 10);
});

test('`#text` node name', (assert) => {
    // odiadance.com,sayphotobooth.com##+js(rpnt, #text, Link, wait 20 sec button will appear)
    const element = addElement('div', 'Link');
    const textNode = element.firstChild;

    runScriptlet('ubo-rpnt', ['#text', 'Link', 'wait 20 sec button will appear']);

    assert.strictEqual(textNode.textContent, 'wait 20 sec button will appear', 'text node replaced');
});

test('node name is case-insensitive', (assert) => {
    // haveibeenpwned.com##+js(rpnt, P, /\.[^.]+(1Password password manager|download 1Password)[^.]+/)
    const node = addElement('p', 'Check your passwords. Use 1Password password manager to stay safe. Done.');

    runScriptlet('ubo-rpnt', ['P', '/\\.[^.]+(1Password password manager|download 1Password)[^.]+/']);

    assert.strictEqual(node.textContent, 'Check your passwords. Done.', 'text of p element replaced');
});

test('invalid regular expression is not applied', (assert) => {
    const node = addInertScript('ads(); // ubo-13');

    runScriptlet('ubo-rpnt', ['script', '/ads(/', '']);

    assert.strictEqual(node.textContent, 'ads(); // ubo-13', 'not replaced');
    assert.strictEqual(window.hit, undefined, 'hit function should not fire');
});

test.each('uBO names', [
    'ubo-trusted-replace-node-text.js',
    'ubo-trusted-replace-node-text',
    'ubo-trusted-rpnt.js',
    'ubo-trusted-rpnt',
    'ubo-replace-node-text.js',
    'ubo-replace-node-text',
    'ubo-rpnt.js',
    'ubo-rpnt',
], (assert, uboName) => {
    // bintv.fun,bintvs.fun##+js(rpnt, script, keydown, ooo)
    const node = addInertScript(`addEventListener("keydown", f); window.onkeydown = f; // ${uboName}`);

    runScriptlet(uboName, ['script', 'keydown', 'ooo']);

    assert.strictEqual(
        node.textContent,
        `addEventListener("ooo", f); window.onooo = f; // ${uboName}`,
        'uBO arguments are used',
    );
});

// Rules from AdGuard filter lists, with the options added
module(`${name} with options`, { beforeEach, afterEach });

test('present text nodes are replaced', (assert) => {
    // winfuture.de#%#//scriptlet('trusted-replace-node-text', '#text', 'Anzeige', '(Anzeige)', '')
    const element = addElement('div', 'Anzeige (Anzeige) opt-1');
    const textNode = element.firstChild;

    runScriptlet(name, ['#text', 'Anzeige', '(Anzeige)', '']);

    assert.strictEqual(textNode.textContent, 'Anzeige  opt-1', 'present text node replaced');
    assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
});

test('`excludes` option', (assert) => {
    // xnxx-ru.com,xnxx.tv,xnxx.com,xnxx.*#%#//scriptlet('trusted-replace-node-text', 'script', 'html5player', 'if (typeof html5player.setupVideo === \'function\')', 'if (false)')
    const matched = addInertScript("if (typeof html5player.setupVideo === 'function') { ad(); } // opt-2");
    const excluded = addInertScript("if (typeof html5player.setupVideo === 'function') { keep(); } // opt-2");

    runScriptlet(name, [
        'script',
        'html5player',
        "if (typeof html5player.setupVideo === \\'function\\')",
        'if (false)',
        'excludes',
        'keep()',
    ]);

    assert.strictEqual(matched.textContent, 'if (false) { ad(); } // opt-2', 'replaced');
    assert.strictEqual(
        excluded.textContent,
        "if (typeof html5player.setupVideo === 'function') { keep(); } // opt-2",
        'excluded',
    );
});

test('`excludes` option with regular expression', (assert) => {
    // 1337x.*,1337x.pro#%#//scriptlet('trusted-replace-node-text', 'script', 'window.open', '/window\.location=addUrl;/g', '')
    const matched = addInertScript('window.open(u); window.location=addUrl; // opt-3');
    const excluded = addInertScript('window.open(u); window.location=addUrl; // opt-3 nonce=1');

    runScriptlet(name, ['script', 'window.open', '/window\\.location=addUrl;/g', '', 'excludes', '/nonce=\\d/']);

    assert.strictEqual(matched.textContent, 'window.open(u);  // opt-3', 'replaced');
    assert.strictEqual(excluded.textContent, 'window.open(u); window.location=addUrl; // opt-3 nonce=1', 'excluded');
});

test('`sedCount` option', (assert) => {
    // filstalwelle.de#%#//scriptlet('trusted-replace-node-text', 'div', 'WERBUNG', 'WERBUNG', 'Trying to skip ads...')
    const first = addElement('div', 'WERBUNG opt-4');
    const notMatched = addElement('div', 'Artikel opt-4');
    const second = addElement('div', 'WERBUNG opt-4');

    runScriptlet(name, ['div', 'WERBUNG', 'WERBUNG', 'Trying to skip ads...', 'sedCount', '1']);

    assert.strictEqual(first.textContent, 'Trying to skip ads... opt-4', 'first matched node replaced');
    assert.strictEqual(notMatched.textContent, 'Artikel opt-4', 'not matched node is not counted');
    assert.strictEqual(second.textContent, 'WERBUNG opt-4', 'second matched node not replaced');
});

test('`quitAfter` option with 0 stops when the document is interactive', (assert) => {
    const done = assert.async();
    // mylocation.org#%#//scriptlet('trusted-replace-node-text', 'td', '', '(change)', '')
    const table = document.createElement('table');
    const row = table.insertRow();
    elements.push(table);
    document.body.appendChild(table);
    const present = row.insertCell();
    present.textContent = 'Warsaw (change) opt-5';

    runScriptlet(name, ['td', '', '(change)', '', 'quitAfter', '0']);

    const added = row.insertCell();
    added.textContent = 'Berlin (change) opt-5';

    setTimeout(() => {
        assert.strictEqual(present.textContent, 'Warsaw  opt-5', 'present node replaced');
        // without the option, added nodes are replaced for 10 seconds
        assert.strictEqual(added.textContent, 'Berlin (change) opt-5', 'added node not replaced');
        done();
    }, 10);
});

test('`stay` option and verbose', (assert) => {
    const done = assert.async();
    const logs = [];
    console.log = (...args) => {
        logs.push(args.join(' '));
        nativeConsole(...args);
    };
    // 10short.com#%#//scriptlet("trusted-replace-node-text", "script", "openLink", "/window.location.href = '.*?';/", "")
    runScriptlet(name, ['script', 'openLink', "/window.location.href = '.*?';/", '', 'stay', '1', 'verbose']);
    const added = addInertScript("function openLink() { window.location.href = 'https://ad.example'; } // opt-6");

    setTimeout(() => {
        assert.strictEqual(added.textContent, 'function openLink() {  } // opt-6', 'added node replaced');
        assert.ok(logs.some((log) => log.includes('Modified text content: function openLink()')), 'logged');
        done();
    }, 10);
});

test('invalid `sedCount` is not applied', (assert) => {
    const node = addElement('div', 'WERBUNG opt-7');

    runScriptlet(name, ['div', 'WERBUNG', 'WERBUNG', 'Trying to skip ads...', 'sedCount', 'one']);

    assert.strictEqual(node.textContent, 'WERBUNG opt-7', 'not replaced');
});

test('uBO `quitAfter` option keeps replacing added nodes', (assert) => {
    const done = assert.async();
    // heidisql.com##+js(rpnt, script, if(floovy()) {, if(false) {), with `quitAfter` added
    runScriptlet('ubo-rpnt', ['script', 'if(floovy()) {', 'if(false) {', 'quitAfter', '1000']);
    const added = addInertScript('if(floovy()) { block(); } // opt-8');

    setTimeout(() => {
        assert.strictEqual(added.textContent, 'if(false) { block(); } // opt-8', 'added node replaced');
        done();
    }, 10);
});
