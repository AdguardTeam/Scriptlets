/* eslint-disable no-underscore-dangle, no-console, max-len */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'trusted-replace-script-text';

const nativeConsole = console.log;

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    clearGlobalProps('hit', '__debug', 'scriptResult', 'scriptExecuted');
    console.log = nativeConsole;
    // Restore src descriptor in case a test failed partway through
    // The descriptor may already be restored by scriptlet; this is a safety net.
};

module(name, { beforeEach, afterEach });

/**
 * Creates a blob URL from the given JS text.
 *
 * @param {string} text JavaScript text to create a blob URL for.
 * @returns {string} blob URL
 */
const createBlobUrl = (text) => {
    const blob = new Blob([text], { type: 'text/javascript' });
    return URL.createObjectURL(blob);
};

/**
 * Appends a script element with the given src to the document body
 * and returns a cleanup function.
 *
 * @param {string} src Script source URL.
 * @returns {HTMLScriptElement}
 */
const appendScript = (src) => {
    const el = document.createElement('script');
    el.src = src;
    document.body.appendChild(el);
    return el;
};

// Blob URL replacement — pattern matched, content replaced
test('replaces matched content in blob script', (assert) => {
    const done = assert.async();

    // The script sets window.scriptResult to 'original' or 'replaced'
    // depending on whether the replacement occurred.
    const originalText = 'window.scriptResult = "original";';
    const blobUrl = createBlobUrl(originalText);

    runScriptlet(name, ['original', 'replaced']);

    const el = appendScript(blobUrl);

    el.onload = () => {
        assert.strictEqual(window.scriptResult, 'replaced', 'script content should be replaced');
        assert.strictEqual(window.hit, 'FIRED', 'hit should fire');
        el.remove();
        done();
    };
    el.onerror = () => {
        assert.ok(false, 'script should not error');
        el.remove();
        done();
    };
});

// No match — pattern not present, passthrough, hit not called
test('passes through when pattern does not match', (assert) => {
    const done = assert.async();

    // Script sets a sentinel that confirms it ran unchanged
    const originalText = 'window.scriptExecuted = "yes";';
    const blobUrl = createBlobUrl(originalText);

    runScriptlet(name, ['NOMATCH_TOKEN', 'replaced']);

    const el = appendScript(blobUrl);

    el.onload = () => {
        assert.strictEqual(window.scriptExecuted, 'yes', 'original script should have executed');
        assert.strictEqual(window.hit, undefined, 'hit should NOT fire when pattern does not match');
        el.remove();
        done();
    };
    el.onerror = () => {
        assert.ok(false, 'script should not error');
        el.remove();
        done();
    };
});

// urlToMatch — matches, replacement applied
test('applies replacement when urlToMatch matches the blob URL', (assert) => {
    const done = assert.async();

    const originalText = 'window.scriptResult = "original";';
    const blobUrl = createBlobUrl(originalText);

    // blob: URLs always start with "blob:"
    runScriptlet(name, ['original', 'replaced', 'blob:']);

    const el = appendScript(blobUrl);

    el.onload = () => {
        assert.strictEqual(window.scriptResult, 'replaced', 'replacement should apply when URL matches');
        assert.strictEqual(window.hit, 'FIRED', 'hit should fire');
        el.remove();
        done();
    };
    el.onerror = () => {
        assert.ok(false, 'script should not error');
        el.remove();
        done();
    };
});

// urlToMatch — does not match, passthrough
test('passes through when urlToMatch does not match', (assert) => {
    const done = assert.async();

    const originalText = 'window.scriptExecuted = "yes";';
    const blobUrl = createBlobUrl(originalText);

    // Use a pattern that won't match a blob URL
    runScriptlet(name, ['original', 'replaced', 'https://non-matching-url.example.com/']);

    const el = appendScript(blobUrl);

    el.onload = () => {
        assert.strictEqual(window.scriptExecuted, 'yes', 'original script should execute unchanged');
        assert.strictEqual(window.hit, undefined, 'hit should NOT fire when URL does not match');
        el.remove();
        done();
    };
    el.onerror = () => {
        assert.ok(false, 'script should not error');
        el.remove();
        done();
    };
});

// setAttribute path — same replacement logic via setAttribute
test('replaces content when src set via setAttribute', (assert) => {
    const done = assert.async();

    const originalText = 'window.scriptResult = "original";';
    const blobUrl = createBlobUrl(originalText);

    runScriptlet(name, ['original', 'replaced']);

    const el = document.createElement('script');
    el.setAttribute('src', blobUrl);
    document.body.appendChild(el);

    el.onload = () => {
        assert.strictEqual(window.scriptResult, 'replaced', 'setAttribute path should also replace content');
        assert.strictEqual(window.hit, 'FIRED', 'hit should fire');
        el.remove();
        done();
    };
    el.onerror = () => {
        assert.ok(false, 'script should not error');
        el.remove();
        done();
    };
});

// Logging mode (no pattern) — logs src but does not replace
test('logging mode: logs src assignment and passes through unchanged', (assert) => {
    const done = assert.async();

    const logMessages = [];
    console.log = (...args) => {
        logMessages.push(args.join(' '));
        nativeConsole(...args);
    };

    const originalText = 'window.scriptExecuted = "yes";';
    const blobUrl = createBlobUrl(originalText);

    // No pattern → logging mode
    runScriptlet(name, []);

    const el = appendScript(blobUrl);

    el.onload = () => {
        assert.strictEqual(window.scriptExecuted, 'yes', 'script should execute unchanged in logging mode');
        assert.ok(
            logMessages.some((m) => m.includes('blob:')),
            'should log the blob URL',
        );
        el.remove();
        done();
    };
    el.onerror = () => {
        assert.ok(false, 'script should not error');
        el.remove();
        done();
    };
});

// XHR failure fallback — original src used, no uncaught exception
test('falls back to original src when fetch fails', (assert) => {
    const done = assert.async();

    // An invalid blob URL that cannot be fetched
    const invalidBlobUrl = 'blob:null/00000000-0000-0000-0000-000000000000';

    runScriptlet(name, ['pattern', 'replacement']);

    let uncaughtError = false;
    const origOnError = window.onerror;
    window.onerror = (msg) => {
        // Only flag errors not caused by loading an invalid blob
        if (!String(msg).includes('blob:null')) {
            uncaughtError = true;
        }
        return true; // suppress
    };

    const el = document.createElement('script');
    el.src = invalidBlobUrl;
    document.body.appendChild(el);

    // Give the browser time to attempt the load / error
    setTimeout(() => {
        assert.notOk(uncaughtError, 'no uncaught exception should propagate from scriptlet');
        assert.strictEqual(window.hit, undefined, 'hit should NOT fire on XHR failure');
        window.onerror = origOnError;
        el.remove();
        done();
    }, 100);
});

// Regex replacement with global flag
test('replaces all occurrences when regex has global flag', (assert) => {
    const done = assert.async();

    // Script sets window.scriptResult by concatenating two sentinel values
    const originalText = 'window.scriptResult = "foo" + "-" + "foo";';
    const blobUrl = createBlobUrl(originalText);

    // Replace all "foo" with "bar"
    runScriptlet(name, ['/foo/g', 'bar']);

    const el = appendScript(blobUrl);

    el.onload = () => {
        assert.strictEqual(window.scriptResult, 'bar-bar', 'all occurrences should be replaced');
        assert.strictEqual(window.hit, 'FIRED', 'hit should fire');
        el.remove();
        done();
    };
    el.onerror = () => {
        assert.ok(false, 'script should not error');
        el.remove();
        done();
    };
});
