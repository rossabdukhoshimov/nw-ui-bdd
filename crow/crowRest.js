const fetch = require('node-fetch')

async function post(url, payloadString, headers) {
    return sendRequest('POST', url, payloadString, headers)
}

async function put(url, payloadString, headers) {
    return sendRequest('PUT', url, payloadString, headers)
}

async function patch(url, payloadString, headers) {
    return sendRequest('PATCH', url, payloadString, headers)
}

async function get(url, headers) {
    return sendRequest('GET', url, '', headers);

}

async function del(url, headers) {
    return sendRequest('DELETE', url, '', headers);
}

async function sendRequest(type, url, payloadString, headers) {
    console.log(`Sending ${type} request to ${url}`)
    let param = {
        method: type.toUpperCase(),
        headers: headers
    };
    if (payloadString !== '')
        param['body'] = payloadString
    let resp = await fetch(url, param);
    let code = await resp.status;
    let txt = await resp.text();
    try {
        if (code > 399)
            console.log(`HTTP CODE: ${code}, RESPONSE: ${txt}`);
        return {httpCode: code, message: txt, messageObj: JSON.parse(txt)}
    } catch (err) {
        console.log(`Cannot parse response as json, setting messageObj to {}, ERROR: ${err}`);
        return {httpCode: code, message: txt, messageObj: {}}
    }
}


module.exports = {
    get,
    post,
    put,
    patch,
    del
}