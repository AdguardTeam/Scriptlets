module.exports = api => {
    const isTest = api.env('test');

    const config = {
        presets: [
            [
                '@babel/env',
                {
                    'modules': isTest ? 'auto' : false
                }
            ]
        ],
        plugins: [
            '@babel/plugin-transform-regenerator',
            '@babel/plugin-transform-runtime',
        ],
    }

    return config;
};