function getPort() {
    let port = 20450;
    if (process.env.CUCUMBER_TOTAL_WORKERS && (parseInt(process.env.CUCUMBER_TOTAL_WORKERS, 10) > 1)) {
        console.log(`Parallel Cucumber is detected, worker id: ${process.env.CUCUMBER_WORKER_ID}/${process.env.CUCUMBER_TOTAL_WORKERS}`);
        port = port + parseInt(process.env.CUCUMBER_WORKER_ID, 10);
    }
    console.log(`Running nightwatch cucumber in port ${port}`);
    return port.toString();
}

module.exports = {
    output_folder: 'cucumber_results',
    // An array of folders (excluding subfolders) where your testSuite are located;
    // if this is not specified, the test source must be passed as the second argument to the test runner.
    src_folders: ['./features/step_definitions'],
    page_objects_path: ['./page_objects/*'],
    custom_commands_path: ["commands", "crow", "crow/axe/commands"],
    globals_path: "genericMethods/globals.js",
    test_workers: {
        enabled: true,
        workers: 'auto'
    },
    test_runner: {
        // set cucumber as the runner
        // For more info on using CucumberJS with Nightwatch, visit:
        // https://nightwatchjs.org/guide/writing-tests/using-cucumberjs.html
        type: 'cucumber',

        options: {
            feature_path: './features/feature_files',
        }
    },
    test_settings: {
        default: {
            desiredCapabilities: {
                browserName: "chrome"
            },
            waitForConditionTimeout: 5000  // sometimes internet is slow so wait.
        },
        reporter: 'junit',
        chrome: {
            end_session_on_fail: true,
            disable_error_log: false,
            launch_url: process.env.BASE_URL,
            desiredCapabilities: {
                browserName: 'chrome',
                elementScrollBehavior: 1,
                cssSelectorsEnabled: true,
                chromeOptions: {
                    args: ["--no-sandbox", "disable-gpu", '--window-size=2560,1440'],
                    prefs: {
                        download: {
                            default_directory: process.env.downloadFilePath,
                            prompt_for_download: false,
                            directory_upgrade: true
                        },
                        plugins: {
                            always_open_pdf_externally: false
                        },
                        behavior: "allow"
                    }
                }
            },
            skip_testcases_on_fail: false,
            webdriver: {
                start_process: true,
                port: getPort(),
                server_path: 'node_modules/.bin/chromedriver',
                cli_args: [
                    "--verbose"
                ]
            }
        },
        chromeHeadless: {
            end_session_on_fail: true,
            disable_error_log: false,
            launch_url: process.env.BASE_URL,
            webdriver: {
                start_process: true,
                port: getPort(),
                server_path: 'node_modules/.bin/chromedriver',
            },
            skip_testcases_on_fail: false,
            desiredCapabilities: {
                browserName: 'chrome',
                elementScrollBehavior: 1,
                cssSelectorsEnabled: true,
                chromeOptions: {
                    args: ["--no-sandbox", "--headless", "--silent", "disable-gpu", '--window-size=2560,1800'],
                    prefs: {
                        download: {
                            default_directory: process.env.downloadFilePath,
                            prompt_for_download: false,
                            directory_upgrade: true
                        },
                        plugins: {
                            always_open_pdf_externally: false
                        },
                        behavior: "allow"
                    }
                }
            }
        },
        firefox:
            {
                desiredCapabilities: {
                    browserName: 'firefox',
                    marionette: true,
                    javascriptEnabled: true,
                    elementScrollBehavior: 1,
                    cssSelectorsEnabled: true,
                    alwaysMatch: {
                        'moz:firefoxOptions': {
                            args: ["--no-sandbox", "disable-gpu", '-width=2560', '-height=1440'],
                            prefs: {
                                'pdfjs.disabled': true,
                                'browser.download.dir': process.env.downloadFilePath,
                                'browser.download.useDownloadDir': true,
                                'browser.download.lastDir': process.env.downloadFilePath,
                                'browser.download.folderList': 2,
                                'browser.helperApps.neverAsk.saveToDisk': "application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                                'browser.helperApps.neverAsk.openFile': "application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                                'browser.helperApps.alwaysAsk.force': false,
                                'browser.download.manager.showWhenStarting': false,
                                'browser.download.manager.alertOnEXEOpen': false,
                                'browser.download.manager.focusWhenStarting': false,
                                'browser.download.manager.useWindow': false,
                                'browser.download.manager.showAlertOnComplete': false,
                                'browser.download.manager.closeWhenDone': false,
                                'network.cookie.cookieBehavior': 0

                            }
                        }
                    }
                },
                skip_testcases_on_fail: false,
                webdriver: {
                    start_process: true,
                    port: getPort(),
                    server_path: process.env.GECKO_PATH,
                    cli_args: [
                    ]
                }
            },
        firefoxHeadless:
            {
                desiredCapabilities: {
                    browserName: 'firefox',
                    marionette: true,
                    javascriptEnabled: true,
                    elementScrollBehavior: 1,
                    cssSelectorsEnabled: true,
                    alwaysMatch: {
                        'moz:firefoxOptions': {
                            // it's important to set a bigger browser size. Firefox is very sensitive for the elements that are not in the browser's boundary
                            args: ["--headless", "--silent", "disable-gpu", "--no-sandbox", '-width=2560', '-height=1440', '--disable-software-rasterizer'],
                            prefs: {
                                'pdfjs.disabled': true,
                                'browser.download.dir': process.env.downloadFilePath,
                                'browser.download.downloadDir': process.env.downloadFilePath,
                                'browser.download.useDownloadDir': true,
                                'browser.download.lastDir': process.env.downloadFilePath,
                                'browser.download.folderList': 2,
                                'browser.helperApps.neverAsk.saveToDisk': "application/pdf, text/csv, application/octet-stream, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                                'browser.helperApps.neverAsk.openFile': "application/pdf, application/octet-stream, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                                'browser.helperApps.alwaysAsk.force': false,
                                'browser.download.manager.showWhenStarting': false,
                                'browser.download.manager.alertOnEXEOpen': false,
                                'browser.download.manager.focusWhenStarting': false,
                                'browser.download.manager.useWindow': false,
                                'browser.download.manager.showAlertOnComplete': false,
                                'browser.download.manager.closeWhenDone': false,
                                'network.http.prompt-temp-redirect': false,
                                'network.cookie.cookieBehavior': 0

                            }
                        }
                    }
                },
                skip_testcases_on_fail: false,
                webdriver: {
                    start_process: true,
                    port: getPort(),
                    server_path: process.env.GECKO_PATH,
                    cli_args: [
                    ]
                }
            },
        edge: {
            // start the msedgedriver by navigating to
            // '/driver/edgedriver_mac64 (2)
            // and running the command `./msedgedriver`, before running the test
            // selenium_port  : 9515,
            // selenium_host  : "localhost",
            // default_path_prefix : "",
            webdriver: {
                start_process: true,
                port: getPort(),
                server_path: process.env.EDGEDRIVER_PATH
            },
            desiredCapabilities: {
                browserName: "MicrosoftEdge",
                acceptInsecureCerts: true,
                acceptSslCerts: true,
                elementScrollBehavior: 1,
                cssSelectorsEnabled: true,
                UseChromium: true,
                'ms:edgeOptions': {
                    args: [
                        "headless",
                        "disable-gpu",
                        "window-size=2560,1440",
                        "--no-sandbox",
                        "--disable-software-rasterizer"
                    ],
                    prefs: {
                        download: {
                            default_directory: process.env.downloadFilePath,
                            prompt_for_download: false,
                            directory_upgrade: true
                        },
                        plugins: {
                            always_open_pdf_externally: false
                        },
                        behavior: "allow"
                    }
                }
            }
        },
        safari: {
            dataDir: process.env.downloadFilePath,
            desiredCapabilities: {
                browserName: "safari",
                javascriptEnabled: true,
                elementScrollBehavior: 1,
                cssSelectorsEnabled: true,
                'safari:options': {
                    cleanSession: true,
                    args: ['--window-size=2560,1440', "--no-sandbox", "--disable-software-rasterizer"],
                }
            },
            webdriver: {
                start_process: true,
                port: getPort(),
                server_path: '/usr/bin/safaridriver'
            }
        }
    }
};