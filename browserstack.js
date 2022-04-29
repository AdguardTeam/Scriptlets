/* eslint-disable no-console,no-await-in-loop */
const webdriver = require('selenium-webdriver');
const BrowserStackLocal = require('browserstack-local');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const kleur = require('kleur');
const {
    server,
    port,
    start,
    stop,
} = require('./tests/server');

if (!process.env.TRAVIS) {
    dotenv.config();
}

const CAPABILITIES = [
    {
        browserName: 'Chrome',
        browserVersion: '55',
        os: 'Windows',
        osVersion: '10',
    },
    {
        browserName: 'Firefox',
        browserVersion: '52',
        os: 'Windows',
        osVersion: '10',
    },
    {
        browserName: 'Edge',
        browserVersion: '15',
        os: 'Windows',
        osVersion: '10',
    },
    {
        browserName: 'Safari',
        browserVersion: '10',
        os: 'OS X',
        osVersion: 'Sierra',
    },
];

const TESTS_DIST = './tests/dist';
const TEST_FILE_NAME_MARKER = '.html';

const bsLocal = new BrowserStackLocal.Local();

const bsOptions = {
    key: process.env.BROWSERSTACK_KEY,
};

const startBsLocal = () => {
    return new Promise((resolve, reject) => {
        console.log('Starting BrowserStackLocal...');

        try {
            bsLocal.start(bsOptions, () => {
                // Check if BrowserStack local instance is running
                console.log('BrowserStackLocal running:', bsLocal.isRunning());
                resolve();
            });
        } catch (e) {
            reject(e);
        }
    });
};

const stopBsLocal = () => {
    return new Promise((resolve, reject) => {
        console.log('Stopping BrowserStackLocal...');

        try {
            bsLocal.stop(() => {
                console.log('Stopped BrowserStackLocal');
                resolve();
            });
        } catch (e) {
            reject(e);
        }
    });
};

const formatTestResults = (testResults) => {
    const formattedTestEnds = testResults.map((testResult) => {
        const { name, status, runtime } = testResult;
        const statusStr = status === 'passed' ? kleur.green('✓') : kleur.red('✕');
        const nameStr = kleur.dim(`${name} (${runtime} ms`);
        return `${statusStr} ${nameStr})`;
    }).map((line) => `   ${line}`).join('\n');

    return formattedTestEnds;
};

const getCapabilityInfo = (capability) => {
    // eslint-disable-next-line max-len
    return `[${capability.os} ${capability.osVersion}, ${capability.browserName} ${capability.browserVersion}]`;
};

const printResult = (context, result) => {
    const { moduleEnds, testEnds } = result;

    if (moduleEnds.length > 1) {
        throw new Error('Function prints results only for one module');
    }

    const moduleEnd = moduleEnds[0];

    const formattedTestEnds = formatTestResults(testEnds);

    console.log(`${moduleEnd.name}\n${formattedTestEnds}`);
};

const printResults = (results) => {
    const moduleEnds = results.map((result) => {
        const { moduleEnds } = result;
        const moduleEnd = moduleEnds[0];
        return moduleEnd;
    });

    const passedModules = moduleEnds.filter((moduleEnd) => moduleEnd.status === 'passed');
    const notPassedModules = moduleEnds.filter((moduleEnd) => moduleEnd.status !== 'passed');

    const testEnds = results.map(({ testEnds }) => {
        return testEnds;
    }).flat();
    const passedTests = testEnds.filter((testEnd) => testEnd.status === 'passed');
    const notPassedTests = testEnds.filter((testEnd) => testEnd.status !== 'passed');

    const formatTestsString = (passed, notPassed, total) => {
        const testModulesStringsArr = [];
        if (notPassed.length > 0) {
            testModulesStringsArr.push(kleur.red(`${notPassed.length} failed`));
        }
        testModulesStringsArr.push(kleur.green(`${passed.length} passed`));
        testModulesStringsArr.push(`${total.length} total`);
        return testModulesStringsArr.join(', ');
    };

    console.log(`Test modules:\t${formatTestsString(passedModules, notPassedModules, moduleEnds)}`);
    console.log(`Tests:\t\t${formatTestsString(passedTests, notPassedTests, testEnds)}`);

    return notPassedModules.length === 0;
};

