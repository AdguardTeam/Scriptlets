import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            // See tests/api/node-qunit-puppeteer.stub.ts — the mocked packages
            // are not installed in CI's filtered non-browser stages.
            // Separate stub files are required: Vitest keys its mock registry
            // by resolved path, so one shared stub would make the two
            // `vi.mock` factories collide.
            'node-qunit-puppeteer': fileURLToPath(new URL('tests/api/node-qunit-puppeteer.stub.ts', import.meta.url)),
            puppeteer: fileURLToPath(new URL('tests/api/puppeteer.stub.ts', import.meta.url)),
        },
    },
    test: {
        environment: 'jsdom',
        // Include test files matching .spec.js or .spec.ts
        include: ['**/*.spec.[jt]s'],
    },
});
