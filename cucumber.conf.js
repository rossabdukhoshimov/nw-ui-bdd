const fs = require('fs');
const {setDefaultTimeout, After, AfterAll, BeforeAll, Before} = require('@cucumber/cucumber');

const {initBrowser} = require('./crow/crowCore');
const {takeScreenshot} = require('./crow/crowActions');
const {alphaNumericOnly} = require('./crow/crowString');
let cuc = require('./crow/crowCucumber');
let log = require('./crow/crowLog');
let ptData = require('./commands/resetParticipant');
const {expect} = require('chai');


setDefaultTimeout(60000);

BeforeAll(async () => {
    log.debug(`Starting tests on ${process.env.NIGHTWATCH_ENV}`)
    await initBrowser(true);
});


Before(async function (testCase) {
    log.info(`RUNNING Scenario: ${cuc.scenarioName(testCase, true)}`);
    const scenarioName = cuc.scenarioName(testCase);
    const scenarioExampleId = cuc.scenarioExampleIndex(testCase);
    if (process.env.TEST_ENV === 'int') {
        const ptIdList = ptData.findParticipantId(scenarioName, scenarioExampleId);
        for (const ptId of ptIdList) {
            log.info(`Loading seed data ${ptId} for scenario: ${cuc.scenarioName(testCase, true)}`);
            const result = ptData.resetParticipant(ptId, false);
            expect(result, `expect reset participant data ${ptId} success`).to.be.true;
        }
    }
});

AfterAll(async () => {
    await global.browser.end();
});

After(async function (testCase) {
    const scenarioName = cuc.scenarioName(testCase);
    const scenarioExampleId = cuc.scenarioExampleIndex(testCase);
    if (process.env.TEST_ENV === 'int' && process.env.SKIP_AFTER_ACTION !== 'true') {
        const ptIdList = ptData.findParticipantId(scenarioName, scenarioExampleId);
        for (const ptId of ptIdList) {
            log.info(`Loading after actions ${ptId} for scenario: ${cuc.scenarioName(testCase, true)}`);
            const result = ptData.participantAfterActions(ptId);
            expect(result, `expect reset participant data ${ptId} success`).to.be.true;
        }
    }
    const testNameAlphaNumeric = alphaNumericOnly(cuc.scenarioName(testCase, true));
    const filePath = `${__dirname}/results/screenshots/${testNameAlphaNumeric}.png`;
    // const oldJsonFilePath = 'results/axe_results/axe_failure_list.json';
    // const newJsonFilePath = `results/axe_results/${testNameAlphaNumeric}.json`;
    // if (fs.existsSync(oldJsonFilePath)) {
    //     fs.rename(oldJsonFilePath, newJsonFilePath, function (err) {
    //         if (err) {
    //             log.error(err, false);
    //             return;
    //         }
    //         log.debug('The file has been re-named to: ' + newJsonFilePath);
    //     });
    // }
    if (cuc.isScenarioFailed(testCase))
        await takeScreenshot(filePath);
    else
        try {
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            fs.unlinkSync(filePath);
            log.debug(`Test passed, deleted screenshot ${filePath}, it may be created by previous failed attempt`);
        } catch (err) {
        }
});
