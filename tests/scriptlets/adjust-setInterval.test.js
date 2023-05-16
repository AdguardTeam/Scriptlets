/* eslint-disable no-underscore-dangle */
import {
    runScriptlet,
    clearGlobalProps,
    getRandomNumber,
} from '../helpers';

const { test, module } = QUnit;
const name = 'adjust-setInterval';
const nativeSetInterval = window.setInterval;

const beforeEach = () => {
    window.__debug = () => {
        window.hit = 'FIRED';
    };
};

const afterEach = () => {
    window.setInterval = nativeSetInterval;
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
        name: 'ubo-nano-setInterval-booster.js',
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

    const interval = setInterval(() => {
        window.intervalValue = 'value';
    }, 1000);

    setTimeout(() => {
        assert.strictEqual(window.intervalValue, 'value', 'Should be defined because default boost value equal 0.05');
        clearInterval(interval);
        done();
    }, 100);
});

test('only match param', (assert) => {
    const scriptletArgs = ['intervalValue'];
    runScriptlet(name, scriptletArgs);

    const done1 = assert.async();
    const done2 = assert.async();
    const done3 = assert.async();

    const interval = setInterval(() => {
        window.intervalValue = 'value';
    }, 1000);

    const regularInterval = setInterval(() => {
        window.someKey = 'value';
    }, 200);

    setTimeout(() => {
        assert.strictEqual(window.intervalValue, 'value', 'Should be defined because default boost value equal 0.05');
        clearInterval(interval);
        done1();
    }, 100);

    setTimeout(() => {
        assert.notOk(window.someKey);
        done2();
    }, 150);

    setTimeout(() => {
        assert.strictEqual(window.someKey, 'value', 'All others timeouts should be okay');
        clearInterval(regularInterval);
        done3();
    }, 250);
});

test('match param + interval', (assert) => {
    const scriptletArgs = ['intervalValue', '500'];
    runScriptlet(name, scriptletArgs);

    const done = assert.async();

    const interval = setInterval(() => {
        window.intervalValue = 'value';
    }, 500);

    setTimeout(() => {
        assert.strictEqual(window.intervalValue, 'value', 'Should be defined because default boost value equal 0.05');
        clearInterval(interval);
        done();
    }, 50);
});

test('all params, boost > 1 (slowing)', (assert) => {
    const scriptletArgs = ['intervalValue', '100', '2'];
    runScriptlet(name, scriptletArgs);

    const done1 = assert.async();
    const done2 = assert.async();

    const interval = setInterval(() => {
        window.intervalValue = 'value';
    }, 100);

    setTimeout(() => {
        assert.notOk(window.intervalValue, 'Still not defined');
        done1();
    }, 150);

    setTimeout(() => {
        assert.strictEqual(window.intervalValue, 'value', 'Should be defined');
        clearInterval(interval);
        done2();
    }, 250);
});

test('all params, boost < 1 (boosting)', (assert) => {
    const scriptletArgs = ['intervalValue', '500', '0.2'];
    runScriptlet(name, scriptletArgs);

    const done1 = assert.async();
    const done2 = assert.async();

    const interval = setInterval(() => {
        window.intervalValue = 'value';
    }, 500); // scriptlet should make it '100'

    setTimeout(() => {
        assert.notOk(window.intervalValue, 'Still not defined');
        done1();
    }, 50);

    setTimeout(() => {
        assert.strictEqual(window.intervalValue, 'value', 'Should be defined');
        clearInterval(interval);
        done2();
    }, 150);
});

test('all params, boost < 1 (boosting 0.001)', (assert) => {
    const scriptletArgs = ['intervalValue', '100000', '0.001'];
    runScriptlet(name, scriptletArgs);

    const done1 = assert.async();
    const done2 = assert.async();

    const interval = setInterval(() => {
        window.intervalValue = 'value';
    }, 100000); // scriptlet should make it '100'

    setTimeout(() => {
        assert.notOk(window.intervalValue, 'Still not defined');
        done1();
    }, 50);

    setTimeout(() => {
        assert.strictEqual(window.intervalValue, 'value', 'Should be defined');
        clearInterval(interval);
        done2();
    }, 150);
});

test('all params, invalid boost value --> 0.05 by default', (assert) => {
    const scriptletArgs = ['intervalValue', '1000', 'abc'];
    runScriptlet(name, scriptletArgs);

    const done1 = assert.async();
    const done2 = assert.async();

    const interval = setInterval(() => {
        window.intervalValue = 'value';
    }, 1000); // scriptlet should make it '50'

    setTimeout(() => {
        assert.notOk(window.intervalValue, 'Still not defined');
        done1();
    }, 10);

    setTimeout(() => {
        assert.strictEqual(window.intervalValue, 'value', 'Should be defined');
        clearTimeout(interval);
        done2();
    }, 80);
});

test('match param + interval', (assert) => {
    const scriptletArgs = ['intervalValue', '*'];
    runScriptlet(name, scriptletArgs);

    const done = assert.async();

    const randomDelay = getRandomNumber(400, 500);
    const interval = setInterval(() => {
        window.intervalValue = 'value';
    }, randomDelay);

    setTimeout(() => {
        assert.strictEqual(window.intervalValue, 'value', 'Should be defined because default boost value equal 0.05');
        clearInterval(interval);
        done();
    }, 50);
});

test('all params, boost < 1 (boosting)', (assert) => {
    const scriptletArgs = ['intervalValue', '*', '0.2'];
    runScriptlet(name, scriptletArgs);

    const done1 = assert.async();
    const done2 = assert.async();

    const randomDelay = getRandomNumber(450, 500);
    const interval = setInterval(() => {
        window.intervalValue = 'value';
    }, randomDelay); // scriptlet should divide delay by 5

    setTimeout(() => {
        assert.notOk(window.intervalValue, 'Still not defined');
        done1();
    }, 50);

    setTimeout(() => {
        assert.strictEqual(window.intervalValue, 'value', 'Should be defined');
        clearInterval(interval);
        done2();
    }, 150);
});

test('no match', (assert) => {
    const scriptletArgs = ['no_match'];
    runScriptlet(name, scriptletArgs);

    const done1 = assert.async();
    const done2 = assert.async();

    const testValue = 'value';

    const testInterval = setInterval(() => {
        window.someKey = testValue;
    }, 100);

    setTimeout(() => {
        assert.strictEqual(window.someKey, undefined, 'Should not be defined yet');
        done1();
    }, 50);

    setTimeout(() => {
        assert.strictEqual(window.someKey, testValue, 'Should not be matched and work fine');
        clearInterval(testInterval);
        done2();
    }, 150);
});

test('no match -- invalid regexp pattern', (assert) => {
    const scriptletArgs = ['/\\/'];
    runScriptlet(name, scriptletArgs, false);

    const done1 = assert.async();
    const done2 = assert.async();

    const testValue = 'value';

    const testInterval = setInterval(() => {
        window.someKey = testValue;
    }, 100);

    setTimeout(() => {
        assert.strictEqual(window.someKey, undefined, 'Should not be defined yet');
        done1();
    }, 50);

    setTimeout(() => {
        assert.strictEqual(window.someKey, testValue, 'Should not be matched and work fine');
        clearInterval(testInterval);
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

    const testInterval = setInterval(callback, 100);

    assert.strictEqual(window.hit, undefined, 'hit should not fire');
    assert.strictEqual(
        loggedMessage,
        `${name}: Scriptlet can't be applied because of invalid callback: '${String(callback)}'`,
        'console.logged warning ok',
    );
    clearInterval(testInterval);
});
