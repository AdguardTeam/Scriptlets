module.exports = (api) => {
    api.cache(false);
    const config = {
        presets: [
            [
                '@babel/preset-env',
                {
                    exclude: [
                        // 'transform-typeof-symbol',
                        '@babel/plugin-transform-async-to-generator',
                        '@babel/plugin-transform-regenerator',
                        // '@babel/proposal-async-generator-functions',
                        // '@babel/plugin-transform-arrow-functions',
                    ],
                    // targets: [
                    //     'last 1 version',
                    //     '> 1%',
                    //     'not dead',
                    //     'not op_mini all',
                    //     'chrome >= 55',
                    //     'safari >= 11',
                    // ],
                },
            ],
        ],
        plugins: [
            // '@babel/plugin-transform-regenerator',
            '@babel/plugin-transform-runtime',
            // '@babel/plugin-transform-arrow-functions',
            // '@babel/plugin-proposal-class-properties',
            // '@babel/plugin-proposal-private-methods',
        ],
    };

    return config;
};
