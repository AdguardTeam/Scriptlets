module.exports = (api) => {
    api.cache(false);
    const config = {
        presets: [
            [
                '@babel/preset-env',
                {
                    exclude: [
                        '@babel/plugin-transform-async-to-generator',
                        '@babel/plugin-transform-regenerator',
                        '@babel/plugin-transform-typeof-symbol',
                        '@babel/plugin-transform-computed-properties',
                    ],
                    targets: [
                        'last 1 version',
                        '> 1%',
                        // ie 11 is dead and no longer supported
                        'not dead',
                        'chrome >= 55',
                        'firefox >= 52',
                        'edge >= 15',
                        'opera >= 42',
                        'safari >= 11',
                    ],
                },
            ],
            [
                '@babel/preset-typescript',
                {
                    optimizeConstEnums: true,
                },
            ],
        ],
        plugins: [
            '@babel/plugin-transform-runtime',
            '@babel/plugin-transform-arrow-functions',
            '@babel/plugin-transform-function-name',
        ],
    };

    return config;
};
