import { rolldown } from 'rolldown';
import chalk from 'chalk';

const { log } = console;

/**
 * Builds scriptlets using Rolldown (Rust-based bundler)
 *
 * @param {object|object[]} config config may be list of configs or one config
 */
export const rolldownStandard = async (config) => {
    const runOneConfig = async (config) => {
        log('Start building [rolldown]...', config.input);
        const build = await rolldown(config);
        if (Array.isArray(config.output)) {
            for (const outputOptions of config.output) {
                await build.write(outputOptions);
            }
        } else {
            await build.write(config.output);
        }
        log(chalk.greenBright('Successfully built [rolldown]'), config.input);
    };

    if (Array.isArray(config)) {
        for (const oneConfig of config) {
            await runOneConfig(oneConfig);
        }
    } else {
        await runOneConfig(config);
    }
};
