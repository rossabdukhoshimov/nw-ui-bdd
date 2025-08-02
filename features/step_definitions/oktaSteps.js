const {Given, Then} = require("@cucumber/cucumber");
const {oktaControl} = require('./pages');
const fs = require("fs");
const execSync = require('child_process').execSync;

Given(/^I have the fresh password for "([^"]*)" accounts$/, async (project) => {
    let runnerFile = `test-sample-bdd-data-setup/global_utilities/aws_helpers/wrapper.rb`;
    let rubyCode = `require_relative 'secrets_manager'\nSecretsManagerHelpers.new('int').get_secret("${project}/test/pass")`;
    fs.writeFileSync(runnerFile, rubyCode);
    let shell = `bundle exec ruby ${runnerFile}`
    process.env.NEW_PASSWORD  = execSync(shell, {stdio: 'inherit'});
    console.log(`This is the new password: ${process.env.NEW_PASSWORD}`)
});
Given(/^I login Okta App as "([^"]*)" user$/, async (user) => {
    await oktaControl().loginToOkta(user);
});
Then(/^I navigate to account settings$/, async () => {
    await oktaControl().clickOktaSettings();
});
Then(/^I update the password of the "([^"]*)" user$/, async (user) => {
    await oktaControl().updateOktaPassword(user, process.env.NEW_PASSWORD);
    await oktaControl().logoutFromOkta();
});
Then(/^I update the GitHub Actions secret for "([^"]*)" user$/, async (user) => {
    await oktaControl().updateGitHubActionsSecret(user);
});