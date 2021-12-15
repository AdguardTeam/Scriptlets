module.exports = (api) => {
    api.cache(false);
    const config = {
        presets: [
            [
                '@babel/env',
                {
                    exclude: ['transform-typeof-symbol'],
                },
            ],
        ],
        plugins: [
            '@babel/plugin-transform-regenerator',
            '@babel/plugin-transform-runtime',
            '@babel/plugin-proposal-class-properties',
            '@babel/plugin-proposal-private-methods',
        ],
    };

    return config;
};
