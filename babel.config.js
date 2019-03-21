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
        ],
    };

    return config;
};
