const fs = require('fs/promises');
const {sendToBrowserLog} = require('./crowCore');
const log = require('./crowLog');
const jwt = require('jsonwebtoken');

async function fileExists(filePath) {
    try {
        await fs.access(filePath, fs.constants.F_OK);
        return true;
    } catch (error) {
        return false;
    }
}

// Helper function to check if the token is expired
function isTokenValid(token) {
    let result = false;
    try {
        const decodedToken = jwt.decode(token);
        const currentTimestamp = Math.floor(Date.now() / 1000);
        result = decodedToken.exp > currentTimestamp;
    } catch (error) {
        log.debug(`isTokenValid: false, reason: ${error}`)
    }
    return result;
}


// Helper function to find the access token in storage
async function getDownloadedSessionData(sessionDataPath) {
    let result = {};
    if (await fileExists(sessionDataPath)) {
        try {
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            result = JSON.parse(await fs.readFile(sessionDataPath, 'utf-8'));
        } catch (error) {
            log.debug(`getDownloadedSessionData: cannot load session data file: ${error}`)
        }
    } else
        log.debug(`getDownloadedSessionData: ${sessionDataPath} does not exist, returning empty session data`)
    return result;
}

// Helper function to load session data
async function loadLocalStorageToBrowser(sessionDataPath, keys = null, waitAfter = 0) {
    await sendToBrowserLog(`Loading local storage data from ${sessionDataPath}`);
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const sessionData = JSON.parse(await fs.readFile(sessionDataPath, 'utf-8'));
    const localStorageData = sessionData.localStorage;
    const targetKeys = keys === null ? Object.keys(localStorageData) : keys;
    for (const [key, value] of Object.entries(localStorageData)) {
        if (targetKeys.includes(key)) {
            await global.browser.execute(function (key, value) {
                if (typeof value === 'object') value = JSON.stringify(value)
                localStorage.setItem(key, value);
            }, [key, value]);
        }
    }
    if (waitAfter > 0) await global.browser.pause(waitAfter);
}

async function loadSessionStorageToBrowser(sessionDataPath, keys = null, waitAfter = 0) {
    await sendToBrowserLog(`Loading session storage data from ${sessionDataPath}`);
    const sessionData = JSON.parse(await fs.readFile(sessionDataPath, 'utf-8'));
    const sessionStorageData = sessionData.sessionStorage;
    const targetKeys = keys === null ? Object.keys(sessionStorageData) : keys;
    for (const [key, value] of Object.entries(sessionStorageData)) {
        if (targetKeys.includes(key)) {
            await global.browser.execute(function (key, value) {
                if (typeof value === 'object') value = JSON.stringify(value)
                sessionStorage.setItem(key, value);
            }, [key, value]);
        }
    }
    if (waitAfter > 0) await global.browser.pause(waitAfter);
}


// Helper function to save session data with retry
async function downloadBrowserSessionData(sessionDataPath, waitAfter = 0) {
    await sendToBrowserLog('Saving browser session data to local file');
    let saved = false;
    await global.browser.execute(function () {
        return {localStorage: localStorage, sessionStorage: sessionStorage}
    }, [], async function (result) {
        if (result && result.value) {
            log.debug(`Saving session data to ${sessionDataPath}`)
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            await fs.writeFile(sessionDataPath, JSON.stringify(result.value));
            saved = true;
        }
    });
    if (waitAfter > 0)
        await global.browser.pause(waitAfter);
    return saved;
}

module.exports = {
    isTokenValid,
    loadLocalStorageToBrowser,
    loadSessionStorageToBrowser,
    downloadBrowserSessionData,
    getDownloadedSessionData,
}