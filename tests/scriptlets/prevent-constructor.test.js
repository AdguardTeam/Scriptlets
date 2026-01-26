/* eslint-disable no-underscore-dangle */
import { runScriptlet, clearGlobalProps } from '../helpers';

const { test, module } = QUnit;
const name = 'prevent-constructor';

const nativeMutationObserver = window.MutationObserver;
const nativePromise = window.Promise;
const nativeRegExp = window.RegExp;

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    window.MutationObserver = nativeMutationObserver;
    window.Promise = nativePromise;
    window.RegExp = nativeRegExp;

    clearGlobalProps('hit', '__debug', 'testProp');
};

module(name, { beforeEach, afterEach });

test('No args - does nothing', (assert) => {
    runScriptlet(name);
    // because at least constructorName should be specified
    assert.strictEqual(window.hit, undefined, 'hit should not fire');
});

test('Non-existent constructor - logs message', (assert) => {
    runScriptlet(name, ['NonExistentConstructor']);

    assert.strictEqual(window.hit, undefined, 'hit should not fire');
});

test('Prevents MutationObserver - no argument search', (assert) => {
    const done = assert.async();
    window.testProp = 'initial';

    runScriptlet(name, ['MutationObserver']);

    const callback = () => {
        window.testProp = 'changed';
    };
    const observer = new MutationObserver(callback);

    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
    assert.strictEqual(typeof observer.observe, 'function', 'observer has observe method');
    assert.strictEqual(typeof observer.disconnect, 'function', 'observer has disconnect method');

    // Observe actual mutations to trigger callback execution and verify it is not executed
    observer.observe(document.body, { attributes: true });
    document.body.setAttribute('test-attr-prevent-1', 'value');

    setTimeout(() => {
        assert.strictEqual(window.testProp, 'initial', 'property is not changed by callback');
        observer.disconnect();
        // clean up
        document.body.removeAttribute('test-attr-prevent-1');
        done();
    }, 10);
});

test('Prevents MutationObserver - with matching callback', (assert) => {
    const done = assert.async();
    window.testProp = 'initial';

    runScriptlet(name, ['MutationObserver', 'testProp']);

    const callback = () => {
        window.testProp = 'value';
    };
    const observer = new MutationObserver(callback);

    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
    assert.strictEqual(typeof observer.observe, 'function', 'observer has observe method');

    // Observe actual mutations to trigger callback execution and verify it is not executed
    observer.observe(document.body, { attributes: true });
    document.body.setAttribute('test-attr-prevent-2', 'value');

    setTimeout(() => {
        assert.strictEqual(window.testProp, 'initial', 'property is not changed by callback');
        observer.disconnect();
        // clean up
        document.body.removeAttribute('test-attr-prevent-2');
        done();
    }, 10);
});

test('Prevents MutationObserver - regex match', (assert) => {
    const done = assert.async();
    window.testProp = 'initial';

    runScriptlet(name, ['MutationObserver', '/detect.*ad/i']);

    const callback = () => {
        window.testProp = 'changed';
        const detectTheAd = true;
        return detectTheAd;
    };
    const observer = new MutationObserver(callback);

    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
    assert.strictEqual(typeof observer.observe, 'function', 'observer has observe method');

    // Observe actual mutations to trigger callback execution and verify it is not executed
    observer.observe(document.body, { attributes: true });
    document.body.setAttribute('test-attr-prevent-3', 'value');

    setTimeout(() => {
        assert.strictEqual(window.testProp, 'initial', 'property is not changed by callback');
        observer.disconnect();
        // clean up
        document.body.removeAttribute('test-attr-prevent-3');
        done();
    }, 10);
});

test('Prevents Promise - no argument search', (assert) => {
    window.testProp = 'initial';

    runScriptlet(name, ['Promise']);

    // eslint-disable-next-line no-new
    new Promise(() => {
        window.testProp = 'changed';
    });

    assert.strictEqual(window.hit, 'FIRED', 'hit fired');

    // The original executor should not be called when prevented
    assert.strictEqual(window.testProp, 'initial', 'original callback was not executed');
});

