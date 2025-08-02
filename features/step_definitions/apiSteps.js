const {Given, When, Then} = require("@cucumber/cucumber");
const apiTool = require("../../commands/apiTools");
const {expect} = require("chai");
const {refreshPage} = require("crow/crowActions");
const {retryWithDelay} = require("crow/crowTools");

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