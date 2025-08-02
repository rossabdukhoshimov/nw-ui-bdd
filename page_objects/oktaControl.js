const action = require("crow/crowActions");
const log = require("crow/crowLog");
const tools = require("crow/crowTools");
const observer = require("crow/crowObservations");
const path = require("path");
const {execFile} = require("child_process");


// to run these steps, you need to have these environment variables:
// OKTA_BASE_PASSWORD
// OKTA_BASE_URL
// SAMPLE_UI_BDD_REPO_PUBLIC_KEY_ID
// SAMPLE_UI_BDD_REPO_PUBLIC_KEY
// and GIT Token with Write access to the repo you want to update Actions Secret: GH_WORKFLOW_TOKEN

let oktaControlCommands = {
    loginToOkta: async function (role) {
        await action.navigateToUrl(process.env.OKTA_BASE_URL, 1000);// this one brings up the login page, even for loading the session data ,you need to have the initial page brought up
        const processedRole = role.replace(/ /g, '_').toUpperCase();
        log.info(`&&&&&&&&processedRole = ${processedRole}`);

        const varUsername = `SAMPLE_INT_OKTA_USERNAME_${processedRole}`;
        const varPassword = `SAMPLE_INT_OKTA_PASSWORD_${processedRole}`;
        process.env["OLD_PASSWORD"] = tools.getEnv(varPassword);
        await action.type(this, '@oktaUsername', tools.getEnv(varUsername));
        await action.click(this, '@oktaNextBtn', 1000);
        await action.type(this, '@oktaPassword', tools.getEnv(varPassword));
        await action.click(this, '@oktaSignInButton', 500);
        const isLoggedIn = await observer.isElementPresent(this, '@oktaUserDropdownBtn', 1000);
        if(!isLoggedIn){
            const isPasswordChangePrompted = await observer.isElementPresent(this, '@oldPasswordInput', 200);
            if(isPasswordChangePrompted){
                process.env["PASSWORD_RESET_PROMPTED"] = 'true';
                console.log(`Password reset prompted at login, PASSWORD_RESET_PROMPTED value is: ${process.env["PASSWORD_RESET_PROMPTED"]}`)
            }
        }
        return this;
    },
    logoutFromOkta: async function () {
        await action.click(this, '@oktaUserDropdownBtn', 1000);
        await observer.assertVisible(this, '@oktaAccountSignOutBtn');
        await action.click(this, '@oktaAccountSignOutBtn', 3000);
        await observer.assertVisible(this, '@oktaNextBtn', 1000)
        return this;
    },
    clickOktaSettings: async function () {
        if(process.env["PASSWORD_RESET_PROMPTED"] !== 'true'){
            await action.click(this, '@oktaUserDropdownBtn', 1000);
            await observer.assertVisible(this, '@oktaAccountSettingsBtn');
            await action.click(this, '@oktaAccountSettingsBtn', 3000);
        }
        return this;
    },
    updateOktaPassword: async function (role, newPassword) {
        const processedRole = role.replace(/ /g, '_').toUpperCase();
        log.info(`@@@@@@@processedRole = ${processedRole}`);

        const varPassword = `SAMPLE_INT_OKTA_PASSWORD_${processedRole}`; // since passwords are same in INT and UAT, we only need one

        process.env["NEW_PASSWORD"] = newPassword
        if(process.env["PASSWORD_RESET_PROMPTED"] !== 'true'){
            await browser
                .frame(0)
                .execute(function () {
                    return document.location.href; // Get the iframe's current URL
                }, [], function (result) {
                    console.log('Inside iframe URL:', result.value);
                })
                .waitForElementVisible('body', 5000) // Ensure the iframe’s body is loaded
                .assert.visible('body') // Confirm we're inside
                .setValue("[id$='change_password.oldPassword']", tools.getEnv(varPassword)).pause(200)
                .setValue("[id$='change_password.newPassword']", newPassword).pause(200)
                .setValue("[id$='change_password.verifyPassword']", newPassword).pause(200)
                .click("[id$='change_password.revokeSessions.label']").pause(2000)
                .click("input[id$='change_password.button.submit']").pause(2000)
                .frameParent();
        }else{
            await action.type(this, '@oldPasswordInput',  process.env["OLD_PASSWORD"], 300);
            await action.type(this, '@newPasswordInput',  newPassword, 300);
            await action.type(this, '@confirmPasswordInput',  newPassword, 300);
            await action.click(this, '@changePasswordBtn', 10000);
        }
        return this;
    },
    updateGitHubActionsSecret: async function (role) {
        const scriptPath = path.resolve(__dirname, '../commands/updateGhaItem.py');
        // Here is the plain:
        // 1. Migrate all the username password to AWS secret manager. Borrow LA test code to download and store the secrets
        // 2. This update password process should ONLY be executed from local. Should not be automatically triggered, because it needs engineer's consent
        // 3. The new password should be provided as an temp local ENV when execute the process. should not expose the algorithm in the code
        // 4. After the password update, ask Cloud Engineer to update AWS secret manager. Because we anyway have to do that so LA test can pass

        const processedRole = role.replace(/ /g, '_').toUpperCase();
        log.info(`$$$$$$$processedRole = ${processedRole}`);

        await new Promise((resolve, reject) =>{
            execFile('python3', [scriptPath, processedRole, process.env["NEW_PASSWORD"]], (error, stdout, stderr) =>{
                if (error){
                    console.error(`Error executing Python script: ${error.message}`);
                    return reject(error);
                }if (stderr) {
                    console.warn(`Python Stderr: ${stderr}`);
                }
                console.log(`Python Output: ${stdout}`);
                resolve(stdout);
            })
        })
        return this;
    },
};

module.exports = {
    url: process.env.OKTA_BASE_URL,
    commands: [oktaControlCommands],
    elements: {
        oktaUsername: 'input#idp-discovery-username',
        oktaPassword: 'input#okta-signin-password',
        oktaNextBtn: 'input#idp-discovery-submit',
        oktaSignInButton: 'input#okta-signin-submit',
        oktaUserDropdownBtn: 'button.dropdown-menu--button.dropdown-menu--button-hidden',
        oktaAccountSettingsBtn: 'div.dropdown-menu--items a[href="/enduser/settings"]',
        oktaAccountSignOutBtn: 'div.dropdown-menu--items a[href="/login/signout"]',
        oldPasswordInput: 'input[name="oldPassword"]',
        newPasswordInput: 'input[name="newPassword"]',
        confirmPasswordInput: 'input[name="confirmPassword"]',
        changePasswordBtn: 'input[value="Change Password"]'
    }
};
