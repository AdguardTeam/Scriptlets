import { test, expect } from 'vitest';

import { restoreRegExpValues, backupRegExpValues } from '../../src/helpers';

test('restoreRegExpValues() check if correct value have been set', async () => {
    restoreRegExpValues(['foo']);
    expect(RegExp.$1).toBe('foo');
    expect(RegExp.$2).toBe('');
});

test('restoreRegExpValues() check if correct values have been set', async () => {
    restoreRegExpValues(['test', 'abc', 'xyz', 'aaaa', '123']);
    expect(RegExp.$1).toBe('test');
    expect(RegExp.$2).toBe('abc');
    expect(RegExp.$3).toBe('xyz');
    expect(RegExp.$4).toBe('aaaa');
    expect(RegExp.$5).toBe('123');
    expect(RegExp.$6).toBe('');
});

test('backupRegExpValues() and restoreRegExpValues(), modify values and restore them', async () => {
    const regExp = /(\w+)\s(\w+)/;
    const string = 'div a';
    string.replace(regExp, '$2, $1');

    expect(RegExp.$1).toBe('div');
    expect(RegExp.$2).toBe('a');

    const backupRegexp = backupRegExpValues();

    const regExp2 = /(\w+)\s(\w+)/;
    const string2 = 'qwerty zxcvbn';
    string2.replace(regExp2, '$2, $1');

    expect(RegExp.$1).toBe('qwerty');
    expect(RegExp.$2).toBe('zxcvbn');

    restoreRegExpValues(backupRegexp);

    expect(RegExp.$1).toBe('div');
    expect(RegExp.$2).toBe('a');
});
