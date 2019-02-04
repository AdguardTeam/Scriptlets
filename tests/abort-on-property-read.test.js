const { test, module } = QUnit;
const name = 'abort-on-property-read';

module(name);
test('abort-on-property-read simple', (assert) => {
    const property = '___aaa';
    const params = {
        name,
        args: [property]
    };
    window[property] = 'value';
    const resString = window.scriptlets.invoke(params);
    eval(resString);
    assert.throws(
        () => window[property],
        /ReferenceError/,
        `should throw Reference error when try to access property ${property}`
    );
});

test('abort-on-property-read dot notation', (assert) => {
    const property = '___bbb.___ccc';
    const params = { name, args: [property] };
    window.___bbb = {
        ___ccc: 'value',
    };
    const resString = window.scriptlets.invoke(params);
    eval(resString);
    assert.throws(
        () => window.___bbb.___ccc,
        /ReferenceError/,
        `should throw Reference error when try to access property ${property}`
    );
});