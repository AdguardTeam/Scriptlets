module.exports = {
    testEnvironment: 'jsdom',
    testRegex: '\\.spec\\.(js|ts)$',
    transform: {
        '^.+\\.(t|j)s?$': '@swc/jest',
    },
};
