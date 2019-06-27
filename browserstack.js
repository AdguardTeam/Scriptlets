/* eslint-disable no-console */
const browserstackRunner = require('browserstack-runner');
const config = require('./browserstack.json');

if (!process.env.TRAVIS) {
    // eslint-disable-next-line global-require
    require('dotenv').config();
}

config.username = process.env.BROWSERSTACK_USER;
config.key = process.env.BROWSERSTACK_KEY;

browserstackRunner.run(config, (error) => {
    if (error) {
        console.log(`Error: ${error}`);
        return;
    }

    console.log('Test Finished');
});
