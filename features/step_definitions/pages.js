module.exports = {
    axeControl: function () {
        return global.browser.page.axeControl();
    },
    dashboardPage: function () {
        return global.browser.page.dashboardPage();
    },
    globalControl: function () {
        return global.browser.page.globalControl();
    },
    participantLandingPage: function () {
        return global.browser.page.participantLandingPage();
    },
    participantsPage: function () {
        return global.browser.page.participantsPage();
    },
    participantLandingPageAR: function () {
        return global.browser.page.participantLandingPageAR();
    },
    participantLandingPageVR: function () {
        return global.browser.page.participantLandingPageVR();
    },
    participantLandingPageTimeline: function () {
        return global.browser.page.participantLandingPageTimeline();
    },
    protocolsPage: function () {
        return global.browser.page.protocolsPage();
    },
    protocolLandingPage: function () {
        return global.browser.page.protocolLandingPage();
    },
    protocolLandingPageCriteria: function () {
        return global.browser.page.protocolLandingPageCriteria();
    },
    protocolLandingPageParticipants: function () {
        return global.browser.page.protocolLandingPageParticipants();
    },
    protocolLandingPageTimeline: function () {
        return global.browser.page.protocolLandingPageTimeline();
    },
   oktaControl: function () {
        return global.browser.page.oktaControl();
    }
};