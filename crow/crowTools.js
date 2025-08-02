const log = require('./crowLog');
const path = require("path");
const fs = require("fs");

function splitDateString(dateString) {
    if (dateString.endsWith('days ago')) {
        let days = Number(dateString.replace(' days ago', ''));
        let date = new Date();
        date.setDate(date.getDate() - days);
        return [`${date.getFullYear()}`, `${date.getMonth() + 1}`, `${date.getDate()}`];
    } else
        return dateString.split('-');
}

function daysBetween(startDate, endDate) {
    if (typeof (startDate) !== 'string' && typeof (endDate) !== 'string'
        && typeof (startDate.getMonth) !== 'function' && typeof (endDate.getMonth) !== 'function')
        throw new Error('The parameters should be either String or both Date')
    let startD = typeof startDate === 'string' ? new Date(startDate) : startDate;
    let endD = typeof endDate === 'string' ? new Date(endDate) : endDate;
    let timeDifference = Math.abs(endD.getTime() - startD.getTime());
    return Math.floor(timeDifference / (24 * 3600 * 1000))
}

function getEnv(envName, throwError = true) {
    // we can skip eslint for this one, we will verify the ENV name when calling this function
    // eslint-disable-next-line security/detect-object-injection
    let result = process.env[envName];
    if (result)
        return result;
    else if (throwError)
        log.error(`Environment variable ${envName} is not set`, true);
    else
        return result;
}

async function retryWithDelay(callback, message, maxTry, tryInterval = 200) {
    let attempt = 1;
    const startTime = Date.now();
    let lastError = null; // Store the last error encountered

    // retry reach limit or whole process is near to callback limit 60 seconds
    while ((attempt <= maxTry) && ((Date.now() - startTime) < 58000)) {
        try {
            await callback(attempt);
            log.debug(`${message}: Attempt #${attempt} passed.`);
            return; // Success, exits the function
        } catch (error) {
            lastError = error; // Store the error from the failed attempt
            if (attempt < maxTry) {
                log.debug(`${message}: Attempt #${attempt} failed. Retrying in ${tryInterval}ms...`);
                try {
                    await global.browser.pause(tryInterval)
                } catch (e) {
                    log.debug(`retryWithDelay: failed to wait for ${tryInterval}ms, will continue`);
                }
                attempt++;
            } else {
                // If maxTry is reached, re-throw the last error
                throw new Error(`${message}: Attempt #${attempt} failed. ${error}`);
            }
        }
    }
    // ESLint rule: "detect-unhandled-async-errors" does not want async function throw exception,
    // But our code is for test, throwing exception is the purpose, so we skip this rule here
    // eslint-disable-next-line security/detect-unhandled-async-errors
    if (lastError) {
        // ESLint rule: "detect-unhandled-async-errors" does not want async function throw exception,
        // But our code is for test, throwing exception is the purpose, so we skip this rule here
        // eslint-disable-next-line security/detect-unhandled-async-errors
        throw new Error(`${message}: Operation failed after ${attempt - 1} attempts due to timeout or last attempt failure. Last error: ${lastError.message || lastError}`);
    } else {
        // This case should theoretically not be reached if callback never succeeded
        // but it's a good fallback to ensure we always throw on failure.
        // ESLint rule: "detect-unhandled-async-errors" does not want async function throw exception,
        // But our code is for test, throwing exception is the purpose, so we skip this rule here
        // eslint-disable-next-line security/detect-unhandled-async-errors
        throw new Error(`${message}: Operation timed out after ${attempt - 1} attempts.`);
    }
}

/**
 * Validates a given file path string for security and correctness.
 * This function performs the following checks:
 * 1. Input types (filePath is string, allowedExtensions is array).
 * 2. Ensures the resolved path falls within one of the allowedFolders.
 * This is the primary defense against path traversal attacks.
 * 3. Validates the file's extension against a list of allowed extensions.
 * 4. Confirms that the parent directory of the resolved file path exists and is a directory.
 *
 * This function DOES NOT check if the target file itself exists, allowing it to be used
 * for validating paths for both existing files and files to be created.
 *
 * @param {string} filePath - The dynamic file path string to validate (can be relative or absolute).
 * @param allowedFolders - make sure the file is actually under this allowed path
 * @param {string[]} allowedExtensions - An array of allowed file extensions (e.g., ['.txt', '.json', '']).
 * Include '' (empty string) in the array if files without an extension are allowed.
 * Case-insensitive check for extensions.
 * @returns {string} The fully resolved and validated absolute path string if all checks pass.
 * @throws {Error} If any validation rule is violated, with a descriptive message.
 */
