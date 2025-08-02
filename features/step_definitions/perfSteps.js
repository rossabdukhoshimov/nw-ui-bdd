const {Given, When, Then} = require("@cucumber/cucumber");
const fs = require("fs");
const path = require('path');
const {expect} = require('chai');
const REPORT_FOLDER = `${__dirname}/../../perf_test_report`;
const ARTILLERY_CONFIG_FOLDER = `${__dirname}/../../performance_test/test-configs`;
const PERF_ENV = 'uat'
const {validateFilePath} = require('../../crow/crowTools');
const {generateToken} = require('../../commands/apiTools');
const {runShell} = require('../../commands/utilities')
const FAILED = 'Failed';
const PASSED = 'Passed';
const SAVED_REPORT_PATH = `${__dirname}/../../perf_test_report`;
const FAILED_EMOJI = ':heavy_multiplication_x:';
const PASSED_EMOJI = ':check1:';

Given(/^the artillery performance test is authorized with "([^"]*)" tier "([^"]*)" API credentials$/, async function (tier, role) {
    expect(tier).to.be.oneOf(['INT', 'UAT'])
    console.log("Generating token...");  // Debugging
    this.oktaToken = await generateToken(tier, role);
    console.log(`A ${this.oktaToken.length} token is generated.`);
});
When(/^the artillery run performance test for scenario "([^"]*)" to generate report "([^"]*)"$/, async function (testFile, reportFile) {
    this.testFilePath = path.join(ARTILLERY_CONFIG_FOLDER, testFile);
    const reportPath = path.join(REPORT_FOLDER, reportFile);
    process.env.OKTA_TOKEN = this.oktaToken;
    runShell('npx', ['artillery', 'run', this.testFilePath, '--output', reportPath, '-e', PERF_ENV]);
    validateFilePath(reportPath, [`${REPORT_FOLDER}`], ['yml'])
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    this.perfReportData = JSON.parse(fs.readFileSync(reportPath, "utf8"));
});
Then(/^in the generated performance test report, the endpoints should pass the following thresholds$/, async function (dataTable) {
    let fullReport = []
    for (const row of dataTable.hashes()) {
        const endpoint = row.endpoint;
        const aggregate = this.perfReportData.aggregate;
        fullReport.push(reportForEndpoint(endpoint, aggregate, row));
    }
    saveReport(slackReport(fullReport), path.basename(this.testFilePath));
    if (fullReport.some(r => r.verdict === FAILED)) throw new Error(cucumberReport(fullReport));
});
function reportForEndpoint(endpoint, aggregate, expectTable) {
    let report = {endpoint: endpoint, verdict: PASSED, items: []};
    const metrics = aggregate.summaries[`plugins.metrics-by-endpoint.response_time.${endpoint}`];
    const m = `No metrics found for endpoint [${endpoint}]`
    if (!metrics) return {endpoint: endpoint, verdict: FAILED, items: [{verdict: FAILED, message: m}]};
    for (const [key, value] of Object.entries(expectTable)) {
        if (key === 'endpoint') continue;
        else if (key === 'error_rate')
            pushErrorRateReport(endpoint, aggregate, value, report);
        else pushTimeReport(metrics, key, value, report);
    }
    return report;
}
function pushErrorRateReport(endpoint, aggregate, expectRate, report) {
    const totalRequests = aggregate.summaries[`plugins.metrics-by-endpoint.response_time.${endpoint}`]['count'];
    let totalErrors = 0;
    for (const [key, value] of Object.entries(aggregate.counters)) {
        if (key.startsWith(`plugins.metrics-by-endpoint.${endpoint}.codes.4`)
            || key.startsWith(`plugins.metrics-by-endpoint.${endpoint}.codes.5`)) {
            totalErrors += value;
        }
    }
    const errorRate = totalErrors / totalRequests;
    const verdict = errorRate > parseFloat(expectRate) ? FAILED : PASSED;
    const msg = `the request error rate cap: expect ${expectRate}, got ${totalErrors}/${totalRequests}=${errorRate}`;
    report.items.push({ verdict, message: msg });
    if (verdict === FAILED) report.verdict = FAILED;
}
function pushTimeReport(metrics, metricName, expectTime, report) {
    const expected = parseInt(expectTime, 10);
    // eslint-disable-next-line security/detect-object-injection
    const actual = metrics?.[metricName];
    const verdict = actual > expected ? FAILED : PASSED;
    report.items.push({
        verdict,
        message: `response time cap [${metricName}]: expect ${expected}ms, got ${actual}ms`
    });
    if (verdict === FAILED) {
        report.verdict = FAILED;
    }
}
function cucumberReport(report) {
    let list = [];
    for (const endpoint of report) {
        let thisString = `=== For endpoint [${endpoint.endpoint}]: ${endpoint.verdict}`;
        for (const item of endpoint.items) thisString += `\n  ${item.verdict}: ${item.message}`;
        list.push(`${thisString}`);
    }
    return list.join('\n');
}
function verdictEmoji(verdict) {
    return verdict === PASSED ? PASSED_EMOJI : FAILED_EMOJI;
}
function slackReport(report) {
    let list = [];
    for (const endpoint of report) {
        let thisString = `*${endpoint.endpoint}*`;
        for (const item of endpoint.items) thisString += `\n> ${verdictEmoji(item.verdict)} ${item.message} `;
        list.push(`${thisString}`);
    }
    return list.join('\n');
}
function saveReport(content, title) {
    const filePath = `${SAVED_REPORT_PATH}/${title}.txt`;
    const string = `*-----------------  ${title}  -----------------*\n${content}`;
    try {
        validateFilePath(filePath, [`${SAVED_REPORT_PATH}`], ['txt']);
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        fs.writeFileSync(filePath, string, 'utf8');
        console.log(`Test report for ${title} saved to ${filePath}`);
    } catch (error) {
        console.error(`Error saving file ${filePath}: ${error.message}`);
    }
}