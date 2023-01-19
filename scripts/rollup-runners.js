import * as rollup from 'rollup';
import chalk from 'chalk';

const { log } = console;

/**
 * Builds scriptlets
 *
 * @param {object|object[]} config config may be list of configs or one config
 */
export const rollupStandard = async (config) => {
    const runOneConfig = async (config) => {
        log('Start building...', config.input);
        const bundle = await rollup.rollup(config);
        await bundle.write(config.output);
        log(chalk.greenBright('Successfully built'), config.input);
    };

    if (Array.isArray(config)) {
        for (const oneConfig of config) {
            await runOneConfig(oneConfig);
        }
    } else {
        await runOneConfig(config);
    }
};

/**
 * Builds scriptlets in the watch mode
 *
 * @param {object|object[]} config - config may be list of configs or one config
 */
export const rollupWatch = (config) => {
    const watcher = rollup.watch(config);
    watcher.on('event', (event) => {
        if (event.code === 'BUNDLE_START') {
            log('Start building...', event.input);
        }
        if (event.result) {
            event.result.close();
            log(chalk.yellowBright('Waiting for changes...'));
        }
    });
};
