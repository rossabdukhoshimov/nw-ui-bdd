const fetch = require('node-fetch')
const log = require('../crow/crowLog')
let tier = process.env.TEST_ENV
let role = 'ADMINISTRATOR'
let baseUrl = `https://sample-api-${tier}.net`;
let mocklabUrlTp = process.env.MOCKLAB_URL_TP_FOR_CM;
let tpsBaseUrl = `https://protocol-service-${tier}.net`;
let accessToken = {};

async function printWarningLog(functionName, goodStatusCodes, responseObj) {
    if (!goodStatusCodes.includes(responseObj.status)) {
        const respBody = await responseObj.json();
        log.warning(`${functionName}: response: ${responseObj.status}\n${JSON.stringify(respBody)}`);
    }
}

async function generateToken(env, role) {
    const tierUp = env.toUpperCase();
    const roleUp = role.toUpperCase();
    let client_id = process.env[`${tierUp}_OKTA_ID_${roleUp}`];
    let client_secret = process.env[`${tierUp}_OKTA_SECRET_${roleUp}`];
    let issuer = process.env[`SAMPLE_${tierUp}_OKTA_ISSUER_URL`];
    let resp = await fetch(`${issuer}/v1/token`, {
        method: 'POST',
        body: `grant_type=client_credentials&client_id=${client_id}&client_secret=${client_secret}`,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });
    if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
    const accessToken = await resp.json();
    return accessToken.access_token
}

async function getPtResponse(ptId) {
    let token = 'Bearer ' + await generateToken(tier, role);

    const response = await fetch(`${baseUrl}/v1/participants/${ptId}`, {
        method: 'GET',
        headers: {
            'Authorization': token,
            'Content-Type': 'application/json'
        }
    });
    return await response;
}

async function getPt(ptId) {
    let token = 'Bearer ' + await generateToken(tier, role);

    const response = await fetch(`${baseUrl}/v1/participants/${ptId}`, {
        method: 'GET',
        headers: {
            'Authorization': token,
            'Content-Type': 'application/json'
        }
    });
    await printWarningLog('getPt', [200], response);
    return await response.json();
}

async function getTpMockAssignmentOutcome(stubId, ptId) {
    const response = await fetch(`${mocklabUrlTp}/__admin/mappings/${stubId}`, {
        headers: {
            'Authorization': `Token ${process.env.MOCKLAB_TOKEN}`,
            'content-type': "application/json"
        }
    });
    await printWarningLog('getTpMockAssignmentOutcome', [200], response);
    const payload = await response.json();
    const { data } = payload;
    const ptData = await getPt(ptId);
    const arIndex = ptData['assignment_reports'][0]['metadata']['id'];
    const vrIndex = ptData['variant_reports'][0]['metadata']['id'];

    for (const item of data) {
        if (item['participant_id'] === ptId) {
            item['variant_report_id'] = vrIndex;
            item['assignment_report_id'] = arIndex;
        }
    }
    return payload;
}

async function arVrUpdate(stubId, ptId) {
    let payload = await getTpMockAssignmentOutcome(stubId, ptId);

    const response = await fetch(`${mocklabUrlTp}/__admin/mappings/${stubId}`, {
        method: 'POST',
        headers: {
            'Authorization': `Token ${process.env.MOCKLAB_TOKEN}`,
            'content-type': "application/json"
        },
        body: payload
    });
    await printWarningLog('arVrUpdate', [200], response);
    return await response.json();
}

async function ptEnrollment(ptId, data) {
    let token = 'Bearer ' + await generateToken(tier, role);

    const response = await fetch(`${baseUrl}/v1/participants/${ptId}/actions`, {
        method: 'POST',
        headers: {
            'Authorization': token,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    await printWarningLog('ptEnrollment', [200], response);
    return await response.json();
}

async function deleteProtocol(protocol_id) {
    log.debug("APP_UAT_OKTA_ISSUER_URL length:", process.env.APP_UAT_OKTA_ISSUER_URL ? process.env.APP_UAT_OKTA_ISSUER_URL.length : 0);
    log.debug("APP_UAT_OKTA_ID_ADMINISTRATOR length:", process.env.APP_UAT_OKTA_ID_ADMINISTRATOR ? process.env.APP_UAT_OKTA_ID_ADMINISTRATOR.length : 0);
    log.debug("APP_UAT_OKTA_SECRET_ADMINISTRATOR length:", process.env.APP_UAT_OKTA_SECRET_ADMINISTRATOR ? process.env.APP_UAT_OKTA_SECRET_ADMINISTRATOR.length : 0);

    const resp = await fetch(`${process.env.APP_UAT_OKTA_ISSUER_URL}/v1/token`, {
        method: 'POST',
        body: `grant_type=client_credentials&client_id=${process.env.APP_UAT_OKTA_ID_ADMINISTRATOR}&client_secret=${process.env.APP_UAT_OKTA_SECRET_ADMINISTRATOR}`,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });
    if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status}`);
    } else accessToken = await resp.json();

    let response = await fetch(`${tpsBaseUrl}/v2/studies/STUDY_ID/protocols/${protocol_id}`, {
        method: 'Delete',
        headers: {
            'Authorization': `${accessToken.token_type} ${accessToken.access_token}`,
            'Content-Type': 'application/json'
        }
    });
    await printWarningLog('deleteProtocol', [200, 404], response);
    return response
}

async function ptRegister(data) {
    let token = 'Bearer ' + await generateToken(tier, role);
    const response = await fetch(`${baseUrl}/v1/participants`, {
        method: 'POST',
        headers: {
            'Authorization': token,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    await printWarningLog('ptRegister', [201], response);
    return response
}

async function deletePt(ptId) {
    let token = 'Bearer ' + await generateToken(tier, role);

    const response = await fetch(`${baseUrl}/v1/participants/${ptId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': token,
            'Content-Type': 'application/json'
        }
    });
    await printWarningLog('deletePt', [200, 404], response);
    log.debug(`deletePt: response: ${response.status}`)
    return response
}

async function importScenario(scenarioId, labName, labPtId) {
    let token = 'Bearer ' + await generateToken(tier, role);
    let payload = {
        study_id: "STUDY_ID",
        scenario_id: scenarioId,
        lab_name: labName,
        lab_internal_id: labPtId
    }
    const response = await fetch(`${baseUrl}/v1/THIRD_PARTY/scenarios`, {
        method: 'POST',
        headers: {
            'Authorization': token,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    await printWarningLog('importScenario', [200, 201], response);
    return response
}

async function waitForPtStatus(ptId, statusList) {
    let token = 'Bearer ' + await generateToken(tier, role);
    let time = 0;
    let maxTime = 500;
    while (time < maxTime) {
        let resp = await this.getPt(ptId, token);
        log.debug(`${ptId} status is ${resp['current_participant_status']}, expecting ${statusList}`);
        if (statusList.includes(resp['current_participant_status'])) {
            log.debug(`${ptId} is ${statusList} status in ${time} seconds`);
            return true;
        }
        await new Promise(r => setTimeout(r, 5000));
        time = time + 5;
    }
    log.warning(`${ptId} is not ${statusList} status in ${maxTime} seconds`);
    return false;
}


module.exports = {
    generateToken,
    getPtResponse,
    getPt,
    getTpMockAssignmentOutcome,
    arVrUpdate,
    ptEnrollment,
    deleteProtocol,
    ptRegister,
    deletePt,
    importScenario,
    waitForPtStatus
}
