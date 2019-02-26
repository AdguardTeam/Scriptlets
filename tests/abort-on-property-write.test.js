const { test, module } = QUnit;
const name = 'abort-on-property-write';

module(name);
test('abort-on-property-write: ubo alias, set prop for existed prop', (assert) => {
    const property = 'aaa';
    const params = {
        name: `ubo-${name}.js`,
        args: [property]
    };
    window[property] = 'value';
    const resString = window.scriptlets.invoke(params);
    eval(resString);
    assert.throws(
        () => window[property] = 'new value',
        /ReferenceError/,
        `should throw Reference error when try to write property ${property}`
    );
});

test('abort-on-property-write: abp alias, set prop for existed prop', (assert) => {
    const property = 'bbb';
    const params = {
        name: `abp-${name}`,
        args: [property]
    };
    window[property] = 'value';
    const resString = window.scriptlets.invoke(params);
    eval(resString);
    assert.throws(
        () => window[property] = 'new value',
        /ReferenceError/,
        `should throw Reference error when try to write property ${property}`
    );
});

test('abort-on-property-write: adg alias, set prop for existed prop', (assert) => {
    const property = 'ccc';
    const params = {
        name,
        args: [property]
    };
    window[property] = 'value';
    const resString = window.scriptlets.invoke(params);
    eval(resString);
    assert.throws(
        () => window[property] = 'new value',
        /ReferenceError/,
        `should throw Reference error when try to access property ${property}`
    );
});

test('abort-on-property-write dot notation', (assert) => {
    const property = 'ddd.eee';
    const params = { name, args: [property] };
    window.ddd = {
        eee: 'value',
    };
    const resString = window.scriptlets.invoke(params);
    eval(resString);
    assert.throws(
        () => window.ddd.eee = 'new value',
        /ReferenceError/,
        `should throw Reference error when try to access property ${property}`
    );
});

test('abort-on-property-write dot notation deferred defenition', (assert) => {
    const property = 'fff.ggg';
    const params = { name, args: [property] };
    const resString = window.scriptlets.invoke(params);
    eval(resString);
    window.fff = {};
    assert.throws(
        () => window.fff.ggg = 'new value',
        /ReferenceError/,
        `should throw Reference error when try to access property ${property}`
    );
});