/* eslint-disable no-extend-native */
import { test, expect, vi } from 'vitest';

import { restoreRegExpValues, backupRegExpValues, getRegexpTester } from '../../src/helpers';
import { useThrowingMethod } from '../helpers';

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

test('restoreRegExpValues() sets values with characters of regular expressions as they are', () => {
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
        restoreRegExpValues(['[', 'a.b', '(x)', 'a,b', '\\d+']);
        expect(consoleLog).not.toHaveBeenCalled();
    } finally {
        consoleLog.mockRestore();
    }
    expect(RegExp.$1).toBe('[');
    expect(RegExp.$2).toBe('a.b');
    expect(RegExp.$3).toBe('(x)');
    expect(RegExp.$4).toBe('a,b');
    expect(RegExp.$5).toBe('\\d+');
});

test('backupRegExpValues() saves all values, also empty ones', () => {
    /(sku-)?(\d+)/.exec('42');
    expect(backupRegExpValues()).toEqual(['', '42', '', '', '', '', '', '', '']);
});

test('restoreRegExpValues() restores values after an empty one', () => {
    /(sku-)?(\d+)/.exec('42');
    const values = backupRegExpValues();
    /(a)(b)(c)/.exec('abc');
    restoreRegExpValues(values);
    expect([RegExp.$1, RegExp.$2, RegExp.$3]).toEqual(['', '42', '']);
});

test('restoreRegExpValues() does not match anything if no value has changed', () => {
    /x(a)(b)y/.exec('xaby');
    const values = backupRegExpValues();
    restoreRegExpValues(values);
    // the last match is still the one of the page, not `ab` of the values
    expect(RegExp.lastMatch).toBe('xaby');
});

test.each([65536, 12000000])('restoreRegExpValues() restores a value of %i characters, without a log', (length) => {
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    const json = `{"ads":"${'x'.repeat(length)}"}`;
    try {
        // the long value is the last one, which is not counted, after a short one
        /(\d)<script>(.*)<\/script>/.exec(`7<script>${json}</script>`);
        const values = backupRegExpValues();
        /(ads)/.test(json);
        restoreRegExpValues(values);
        expect(consoleLog).not.toHaveBeenCalled();
    } finally {
        consoleLog.mockRestore();
    }
    expect(RegExp.$1).toBe('7');
    expect(RegExp.$2 === json).toBe(true);
});

/**
 * Captures a script and JSON in it, as the page may do, changes the values, and restores them.
 *
 * @param {number} length Length of the JSON.
 * @returns {number} Time of the restore, in ms.
 */
const restoreScriptAndJson = (length) => {
    const json = `{"ads":"${'x'.repeat(length)}"}`;
    const html = `<script>${json}</script>`;
    /(<script>(.*)<\/script>)/.exec(html);
    const values = backupRegExpValues();
    /(ads)/.test(json);
    const start = performance.now();
    restoreRegExpValues(values);
    const time = performance.now() - start;
    expect(RegExp.$1 === html && RegExp.$2 === json).toBe(true);
    return time;
};

test('restoreRegExpValues() restores a script and JSON in it in linear time', { retry: 3 }, () => {
    const minTime = (length) => {
        let min = Infinity;
        for (let i = 0; i < 5; i += 1) {
            min = Math.min(min, restoreScriptAndJson(length));
        }
        return min;
    };
    const time = minTime(16000);
    const timeOf4Times = minTime(64000);
    // about 4 times as long, while backtracking `*` before a count took about 16 times as long, e.g. 2.6 s
    expect(timeOf4Times / Math.max(time, 0.01)).toBeLessThan(10);
});

test('restoreRegExpValues() does not restore values counted for more than 1,000,000 characters', () => {
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    const long = 'x'.repeat(2000000);
    try {
        /^(.*)(y)$/.exec(`${long}y`);
        const values = backupRegExpValues();
        /(ads)/.test('ads');
        restoreRegExpValues(values);
        expect(consoleLog).not.toHaveBeenCalled();
    } finally {
        consoleLog.mockRestore();
    }
    expect(RegExp.$1).toBe('ads');
});

test('restoreRegExpValues() does not call String(), which a rule may intercept', () => {
    /(sku-)?(\d+)/.exec('42');
    const values = backupRegExpValues();
    /(a)(b)/.exec('ab');
    const restoreString = useThrowingMethod(window, 'String');
    try {
        restoreRegExpValues(values);
    } finally {
        restoreString();
    }
    expect([RegExp.$1, RegExp.$2]).toEqual(['', '42']);
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