const addScriptletsData = (capability) => {
    const resultCapability = {
        ...capability,
        project: 'Scriptlets',
        name: `${getCapabilityInfo(capability)} Scriptlets`,
        'browserstack.local': 'true',
        'browserstack.debug': 'true',
        'browserstack.user': process.env.BROWSERSTACK_USER,
        'browserstack.key': process.env.BROWSERSTACK_KEY,
    };

    // only this selenium version support executeScript method
    if (capability.browserName === 'Edge') {
        resultCapability['browserstack.selenium_version'] = '4.0.0-beta-1';
    }

    return resultCapability;
};

const runTestsForFile = async (context, filename) => {
    console.log(`${getCapabilityInfo(context.capability)} ${filename}`);

    const { driver } = context;

    await driver.get(`http://localhost:${port}/${filename}`);

    // wait for testsFinished
    await driver.wait(() => {
        return driver.executeScript('return window && window.jsReporter && window.jsReporter.testsFinished');
    });

    /**
     * Use old browsers compatible syntax inside executeAsyncScript
     * as it would be executed in the context of the tested browser
     */
    const response = await driver.executeScript(() => {
        function getReporterResults(reporter) {
            return {
                moduleEnds: reporter.moduleEnds.map((moduleEnd) => {
                    return {
                        name: moduleEnd.name,
                        status: moduleEnd.status,
                        runtime: moduleEnd.runtime,
                    };
                }),
                testEnds: Object.keys(reporter.testEnds).map((testEndKey) => {
                    const testEnd = reporter.testEnds[testEndKey];
                    return {
                        name: testEnd.name,
                        status: testEnd.status,
                        runtime: testEnd.runtime,
                    };
                }),
            };
        }

        return getReporterResults(window.jsReporter);
    });

    return response;
};

const getTestFiles = () => {
    const dirPath = path.resolve(__dirname, TESTS_DIST);
    const testFiles = fs.readdirSync(dirPath, { encoding: 'utf8' })
        .filter((el) => el.includes(TEST_FILE_NAME_MARKER));

    return testFiles;
};

const runTestsForFiles = async (context, testFiles) => {
    const results = [];
    for (let i = 0; i < testFiles.length; i += 1) {
        const file = testFiles[i];
        try {
            const result = await runTestsForFile(context, file);
            results.push(result);
            printResult(context, result);
        } catch (e) {
            console.log(e);
        }
    }
    return results;
};

const runTestByCapability = async (context, rawCapability) => {
    const capability = addScriptletsData(rawCapability);
    context.capability = capability;

    const driver = new webdriver.Builder()
        .usingServer('http://hub.browserstack.com/wd/hub')
        .withCapabilities(capability)
        .build();

    context.driver = driver;

    const testFiles = getTestFiles();

    const start = Date.now();
    const results = await runTestsForFiles(context, testFiles);
    const allPassed = printResults(results);
    const end = Date.now();
    console.log(`Time: ${(end - start) / 1000} sec`);

    await driver.quit();

    if (!allPassed) {
        throw new Error('Not all tests passed');
    }
};

const runTests = async (context) => {
    let testsFailed = false;

    for (let i = 0; i < CAPABILITIES.length; i += 1) {
        const capability = CAPABILITIES[i];
        try {
            // eslint-disable-next-line no-await-in-loop
            await runTestByCapability(context, capability);
        } catch (e) {
            console.log(e.message);
            testsFailed = true;
        }
    }

    if (testsFailed) {
        throw new Error('Not all tests passed, or an error occurred');
    }
};

const main = async () => {
    const localServer = server.init();
    await start(localServer, port);
    await startBsLocal();
    const context = {};

    // correctly stop bsLocal and server on sigint
    process.on('SIGINT', async () => {
        console.log('Caught interrupt signal');
        await stopBsLocal();
        await stop(localServer);
        process.exit(1);
    });

    try {
        await runTests(context);
    } catch (e) {
        console.log(e.message);
        await stopBsLocal();
        process.exit(1);
    }

    await stopBsLocal();
    await stop(localServer);
};

main();
