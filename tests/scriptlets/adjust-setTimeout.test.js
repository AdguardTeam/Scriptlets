/* eslint-disable no-underscore-dangle */
import {
    runScriptlet,
    clearGlobalProps,
    getRandomNumber,
} from '../helpers';

const { test, module } = QUnit;
const name = 'adjust-setTimeout';
const nativeSetTimeout = window.setTimeout;

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    window.setTimeout = nativeSetTimeout;
    clearGlobalProps('hit', '__debug', 'intervalValue', 'someKey');
};

module(name, { beforeEach, afterEach });

test('Checking if alias name works', (assert) => {
    const adgParams = {
        name,
        engine: 'test',
        verbose: true,
    };
    const uboParams = {
        name: 'ubo-nano-setTimeout-booster.js',
        engine: 'test',
        verbose: true,
    };

    const codeByAdgParams = window.scriptlets.invoke(adgParams);
    const codeByUboParams = window.scriptlets.invoke(uboParams);

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('no args', (assert) => {
    runScriptlet(name);

    const done = assert.async();

    const timeout = setTimeout(() => {
        window.intervalValue = 'value';
    }, 1000);

    nativeSetTimeout(() => {
        assert.strictEqual(window.intervalValue, 'value', 'Should be defined because default boost value equal 0.05');
        clearTimeout(timeout);
        done();
    }, 100);
});

test('only match param', (assert) => {
    const scriptletArgs = ['intervalValue'];
    runScriptlet(name, scriptletArgs);

    const done1 = assert.async();
    const done2 = assert.async();
    const done3 = assert.async();

    const timeout = setTimeout(() => {
        window.intervalValue = 'value';
    }, 1000);

    const regularTimeout = setTimeout(() => {
        window.someKey = 'value';
    }, 200);

    nativeSetTimeout(() => {
        assert.strictEqual(window.intervalValue, 'value', 'Should be defined because default boost value equal 0.05');
        clearTimeout(timeout);
        done1();
    }, 100);

    nativeSetTimeout(() => {
        assert.notOk(window.someKey);
        done2();
    }, 150);

    nativeSetTimeout(() => {
        assert.strictEqual(window.someKey, 'value', 'All others timeouts should be okay');
        clearTimeout(regularTimeout);
        done3();
    }, 250);
});

test('match param + timeout + no boost', (assert) => {
    const scriptletArgs = ['intervalValue', '500'];
    runScriptlet(name, scriptletArgs);

    const done = assert.async();

    const timeout = setTimeout(() => {
        window.intervalValue = 'value';
    }, 500);

    nativeSetTimeout(() => {
        assert.strictEqual(window.intervalValue, 'value', 'Should be defined because default boost value equal 0.05');
        clearTimeout(timeout);
        done();
    }, 50);
});

test('all params, boost > 1 (slowing)', (assert) => {
    const scriptletArgs = ['intervalValue', '100', '2'];
    runScriptlet(name, scriptletArgs);

    const done1 = assert.async();
    const done2 = assert.async();

    const timeout = setTimeout(() => {
        window.intervalValue = 'value';
    }, 100);

    nativeSetTimeout(() => {
        assert.notOk(window.intervalValue, 'Still not defined');
        done1();
    }, 150);

    nativeSetTimeout(() => {
        assert.strictEqual(window.intervalValue, 'value', 'Should be defined');
        clearTimeout(timeout);
        done2();
    }, 250);
});

test('all params, boost < 1 (boosting)', (assert) => {
    const scriptletArgs = ['intervalValue', '500', '0.2'];
    runScriptlet(name, scriptletArgs);

    const done1 = assert.async();
    const done2 = assert.async();

    const timeout = setTimeout(() => {
        window.intervalValue = 'value';
    }, 500); // scriptlet should make it '100'

    nativeSetTimeout(() => {
        assert.notOk(window.intervalValue, 'Still not defined');
        done1();
    }, 50);

    nativeSetTimeout(() => {
        assert.strictEqual(window.intervalValue, 'value', 'Should be defined');
        clearTimeout(timeout);
        done2();
    }, 150);
});

test('all params, boost < 1 (boosting 0.001)', (assert) => {
    const scriptletArgs = ['intervalValue', '100000', '0.001'];
    runScriptlet(name, scriptletArgs);

    const done1 = assert.async();
    const done2 = assert.async();

    const timeout = setTimeout(() => {
        window.intervalValue = 'value';
    }, 100000); // scriptlet should make it '100'

    nativeSetTimeout(() => {
        assert.notOk(window.intervalValue, 'Still not defined');
        done1();
    }, 50);

    nativeSetTimeout(() => {
        assert.strictEqual(window.intervalValue, 'value', 'Should be defined');
        clearTimeout(timeout);
        done2();
    }, 150);
});

test('all params, invalid boost value --> 0.05 by default', (assert) => {
    const scriptletArgs = ['intervalValue', '1000', 'abc'];
    runScriptlet(name, scriptletArgs);

    const done1 = assert.async();
    const done2 = assert.async();

    const timeout = setTimeout(() => {
        window.intervalValue = 'value';
    }, 1000); // scriptlet should make it '50'

    nativeSetTimeout(() => {
        assert.notOk(window.intervalValue, 'Still not defined');
        done1();
    }, 10);

    nativeSetTimeout(() => {
        assert.strictEqual(window.intervalValue, 'value', 'Should be defined');
        clearTimeout(timeout);
        done2();
    }, 80);
});

test('match param + wildcard timeout', (assert) => {
    const scriptletArgs = ['intervalValue', '*'];
    runScriptlet(name, scriptletArgs);

    const done = assert.async();

    const randomDelay = getRandomNumber(300, 500);
    const timeout = setTimeout(() => {
        window.intervalValue = 'value';
    }, randomDelay);

    nativeSetTimeout(() => {
        assert.strictEqual(window.intervalValue, 'value', 'Should be defined because default boost value equal 0.05');
        clearTimeout(timeout);
        done();
    }, 50);
});

test('match param + wildcard timeout + boost > 1 (slowing)', (assert) => {
    const scriptletArgs = ['intervalValue', '*', '2'];
    runScriptlet(name, scriptletArgs);

    const done1 = assert.async();
    const done2 = assert.async();

    const randomDelay = getRandomNumber(90, 110);
    const timeout = setTimeout(() => {
        window.intervalValue = 'value';
    }, randomDelay);

    nativeSetTimeout(() => {
        assert.notOk(window.intervalValue, 'Still not defined');
        done1();
    }, 150);

    nativeSetTimeout(() => {
        assert.strictEqual(window.intervalValue, 'value', 'Should be defined');
        clearTimeout(timeout);
        done2();
    }, 250);
});

test('no match', (assert) => {
    const scriptletArgs = ['no_match'];
    runScriptlet(name, scriptletArgs);

    const done1 = assert.async();
    const done2 = assert.async();

    const testValue = 'value';

    const testTimeout = setTimeout(() => {
        window.someKey = testValue;
    }, 100);

    setTimeout(() => {
        assert.strictEqual(window.someKey, undefined, 'Should not be defined yet');
        done1();
    }, 50);

    setTimeout(() => {
        assert.strictEqual(window.someKey, testValue, 'Should not be matched and work fine');
        clearInterval(testTimeout);
        done2();
    }, 150);
});

test('no match -- invalid regexp pattern', (assert) => {
    const scriptletArgs = ['/[0-9]++/'];
    runScriptlet(name, scriptletArgs, false);

    const done1 = assert.async();
    const done2 = assert.async();

    const testValue = 'value';

    const testTimeout = setTimeout(() => {
        window.someKey = testValue;
    }, 100);

    setTimeout(() => {
        assert.strictEqual(window.someKey, undefined, 'Should not be defined yet');
        done1();
    }, 50);

    setTimeout(() => {
        assert.strictEqual(window.someKey, testValue, 'Should not be matched and work fine');
        clearInterval(testTimeout);
        done2();
    }, 150);
});

test('no match -- invalid callback - undefined', (assert) => {
    const callback = undefined;

    let loggedMessage;
    // eslint-disable-next-line no-console
    console.log = function log(input) {
        if (input.includes('trace')) {
            return;
        }
        loggedMessage = input;
    };

    const scriptletArgs = ['.?'];
    runScriptlet(name, scriptletArgs);

    const testTimeout = setTimeout(callback, 100);

    assert.strictEqual(window.hit, undefined, 'hit should not fire');
    assert.strictEqual(
        loggedMessage,
        `${name}: Scriptlet can't be applied because of invalid callback: '${String(callback)}'`,
        'console.logged warning ok',
    );
    clearTimeout(testTimeout);
});
