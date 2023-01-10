import { parseRawDelay } from '../../src/helpers';

const { test, module } = QUnit;
const name = 'scriptlets-redirects helpers';

module(name);
test('Test parseRawDelay', (assert) => {
    assert.strictEqual(parseRawDelay(0), 0, 'parsing number ok');
    assert.strictEqual(parseRawDelay(10), 10, 'parsing number ok');
    assert.strictEqual(parseRawDelay(10.123), 10, 'parsing number ok');

    assert.strictEqual(parseRawDelay('0'), 0, 'parsing number in string ok');
    assert.strictEqual(parseRawDelay('10'), 10, 'parsing number in string ok');
    assert.strictEqual(parseRawDelay('10.123'), 10, 'parsing number in string ok');

    assert.strictEqual(parseRawDelay('string'), 'string', 'parsing string ok');

    assert.strictEqual(parseRawDelay(null), null, 'parsing other types ok');
    assert.strictEqual(parseRawDelay(undefined), undefined, 'parsing other types ok');
    assert.strictEqual(parseRawDelay(false), false, 'parsing other types ok');
    // as NaN !== NaN
    assert.strictEqual(parseRawDelay(NaN).toString(), 'NaN', 'parsing other types ok');
});
