import { isEmptyObject } from '../../src/helpers';

test('isEmptyObject() for different inputs', async () => {
    const emptyObj = {};
    const obj = { a: 1 };
    const emptyArr = [];
    const arr = [1, 2, 3];
    function func() {}

    expect(isEmptyObject(emptyObj)).toBeTruthy();
    expect(isEmptyObject(emptyArr)).toBeTruthy();

    expect(isEmptyObject(obj)).toBeFalsy();
    expect(isEmptyObject(arr)).toBeFalsy();
    expect(isEmptyObject(func)).toBeFalsy();

    expect(isEmptyObject(EventTarget)).toBeFalsy();
    expect(isEmptyObject(Array)).toBeFalsy();
    expect(isEmptyObject(Object)).toBeFalsy();
    expect(isEmptyObject(Function)).toBeFalsy();
});
