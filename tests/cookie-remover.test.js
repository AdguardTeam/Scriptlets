/* global QUnit */
/* eslint-disable no-eval */
const { test, module, testDone } = QUnit;
const name = 'cookie-remover';

module(name);

const evalWrapper = eval;

const runScriptlet = (match, hit) => {
    const params = {
        name,
        args: [match],
        hit,
    };
    const resultString = window.scriptlets.invoke(params);
    evalWrapper(resultString);
};

testDone(() => {
    delete window.hit;
});

const hit = () => {
    window.hit = 'FIRED';
};


test('Cookie works ', (assert) => {
    const cName = '__test-cookie-name__1';
    document.cookie = `${cName}=cookie`;
    const res = document.cookie.includes(cName);
    assert.strictEqual(res, true);
});

test('Remove cookie by match ', (assert) => {
    document.cookie = '__test-cookie-name__=cookie';
    runScriptlet('__test-cookie-name__', hit);

    assert.strictEqual(window.hit, 'FIRED');
    const res = document.cookie.includes('__test-cookie-name__');
    assert.strictEqual(res, false);
});
