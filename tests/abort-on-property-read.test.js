const { test, module } = QUnit;
const name = 'abort-on-property-read';

module(name);
test('abort-on-property-read', (assert) => {
    const property = 'testProp';
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