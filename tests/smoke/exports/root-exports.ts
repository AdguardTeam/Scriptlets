import { scriptlets, type Source } from '@adguard/scriptlets';
import { ok } from 'assert';

ok(scriptlets);

const config: Source = {
    name: 'log',
    args: [],
    engine: 'test',
    version: '1.0',
    verbose: true,
};

ok(scriptlets.invoke(config));
