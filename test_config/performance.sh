#!/bin/bash
export PAUSE_TIMEOUT='1000'
export NIGHTWATCH_ENV='chromeHeadless'
export BASE_URL='https://sample-uat.net/'
export TEST_ENV='uat'
export downloadFilePath="$PROJECT_ROOT/nightwatch/downloads/"
export CUCUMBER_TAGS='@performance_tests'
export CUCUMBER_RETRY='0'
export TAKE_FAILURE_SCREENSHOT='true'
export SCREENSHOT_FOLDER="$PROJECT_ROOT/results/screenshots"
#if LOG_LEVEL has not been set by any other script, set it to info
export LOG_LEVEL=${LOG_LEVEL:-"info"}
export EDGEDRIVER_PATH="$PROJECT_ROOT/edgedriver_executable/ubuntu/msedgedriver"

mkdir -p "$downloadFilePath"
mkdir -p "$SCREENSHOT_FOLDER"