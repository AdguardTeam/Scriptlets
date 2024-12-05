import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'jsdom',
        // Include test files matching .spec.js or .spec.ts
        include: ['**/*.spec.[jt]s'],
    },
});
