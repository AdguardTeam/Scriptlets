import { isEmptyObject } from '../../src/helpers';

const { test, module } = QUnit;
const name = 'scriptlets-redirects helpers';

module(name);

test('Test isEmptyObject works for different inputs', async (assert) => {
    const emptyObj = {};
    const obj = { a: 1 };
    const emptyArr = [];
    const arr = [1, 2, 3];
    function func() {}

    assert.ok(isEmptyObject(emptyObj), 'empty object returns true');
    assert.ok(isEmptyObject(emptyArr), 'empty array returns true');

    assert.notOk(isEmptyObject(obj), 'non-empty object returns false');
    assert.notOk(isEmptyObject(arr), 'non-empty array returns false');

    assert.notOk(isEmptyObject(EventTarget));
    assert.notOk(isEmptyObject(Array));
    assert.notOk(isEmptyObject(Object));
    assert.notOk(isEmptyObject(Function));
    assert.notOk(isEmptyObject(func));
});
