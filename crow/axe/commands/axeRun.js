const util = require('util');
const fs = require('fs');
const log = require("../../crowLog");
const resultFolderPath = `${__dirname}/../../..${process.env.AXE_RESULT_FOLDER_PATH}`; // this path should take you to the root folder, you need to set ENV variable to your desired folder

module.exports.command = function axeRun(selector = 'html', options = {}) {

    this.executeAsync(function (selector, options, done) {

        (function (axe) {
            if (!axe) done({
                error: 'aXe not found. Make sure it has been injected'
            });
            var el = document.querySelector(selector);

            axe.run(el, options, function (err, results) {
                if (err) {
                    done({
                        error: err.toString()
                    })
                }
                done({
                    results: results
                })
            })
        })(window.axe)
    }, [selector, options], function (response) {
        const {
            results
        } = response.value;

        const {
            passes = [], violations = []
        } = results;

        for (const pass of passes)
            this.assert.ok(true, `aXe rule: ${pass.id} (${pass.nodes.length} elements checked)`);
        let criticalError = []
        for (const violation of violations) {
            let violationItem = {};
            let impact = violation.impact

            if (impact === 'serious' || impact === 'critical') {
                violationItem['impact'] = impact;
                violationItem['rule_id'] = violation.id;
                violationItem['description'] = `${violation.help}. For more information, visit: ${violation.helpUrl}`;
                violationItem['errors'] = [];
                for (let n = 0; n < violation.nodes.length; n++) {
                    let error = {};
                    const node = violation.nodes.at(n)
                    error[`failure_${n + 1}`] = node.failureSummary.replace(/:[\n]/g, ':').replace(/[\n]/g, ',');
                    // error['source'] = node.html;  // Codacy warning: Non-HTML variable 'error['source']' is used to store raw HTML
                    violationItem['errors'].push(error)
                }
                violationItem['error_count'] = violationItem['errors'].length;
                criticalError.push(violationItem);
            }
        }
        if (criticalError.length > 0) {
            let totalErrorCount = 0;
            for (const err of criticalError) totalErrorCount += err['error_count']
            log.debug(`CRITICAL ERROR COUNT: ${totalErrorCount}`);
            console.log(util.inspect(criticalError, false, null, true))
            let data = {
                "critical_error_count": totalErrorCount,
                "failures": criticalError
            }
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            fs.writeFileSync(`${resultFolderPath}/axe_failure_list.json`, JSON.stringify(data, null, 2)) //hardcoded json file name can be renamed to its scenario name in cucumber.conf.js After step
            throw new Error('Accessibility issues found')
        }
    });
    return this;
};
// Below is an example to rename the json file name in After step within cucumber.conf.js
// let cuc = require('./crow/crowCucumber');
// const fs = require('fs');
// ensure above 2 are set in cucumber.conf.js file

// let oldJsonFilePath = 'results/axe_results/axe_failure_list.json';
// let newJsonFilePath = `results/axe_results/${cuc.jsonFileNameForCucumberStudio(testCase)}`;
// fs.rename(oldJsonFilePath, newJsonFilePath, function (err) {
//     if (err) {console.log(err); return; }
//     console.log('The file has been re-named to: ' + newJsonFilePath);
// });