test('Prevents Promise - with matching callback', (assert) => {
    window.testProp = 'initial';

    runScriptlet(name, ['Promise', 'checkAdblock']);

    // eslint-disable-next-line no-new
    new Promise(() => {
        const checkAdblock = 'yes';
        window.testProp = checkAdblock;
    });

    assert.strictEqual(window.hit, 'FIRED', 'hit fired');

    // The original executor should NOT be called when prevented
    assert.strictEqual(window.testProp, 'initial', 'original callback was not executed');
});

test('Does not prevent Promise - non-matching callback', (assert) => {
    window.testProp = 'initial';

    runScriptlet(name, ['Promise', 'nonExistent']);

    // eslint-disable-next-line no-new
    new Promise(() => {
        window.testProp = 'changed';
    });

    assert.strictEqual(window.hit, undefined, 'hit should not fire');

    assert.strictEqual(window.testProp, 'changed', 'property was changed by non-matching callback');
});

test('Noop observer methods work correctly', (assert) => {
    runScriptlet(name, ['MutationObserver']);

    const callback = () => {};
    const observer = new MutationObserver(callback);

    assert.strictEqual(window.hit, 'FIRED', 'hit fired');

    // These should not throw
    observer.observe(document.body, { childList: true });
    const records = observer.takeRecords();
    observer.disconnect();

    assert.ok(Array.isArray(records), 'takeRecords returns an array');
    assert.strictEqual(records.length, 0, 'takeRecords returns empty array');
});

test('Array syntax - match first argument', (assert) => {
    window.testProp = 'initial';

    runScriptlet(name, ['Promise', '["checkAdblock"]']);

    // eslint-disable-next-line no-new
    new Promise(() => {
        const checkAdblock = 'yes';
        window.testProp = checkAdblock;
    });

    assert.strictEqual(window.hit, 'FIRED', 'hit fired');

    assert.strictEqual(window.testProp, 'initial', 'original callback was not executed');
});

test('Array syntax - any first arg and specific second arg matching', (assert) => {
    const done = assert.async();
    window.testProp = 'initial';

    runScriptlet(name, ['MutationObserver', '["*", "attributes"]']);

    const callback = () => {
        window.testProp = 'changed';
    };

    // MutationObserver constructor takes (callback, options)
    // We're matching the second argument (options object)
    const observer = new MutationObserver(
        callback,
        {
            attributes: true,
            childList: false,
        },
    );

    assert.strictEqual(window.hit, 'FIRED', 'hit fired with second arg match');
    assert.strictEqual(typeof observer.observe, 'function', 'observer has observe method');

    // Observe actual mutations to trigger callback execution and verify it is not executed
    observer.observe(document.body, { attributes: true });
    document.body.setAttribute('test-attr-prevent-4', 'value');

    setTimeout(() => {
        assert.strictEqual(window.testProp, 'initial', 'original callback was not executed');
        observer.disconnect();
        // clean up
        document.body.removeAttribute('test-attr-prevent-4');
        done();
    }, 10);
});

test('Array syntax - wildcard skips first arg, no match on second', (assert) => {
    const done = assert.async();
    window.testProp = 'initial';

    runScriptlet(name, ['MutationObserver', '["*", "nonExistent"]']);

    const callback = () => {
        window.testProp = 'changed';
    };
    const observer = new MutationObserver(callback, { attributes: true });

    assert.strictEqual(window.hit, undefined, 'hit should not fire when second arg does not match');
    assert.ok(observer instanceof MutationObserver, 'observer is a real MutationObserver');

    // Observe actual mutations to trigger callback execution
    observer.observe(document.body, { attributes: true });
    document.body.setAttribute('test-attr', 'value');

    setTimeout(() => {
        assert.strictEqual(
            window.testProp,
            'changed',
            'original callback was executed because of non-matching second arg',
        );
        observer.disconnect();
        // Remove attribute to clean up
        document.body.removeAttribute('test-attr');
        done();
    }, 10);
});

test('Array syntax - pattern expects more args than provided', (assert) => {
    window.testProp = 'initial';

    runScriptlet(name, ['Promise', '["*", "secondArg"]']);

    // Promise only takes one argument, but pattern expects 2
    // eslint-disable-next-line no-new
    new Promise(() => {
        window.testProp = 'changed';
    });

    assert.strictEqual(window.hit, undefined, 'hit should not fire when args missing');

    assert.strictEqual(
        window.testProp,
        'changed',
        'callback executes normally because of non-matching second arg',
    );
});

