/* eslint-disable no-extend-native */
import { test, expect } from 'vitest';

import { restoreRegExpValues, backupRegExpValues, getRegexpTester } from '../../src/helpers';

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

test('getRegexpTester() uses the method saved when it is called', () => {
    const nativeTest = RegExp.prototype.test;
    const testRegexp = getRegexpTester();
    try {
        // e.g. a rule which intercepts the method later
        RegExp.prototype.test = () => true;

        expect(testRegexp(/ads/, 'content')).toBe(false);
        expect(testRegexp(/ads/, 'no ads')).toBe(true);
    } finally {
        RegExp.prototype.test = nativeTest;
    }
});

test('getRegexpTester() calls the current method if it is an accessor, without reading it before', () => {
    const descriptor = Object.getOwnPropertyDescriptor(RegExp.prototype, 'test');
    let isReadAllowed = false;
    Object.defineProperty(RegExp.prototype, 'test', {
        configurable: true,
        get() {
            // e.g. `abort-current-inline-script` aborting the inline script of the rule
            if (!isReadAllowed) {
                throw new ReferenceError('aborted');
            }
            return descriptor.value;
        },
    });
    try {
        const testRegexp = getRegexpTester();
        isReadAllowed = true;

        expect(testRegexp(/ads/, 'content')).toBe(false);
        expect(testRegexp(/ads/, 'no ads')).toBe(true);
    } finally {
        Object.defineProperty(RegExp.prototype, 'test', descriptor);
    }
});
