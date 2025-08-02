const {Given, When, Then} = require("@cucumber/cucumber");
const apiTool = require("../../commands/apiTools");
const {expect} = require("chai");
const {refreshPage} = require("crow/crowActions");
const {retryWithDelay} = require("crow/crowTools");

Given(/^participant "([^"]*)" has not been registered$/, async (ptId) => {
    const result = await apiTool.deletePt(ptId);
    expect(result.status).to.be.oneOf([200, 404]);
    await retryWithDelay(async () => {
        const resp = await apiTool.getPtResponse(ptId);
        expect(resp.status).to.eq(404);
    }, `making sure participant ${ptId} is deleted`, 50, 200);
});
Given(/^I delete protocol "([^"]*)"$/, async (protocol) => {
    let resp = await apiTool.deleteProtocol(protocol);
    expect(resp.status).to.be.oneOf([200, 404]);
    await global.browser.pause(3000);
    await refreshPage();
});
Given(/^I register participant "([^"]*)" with the following information$/, async (ptId, dataTable) => {
    let table = dataTable.hashes()
    let data = table.reduce(function (r, e) {
        r[e.key] = e.value;
        return r;
    }, {});
    let drugs_list = data['prior_drugs'].split(',').map(str => str.trim())
    let demographics_list = data['demographics'].split(';').map(str => str.trim())
    let diseases_list = data['disease'].split(';').map(str => str.trim())
    let submitter_list = data['submitter'].split(',').map(str => str.trim())
    let physicians_choice_list = data['physicians_choice'].split(',').map(str => str.trim())
    let novel_amois_list = data['novel_amoi_submission_ids'].split(',').map(str => str.trim())
    let scenario_registration = []
    for (let sample of ['somatic', 'germline', 'ctdna']) {
        if (data[`${sample}_lab_name`]) {
            let item = {
                sample_type: sample.toUpperCase(),
                lab_name: data[`${sample}_lab_name`],
                lab_internal_id: data[`${sample}_lab_internal_id`],
                date_collected: data[`${sample}_date_collected`]
            };
            if (data[`${sample}_scenario_id`]) item['scenario_id'] = data[`${sample}_scenario_id`];
            scenario_registration.push(item);
        }
    }

    let payload = {
        participant_id: ptId,
        scenario_registration: scenario_registration,
        study_id: data['study_id'],
        ecog_score: Number(data['ecog_score']),
        hormone_receptor_status: data['hormone_receptor_status'],
        her2_status: data['her2_status'],
        demographics: {
            date_of_birth: demographics_list[0],
            ethnicity: demographics_list[1],
            gender: demographics_list[2],
            races: demographics_list[3].split(",")
        },
        disease: {
            morphology_term: diseases_list[0],
            morphology_code: diseases_list[1],
            behavior_code: Number(diseases_list[2]),
            grade_code: Number(diseases_list[3]),
            topography_term: diseases_list[4],
            topography_site: diseases_list[5],
            topography_subsite: diseases_list[6]
        },
        prior_drugs: [
            {
                drug_name: drugs_list[0],
                drug_id: drugs_list[1],
                drug_id_type: drugs_list[2],
            }
        ],
        physicians_choice: {
            protocol_id: physicians_choice_list[0],
            cohort_id: physicians_choice_list[1],
            stratum_id: physicians_choice_list[2],
            explanation: physicians_choice_list[3],
        },
        screening_protocol_step: Number(data['screening_protocol_step']),
        submitter: {
            name: submitter_list[0],
            email_address: submitter_list[1],
            enrolling_site: submitter_list[2],
        },
        novel_amoi_submission_ids: novel_amois_list
    }
    if ('her2' in data) {
        let her2_list = data['her2'].split(';').map(str => str.trim())
        payload['her2'] = {ihc_score: her2_list[0], fish_result: her2_list[1]}
        if (her2_list.length === 3) payload['her2']['fish_copy_number'] = Number(her2_list[2])
    }
    if ('scenario_id' in data) {
        payload.scenario_registration[0].scenario_id = data['scenario_id']
    }
    let resp = await apiTool.ptRegister(payload);
    expect(resp.status).to.equal(201);
});
When(/^oncology group send Sample the following "([^"]*)" message for the participant "([^"]*)"$/, async (event, ptId, dataTable) => {
    let table = dataTable.hashes()
    let data = table.reduce(function (r, e) {
        r[e.key] = e.value;
        return r;
    }, {});
    let payload;
    if (event === 'off treatment')
        payload = {
            study_id: 'STUDY_ID',
            action: data['action'],
            comment: data['comment'],
            reason: data['reason'],
            off_treatment_timestamp: data['off_treatment_timestamp'],
            consent_withdrawal_timestamp: data['consent_withdrawal_timestamp'],
            consent_withdrawal_status: data['consent_withdrawal_status'],
            consent_withdrawal_reason: data['consent_withdrawal_reason'],
            treatment_protocol_participant_id: data['treatment_protocol_participant_id'],
            assignment_details: {
                protocol_id: data['protocol_id'], cohort_id: data['cohort_id'],
                stratum_id: data['stratum_id'], treatment_regimen_id: data['treatment_regimen_id']
            },
            submitter: {
                name: "John Doe",
                email_address: "enrolling_site1@bddmail.test",
                enrolling_site: "Northwell Health/Center for Advanced Medicine"
            }
        }
    else if (event === 'off study')
        payload = {
            study_id: 'STUDY_ID',
            action: data['action'],
            comment: data['comment'],
            reason: data['reason'],
            off_study_timestamp: data['off_study_timestamp'],
            submitter: {
                name: "John Doe",
                email_address: "enrolling_site1@bddmail.test",
                enrolling_site: "Northwell Health/Center for Advanced Medicine"
            }
        }
    else if (event === 'crossover')
        payload = {
            study_id: 'STUDY_ID', action: data['action'], comment: data['comment'],
            treatment_protocol_participant_id: data['treatment_protocol_participant_id'],
            assignment_details: {
                protocol_id: data['protocol_id'],
                cohort_id: data['cohort_id'],
                stratum_id: data['stratum_id'],
                treatment_regimen_id: data['treatment_regimen_id']
            },
            screening_protocol_step: data['screening_protocol_step'],
            treatment_protocol_step: data['treatment_protocol_step'],
            submitter: {
                name: "John Doe",
                email_address: "enrolling_site1@bddmail.test",
                enrolling_site: "Northwell Health/Center for Advanced Medicine"
            }
        }
    else
        payload = {
            study_id: 'STUDY_ID', action: data['action'], comment: data['comment'],
            treatment_protocol_participant_id: data['treatment_protocol_participant_id'],
            assignment_details: {
                protocol_id: data['protocol_id'], cohort_id: data['cohort_id'],
                stratum_id: data['stratum_id'], treatment_regimen_id: data['treatment_regimen_id']
            },
            submitter: {
                name: "John Doe",
                email_address: "enrolling_site1@bddmail.test",
                enrolling_site: "Northwell Health/Center for Advanced Medicine"
            }
        }
    let response = await apiTool.ptEnrollment(ptId, payload);
    expect(response.code).to.equal('OK');
    const expStatuses = [
        'APPROVED: ENROLLED ON TREATMENT',
        'APPROVED: TREATMENT COMPLETE',
        'OFF STUDY',
        'APPROVED: ENROLLED ON TREATMENT - PENDING MIGRATION',
    ]
    await apiTool.waitForPtStatus(ptId, expStatuses)
    await global.browser.pause(5000);
    await refreshPage();
});
When(/I import THIRD_PARTY scenario "([^"]*)" to this participant with lab name "([^"]*)" and lab internal id "([^"]*)"$/, async (scenarioId, labName, labPtId) => {
    let resp = await apiTool.importScenario(scenarioId, labName, labPtId);
    expect(resp.status).to.equal(201);
    await global.browser.pause(5000);
    await refreshPage();
});
Then(/^in the assignment report for participant "([^"]*)" received by OPEN I should see the assignment reason "([^"]*)"$/, async (ptId, reason) => {
    throw new Error(`Research how to do this ${ptId} ${reason}`);
});
When(/^middleware system send Sample the following reregistration message for the participant "([^"]*)"$/, async (ptId, dataTable) => {
    let table = dataTable.hashes()
    let data = table.reduce(function (r, e) {
        r[e.key] = e.value;
        return r;
    }, {});
    let payload = {
        study_id: "STUDY_ID",
        action: 'REREGISTERED',
        dl_name: data['dl_name'],
        dl_participant_id: data['dl_participant_id'],
        scenario_id: data['scenario_id'],
        screening_protocol_step: Number(data['screening_protocol_step']),
        comment: data['comment'],
        submitter: {
            name: "John Doe",
            email_address: "enrolling_site1@bddmail.test",
            enrolling_site: "Northwell Health/Center for Advanced Medicine"
        },
        scenario_registration: []
    }
    let drugs_list = data['prior_drugs'].split(',').map(str => str.trim())
    payload.prior_drugs = [{drug_name: drugs_list[0], drug_id: drugs_list[1], drug_id_type: drugs_list[2]}]
    let demographics_list = data['demographics'].split(';').map(str => str.trim())
    payload.demographics = {
        date_of_birth: demographics_list[0],
        ethnicity: demographics_list[1], gender: demographics_list[2], races: demographics_list[3].split(",")
    }
    let diseases_list = data['disease'].split(';').map(str => str.trim())
    payload.disease = {
        morphology_term: diseases_list[0],
        morphology_code: diseases_list[1],
        behavior_code: diseases_list[2],
        grade_code: diseases_list[3],
        topography_term: diseases_list[4],
        topography_site: diseases_list[5],
        topography_subsite: diseases_list[6]
    }

    let response = await apiTool.ptEnrollment(ptId, payload);
    expect(response.code).to.equal('OK');
    await apiTool.waitForPtStatus(ptId, ['PRE-ASSIGNMENT: AWAITING DATA', 'ASSIGNED: PENDING ASSIGNMENT REVIEW'])
    await global.browser.pause(5000);
    await refreshPage();
});