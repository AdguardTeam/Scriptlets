import { rolldown, type RolldownOptions } from 'rolldown';
import chalk from 'chalk';

const { log } = console;

/**
 * Builds scriptlets using Rolldown (Rust-based bundler).
 *
 * @param config Single Rolldown config or an array of configs.
 */
export const rolldownStandard = async (config: RolldownOptions | RolldownOptions[]): Promise<void> => {
    const runOneConfig = async (oneConfig: RolldownOptions): Promise<void> => {
        log('Start building [rolldown]...', oneConfig.input);
        const build = await rolldown(oneConfig);
        if (Array.isArray(oneConfig.output)) {
            for (const outputOptions of oneConfig.output) {
                await build.write(outputOptions);
            }
        } else {
            await build.write(oneConfig.output);
        }
        log(chalk.greenBright('Successfully built [rolldown]'), oneConfig.input);
    };

    if (Array.isArray(config)) {
        for (const oneConfig of config) {
            await runOneConfig(oneConfig);
        }
    } else {
        await runOneConfig(config);
    }
};
