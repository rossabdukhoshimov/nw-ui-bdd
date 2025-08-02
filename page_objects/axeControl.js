
async function checkSection508Compliance(selector, rules = null) {
    const criticalError = [];

    await global.browser.axeInject().axeRun(selector, rules, (result) => {
        const issues = result.violations;
        for (const issue of issues) {
            if (issue.impact === 'serious' || issue.impact === 'critical') {
                const violationItem = {
                    impact: issue.impact,
                    rule_id: issue.id,
                    description: `${issue.help}. For more information, visit: ${issue.helpUrl}`,
                    errors: []
                };
                for (const [index, node] of issue.nodes.entries()) {
                    const error = {
                        [`failure_${index + 1}`]: node.failureSummary.replace(/:[\n]/g, ':').replace(/[\n]/g, ','),
                        // eslint-disable-next-line security/detect-no-mixed-html
                        source: node.html
                    };
                    violationItem.errors.push(error);
                }
                violationItem.error_count = violationItem.errors.length;
                criticalError.push(violationItem);
            }
        }
    });

    if (criticalError.length > 0) {
        const totalErrorCount = criticalError.reduce((acc, item) => acc + item.error_count, 0);
        const data = {
            CRITICAL_ERROR_COUNT: totalErrorCount,
            FAILURES: criticalError
        };
        await global.browser.assert.fail(JSON.stringify(data, null, 2));
    }
}

module.exports = {
    checkSection508Compliance,
};
