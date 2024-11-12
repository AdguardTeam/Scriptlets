/* eslint-disable no-eval, no-console, no-underscore-dangle */

import { getRedirectsInstance, evalWrapper } from '../helpers';

const { test, module } = QUnit;
const name = 'noeval';

const nativeEval = window.eval;
const nativeConsole = console.log;

const afterEach = () => {
    window.eval = nativeEval;
    console.log = nativeConsole;
};

let redirects;
const before = async () => {
    redirects = await getRedirectsInstance();
};

module(name, { afterEach, before });

test('Checking if alias name works', (assert) => {
    const codeByAdgParams = redirects.getRedirect(name).content;
    const codeByUboParams = redirects.getRedirect('ubo-silent-noeval.js').content;

    assert.strictEqual(codeByAdgParams, codeByUboParams, 'ubo name - ok');
});

test('AG noeval alias', (assert) => {
    evalWrapper(redirects.getRedirect(name).content);

    const evalStr = '2';

    // set assertions amount
    assert.expect(2);

    console.log = function log(input) {
        if (input.includes('trace')) {
            return;
        }
        assert.ok(input.includes(`${name}: AdGuard has prevented eval:`), 'console.hit should print info');
    };

    const innerEvalWrapper = eval;
    const actual = innerEvalWrapper(evalStr);

    assert.strictEqual(actual, undefined, 'result of eval evaluation should be undefined');
});
