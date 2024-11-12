import { Redirects } from '@adguard/scriptlets/redirects';
import { isValidAdgRedirectRule } from '@adguard/scriptlets/validators';
import fs from 'node:fs/promises';
import assert from 'node:assert';

(async () => {
    const ymlFilePath = 'node_modules/@adguard/scriptlets/dist/redirects.yml';
    const ymlFile = await fs.readFile(ymlFilePath, 'utf-8');
    const redirects = new Redirects(ymlFile);
    const redirect = redirects.getRedirect('noopjs');
    assert.ok(redirect);
    assert.ok(redirect.title === 'noopjs');
})();

assert.ok(isValidAdgRedirectRule('example.org$redirect=noopjs'));