test('Array syntax - multiple patterns should be matched', (assert) => {
    const done = assert.async();
    window.testProp = 'initial';

    runScriptlet(name, ['MutationObserver', '["/callback/", "attributes"]']);

    const callback = () => {
        window.testProp = 'changed';
    };
    const observer = new MutationObserver(callback, { attributes: true });

    assert.strictEqual(window.hit, 'FIRED', 'hit fired when both args match');
    assert.strictEqual(typeof observer.observe, 'function', 'observer has observe method');

    // Observe actual mutations to trigger callback execution and verify it is not executed
    observer.observe(document.body, { attributes: true });
    document.body.setAttribute('test-attr-prevent-5', 'value');

    setTimeout(() => {
        assert.strictEqual(window.testProp, 'initial', 'original callback was not executed as expected');
        observer.disconnect();
        // clean up
        document.body.removeAttribute('test-attr-prevent-5');
        done();
    }, 10);
});

test('Array syntax - first pattern matches but second does not', (assert) => {
    const done = assert.async();
    window.testProp = 'initial';

    runScriptlet(name, ['MutationObserver', '["callback", "childList"]']);

    const callback = () => {
        window.testProp = 'changed';
    };
    const observer = new MutationObserver(callback, { attributes: true });

    assert.strictEqual(window.hit, undefined, 'hit should not fire when second pattern fails');
    assert.ok(observer instanceof MutationObserver, 'observer is a real MutationObserver');

    // Observe actual mutations
    observer.observe(document.body, { attributes: true });
    document.body.setAttribute('test-attr2', 'value');

    setTimeout(() => {
        assert.strictEqual(
            window.testProp,
            'changed',
            'original callback was executed because of non-matching second arg',
        );
        observer.disconnect();
        // clean up
        document.body.removeAttribute('test-attr2');
        done();
    }, 10);
});

test('Array syntax - invalid JSON', (assert) => {
    const done = assert.async();
    window.testProp = 'initial';

    runScriptlet(name, ['MutationObserver', '["invalid json']);

    const callback = () => {
        window.testProp = 'changed';
    };
    const observer = new MutationObserver(callback);

    assert.strictEqual(window.hit, undefined, 'hit should not fire on invalid JSON');
    assert.ok(observer instanceof MutationObserver, 'observer is a real MutationObserver');

    // Observe actual mutations to trigger callback execution
    observer.observe(document.body, { attributes: true });
    document.body.setAttribute('test-attr3', 'value');

    setTimeout(() => {
        assert.strictEqual(
            window.testProp,
            'changed',
            'original callback was executed because of error in argumentsMatch',
        );
        observer.disconnect();
        // clean up
        document.body.removeAttribute('test-attr3');
        done();
    }, 10);
});

test('Array syntax - not an array', (assert) => {
    const done = assert.async();
    window.testProp = 'initial';

    runScriptlet(name, ['MutationObserver', '{"key": "value"}']);

    const callback = () => {
        window.testProp = 'changed';
    };
    const observer = new MutationObserver(callback);

    assert.strictEqual(window.hit, undefined, 'hit should not fire when JSON is not an array');
    assert.ok(observer instanceof MutationObserver, 'observer is a real MutationObserver');

    // Observe actual mutations to trigger callback execution
    observer.observe(document.body, { attributes: true });
    document.body.setAttribute('test-attr4', 'value');

    setTimeout(() => {
        assert.strictEqual(
            window.testProp,
            'changed',
            'original callback was executed because of non-array argumentsMatch',
        );
        observer.disconnect();
        // clean up
        document.body.removeAttribute('test-attr4');
        done();
    }, 10);
});

test('Array syntax - regex pattern in array', (assert) => {
    window.testProp = 'initial';

    runScriptlet(name, ['Promise', '["/check.*block/i"]']);

    // eslint-disable-next-line no-new
    new Promise(() => {
        const checkAdblock = 'yes';
        window.testProp = checkAdblock;
    });

    assert.strictEqual(window.hit, 'FIRED', 'hit fired with regex in array');

    assert.strictEqual(window.testProp, 'initial', 'original callback was not executed');
});