function validateFilePath(filePath, allowedFolders, allowedExtensions) {
    // --- 1. Input Type Validation ---
    if (typeof filePath !== 'string' || filePath.trim() === '') {
        throw new Error('Validation Error: File path must be a non-empty string.');
    }
    if (!Array.isArray(allowedExtensions) || allowedExtensions.length === 0) {
        // We require at least one allowed extension to be specified for clear intent.
        // If no extension is desired, pass ['']
        throw new Error('Validation Error: allowedExtensions must be a non-empty array of strings.');
    }

    // --- Normalize allowedExtensions: Add leading '.' if missing (unless empty string) ---
    const normalizedAllowedExtensions = allowedExtensions.map(ext => {
        const trimmedExt = ext.trim();
        if (trimmedExt === '') {
            return ''; // Allow empty string for files without an extension
        }
        return trimmedExt.startsWith('.') ? trimmedExt.toLowerCase() : `.${trimmedExt.toLowerCase()}`;
    });
    // --- 2. Resolve the Input File Path to its Absolute Form ---
    // This is crucial for normalizing '..', '.', and resolving to a full absolute path.
    const resolvedInputPath = path.resolve(filePath);

    // --- 3. Validate Against Trusted Folders (Path Traversal Prevention) ---
    let isInTrustedFolder = false;
    const resolvedAllowedFolder = allowedFolders.map(ext => path.resolve(ext))

    // Iterate through all defined trusted folders to see if the resolved input path
    // falls within any of them.
    for (const trustedFolder of resolvedAllowedFolder) {
        // Check if the resolved input path starts with the resolved trusted folder path.
        // `path.sep` is appended to ensure it's truly inside and not just a similarly named file/folder
        // (e.g., 'data' vs 'data_files'). Also allow if the input path IS the trusted folder itself.
        if (resolvedInputPath.startsWith(trustedFolder + path.sep) || resolvedInputPath === trustedFolder) {
            isInTrustedFolder = true;
            break; // Found a match, no need to check other trusted folders
        }
    }

    if (!isInTrustedFolder) {
        throw new Error(`Security Error: File path "${filePath}" (resolved to "${resolvedInputPath}") is not located within any trusted directory.`);
    }

    // --- 4. Validate File Extension ---
    const fileExtension = path.extname(resolvedInputPath).toLowerCase();

    // Check if the extracted extension is in the allowed list.
    // Handles cases where an empty string ('') is an allowed extension (for files with no extension).
    if (!normalizedAllowedExtensions.includes(fileExtension)) {
        throw new Error(`Validation Error: File "${path.basename(filePath)}" has an unsupported extension "${fileExtension}". Allowed: ${allowedExtensions.join(', ')}.`);
    }

    // --- 5. Validate Parent Directory Existence and Type ---
    // Get the parent directory of the resolved file path.
    const parentDirectory = path.dirname(resolvedInputPath);

    // Skip this check if the resolved input path *is* a trusted folder itself,
    // or if it's a root directory (e.g., 'C:\', '/' on Linux), as path.dirname might
    // return the same path or a non-existent higher-level path.
    // We only care that the directory the *file will reside in* exists and is a directory.
    if (parentDirectory !== resolvedInputPath) {
        let parentStat;
        try {
            // eslint-disable-next-line security/detect-non-literal-fs-filename
            parentStat = fs.statSync(parentDirectory);
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error(`File System Error: Parent directory "${parentDirectory}" for file "${filePath}" does not exist.`);
            }
            throw new Error(`File System Error: Error accessing parent directory "${parentDirectory}" for file "${filePath}": ${error.message}`);
        }

        if (!parentStat.isDirectory()) {
            throw new Error(`File System Error: Path "${parentDirectory}" for file "${filePath}" exists but is not a directory.`);
        }
    }

    // If all validation steps pass, return the fully resolved and secure path.
    return resolvedInputPath;
}

module.exports = {
    daysBetween,
    splitDateString,
    getEnv,
    retryWithDelay,
    validateFilePath,
}