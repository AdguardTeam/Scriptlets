import { dts } from 'rolldown-plugin-dts';

const BUILD_DIST = 'dist';

const entryPoints = {
    index: 'src/index.ts',
    'scriptlets/index': 'src/scriptlets/index.ts',
    'redirects/index': 'src/redirects/index.js',
    'validators/index': 'src/validators/index.ts',
    'converters/index': 'src/converters/index.ts',
};

const scriptletsListConfig = {
    input: {
        'scriptlets-list': 'src/scriptlets/scriptlets-list.ts',
    },
    output: {
        dir: 'tmp',
        entryFileNames: '[name].js',
        format: 'esm',
    },
};

const redirectsListConfig = {
    input: {
        'redirects-list': 'src/redirects/redirects-list.js',
    },
    output: {
        dir: 'tmp',
        entryFileNames: '[name].js',
        format: 'esm',
    },
};

const redirectsPrebuildConfig = {
    input: {
        redirects: 'src/redirects/index.js',
    },
    output: {
        dir: 'tmp',
        entryFileNames: '[name].js',
        format: 'esm',
    },
};

const click2LoadScriptConfig = {
    input: {
        click2load: 'src/redirects/blocking-redirects/click2load.js',
    },
    output: {
        dir: 'tmp',
        entryFileNames: '[name].js',
        format: 'iife',
        name: 'click2load',
    },
};

const scriptletsConfig = {
    input: entryPoints,
    output: {
        dir: BUILD_DIST,
        format: 'esm',
        entryFileNames: '[name].js',
        chunkFileNames: 'common/[name].js',
        exports: 'named',
    },
    external: /^(js-yaml|@adguard\/agtree)/,
    resolve: {
        alias: {
            'scriptlets-func': 'tmp/scriptlets-func.js',
        },
    },
};

const typesConfig = {
    input: entryPoints,
    output: {
        dir: `${BUILD_DIST}/types`,
        format: 'esm',
        exports: 'named',
        preserveModules: true,
        preserveModulesRoot: 'src',
    },
    external: /^(js-yaml|@adguard\/agtree)/,
    plugins: [
        dts(),
    ],
    resolve: {
        alias: {
            'scriptlets-func': 'tmp/scriptlets-func.d.ts',
        },
    },
};

export {
    scriptletsConfig,
    scriptletsListConfig,
    redirectsListConfig,
    click2LoadScriptConfig,
    redirectsPrebuildConfig,
    typesConfig,
};