test('Array syntax - multiple patterns and multiple constructors', (assert) => {
    const done = assert.async();
    window.testProp = 'initial';

    runScriptlet(name, ['MutationObserver', '["/callback/", "attributes"]']);

    const callback1 = () => {
        window.testProp = 'changed1';
    };
    const observer1 = new MutationObserver(callback1, { attributes: true });

    assert.strictEqual(window.hit, 'FIRED', 'hit fired when both args match');
    assert.strictEqual(typeof observer1.observe, 'function', 'observer1 has observe method');

    const callback2 = () => {
        window.testProp = 'changed2';
    };
    const observer2 = new MutationObserver(callback2, { childList: true });

    assert.strictEqual(typeof observer2.observe, 'function', 'observer2 has observe method');

    // Observe actual mutations to trigger callback execution for observer1
    observer1.observe(document.body, { attributes: true });
    document.body.setAttribute('test-attr5', 'value');

    setTimeout(() => {
        assert.strictEqual(
            window.testProp,
            'initial',
            'original callback1 was not executed as expected',
        );
        observer1.disconnect();
        // clean up
        document.body.removeAttribute('test-attr5');

        // Now test observer2
        observer2.observe(document.body, { childList: true });
        const testDiv = document.createElement('div');
        document.body.appendChild(testDiv);

        setTimeout(() => {
            assert.strictEqual(
                window.testProp,
                'changed2',
                'original callback2 was executed because of not matching second arg',
            );
            observer2.disconnect();
            // clean up
            document.body.removeChild(testDiv);
            done();
        }, 10);
    }, 10);
});

test('Array syntax - all wildcards matches everything', (assert) => {
    const done = assert.async();
    window.testProp = 'initial';

    runScriptlet(name, ['MutationObserver', '["*", "*"]']);

    const callback = () => {
        window.testProp = 'changed';
    };
    const observer = new MutationObserver(callback, { attributes: true });

    assert.strictEqual(window.hit, 'FIRED', 'hit fired when all wildcards');
    assert.strictEqual(typeof observer.observe, 'function', 'observer has observe method');

    // Observe actual mutations to trigger callback execution and verify it is not executed
    observer.observe(document.body, { attributes: true });
    document.body.setAttribute('test-attr-prevent-6', 'value');

    setTimeout(() => {
        assert.strictEqual(window.testProp, 'initial', 'original callback was not executed');
        observer.disconnect();
        // clean up
        document.body.removeAttribute('test-attr-prevent-6');
        done();
    }, 10);
});

// Test for recursion prevention when constructorName is RegExp
// This verifies the fix for the issue where using RegExp as constructorName
// would cause "Maximum call stack size exceeded" because toRegExp() uses new RegExp() internally
test('Prevents RegExp - no infinite recursion with argumentsMatch', (assert) => {
    runScriptlet(name, ['RegExp', 'test']);

    // This should NOT cause infinite recursion.
    // The scriptlet uses toRegExp() internally which calls new RegExp().
    // eslint-disable-next-line prefer-regex-literals
    const regex = new RegExp('test-pattern');

    assert.strictEqual(window.hit, 'FIRED', 'hit fired for matching RegExp');
    assert.ok(regex instanceof RegExp, 'result is a RegExp instance');
    // When prevented, the scriptlet constructs with noopFunc, so source reflects that
    assert.notStrictEqual(regex.source, 'test-pattern', 'original pattern was not used');
});

test('Prevents RegExp - non-matching pattern passes through', (assert) => {
    runScriptlet(name, ['RegExp', 'blocked']);

    // This should pass through because pattern does not contain 'blocked'
    // eslint-disable-next-line prefer-regex-literals
    const regex = new RegExp('allowed');

    assert.strictEqual(window.hit, undefined, 'hit should not fire for non-matching');
    assert.ok(regex instanceof RegExp, 'result is a RegExp instance');
    assert.strictEqual(regex.source, 'allowed', 'regex has correct source');
});

