const {Status} = require('@cucumber/cucumber');


//check if scenario failed is more useful than check passed, because you don't have to take screenshot if scenario undefined or skipped
function isScenarioFailed(cucumberTestCase) {
    return cucumberTestCase.result.status === Status.FAILED;
}

function scenarioName(cucumberTestCase, addExampleId = false) {
    let scenarioName = cucumberTestCase.pickle.name.split(/\(uid:(.*)\)/)[0].trim();
    if (addExampleId) {
        let exampleId = scenarioExampleIndex(cucumberTestCase);
        if (exampleId !== null)
            scenarioName = `${scenarioName} - Example #${exampleId + 1}`;
    }
    return scenarioName;
}

function findScenarioObj(cucumberTestCase) {
    let scenarioUuid = cucumberTestCase.pickle.astNodeIds[0];
    let children = cucumberTestCase.gherkinDocument.feature.children;
    let obj = children.find(child => child.scenario && child.scenario.id === scenarioUuid);
    return obj ? obj.scenario : obj;
}


function scenarioExampleIndex(cucumberTestCase) {
    let obj = findScenarioObj(cucumberTestCase);
    let exampleUuid = cucumberTestCase.pickle.astNodeIds[1];
    if (exampleUuid && obj.examples) {
        for (const example of obj.examples) // the reason that we don't use forEach here, is because forEach force to loop through ALL members, return doesn't work
            for (const [index, row] of example.tableBody.entries())
                if (row.id === exampleUuid)
                    return index;
    }
    return null;
}



module.exports = {
    isScenarioFailed,
    scenarioName,
    scenarioExampleIndex,
}