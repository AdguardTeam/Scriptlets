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


test('Cookie works fine', (assert) => {
    const cName = '__test-cookie-name__';
    document.cookie = `${cName}=cookie`;
    assert.strictEqual(document.cookie.includes(cName), true, 'cookie was set');
});

test('Remove cookie by match', (assert) => {
    const cName = '__test-cookie-name__1';
    const cName1 = '__test-cookie-name__3';
    document.cookie = `${cName}=cookie`;
    document.cookie = `${cName1}=cookie`;
    runScriptlet(cName, hit);

    assert.strictEqual(window.hit, 'FIRED', 'Hit was fired');
    assert.strictEqual(document.cookie.includes(cName), false, 'Cookie by match was removed');
    assert.strictEqual(document.cookie.includes(cName1), true, 'Another cookies works');
});

test('Remove all cookies', (assert) => {
    const cName = '__test-cookie-name__2';
    document.cookie = `${cName}=cookie`;
    runScriptlet(null, hit);

    assert.strictEqual(window.hit, 'FIRED');
    assert.strictEqual(document.cookie.includes(cName), false, 'If no match delete all cookies for domain');
});