test('Prevents RegExp - all calls without argumentsMatch', (assert) => {
    runScriptlet(name, ['RegExp']);

    // All RegExp constructor calls should be prevented
    // eslint-disable-next-line prefer-regex-literals
    const regex = new RegExp('anything');

    assert.strictEqual(window.hit, 'FIRED', 'hit fired for any RegExp');
    assert.ok(regex instanceof RegExp, 'result is a RegExp instance');
    // When prevented, the scriptlet constructs with noopFunc, so source reflects that
    assert.notStrictEqual(regex.source, 'anything', 'original pattern was not used');
});

test('Proxy toString returns native code string', (assert) => {
    runScriptlet(name, ['MutationObserver']);

    // Anti-adblock scripts often check if constructor.toString() contains [native code]
    const toStringResult = MutationObserver.toString();

    assert.ok(
        /\[native code\]/.test(toStringResult),
        'toString() returns native code string',
    );
    assert.strictEqual(
        toStringResult,
        nativeMutationObserver.toString(),
        'toString() matches the original constructor toString()',
    );
});

// Test that object arguments are JSON.stringified in plain string mode
// to prevent evasion by passing objects instead of strings
test('Plain string mode - object argument is JSON.stringified', (assert) => {
    window.testProp = 'initial';

    // Plain string mode should match object properties via JSON.stringify
    runScriptlet(name, ['Promise', 'adblock']);

    // Evasion attempt: pass an object with "adblock" in a property
    // Without the fix, String({ reason: 'adblock' }) would be "[object Object]" - no match
    // With the fix, JSON.stringify({ reason: 'adblock' }) is '{"reason":"adblock"}' - matches
    // eslint-disable-next-line no-new
    new Promise(() => {
        const data = { reason: 'adblock' };
        window.testProp = data;
    });

    assert.strictEqual(window.hit, 'FIRED', 'hit fired - object argument was JSON.stringified');
    assert.strictEqual(window.testProp, 'initial', 'original callback was not executed');
});

test('Plain string mode - nested object property is matched via JSON.stringify', (assert) => {
    window.testProp = 'initial';

    // Nested property should be found via JSON.stringify
    runScriptlet(name, ['Promise', 'detectAd']);

    // eslint-disable-next-line no-new
    new Promise(() => {
        const data = { nested: { check: 'detectAd' } };
        window.testProp = data;
    });

    assert.strictEqual(window.hit, 'FIRED', 'hit fired - nested object property was matched');
    assert.strictEqual(window.testProp, 'initial', 'original callback was not executed');
});

test('Multiple constructor calls - all matching calls should be prevented', (assert) => {
    window.testProp = 0;

    runScriptlet(name, ['Promise', 'adblock']);

    // First call with matching argument
    // eslint-disable-next-line no-new
    new Promise(() => {
        window.testProp += 1;
        // eslint-disable-next-line no-console
        console.log('adblock1');
    });

    // Second call with matching argument
    // eslint-disable-next-line no-new
    new Promise(() => {
        window.testProp += 1;
        // eslint-disable-next-line no-console
        console.log('adblock2');
    });

    // Third call with matching argument
    // eslint-disable-next-line no-new
    new Promise(() => {
        window.testProp += 1;
        // eslint-disable-next-line no-console
        console.log('adblock3');
    });

    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
    assert.strictEqual(window.testProp, 0, 'all matching constructor calls were prevented');
});

test('Multiple constructor calls - mixed matching and non-matching', (assert) => {
    window.testProp = 0;

    runScriptlet(name, ['Promise', 'adblock']);

    // First call with matching argument - should be prevented
    // eslint-disable-next-line no-new
    new Promise(() => {
        window.testProp += 1;
        // eslint-disable-next-line no-console
        console.log('adblock1');
    });

    // Second call with non-matching argument - should execute
    // eslint-disable-next-line no-new
    new Promise(() => {
        window.testProp += 10;
        // eslint-disable-next-line no-console
        console.log('normal');
    });

    // Third call with matching argument - should be prevented
    // eslint-disable-next-line no-new
    new Promise(() => {
        window.testProp += 100;
        // eslint-disable-next-line no-console
        console.log('adblock2');
    });

    assert.strictEqual(window.hit, 'FIRED', 'hit fired');
    assert.strictEqual(window.testProp, 10, 'only non-matching call was executed');
});
