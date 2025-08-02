#!/bin/bash
export PAUSE_TIMEOUT='1000'
export NIGHTWATCH_ENV='chrome'
export BASE_URL='https://sample-uat.net/'
export TEST_ENV='uat'
export downloadFilePath="$PROJECT_ROOT/nightwatch/downloads/"
export CUCUMBER_TAGS='@uat_local'
export CUCUMBER_RETRY='0'
export TAKE_FAILURE_SCREENSHOT='false'
export SCREENSHOT_FOLDER="$PROJECT_ROOT/results/screenshots"
export PARALLEL_WORKERS=1
export LOG_LEVEL='debug'

mkdir -p "$downloadFilePath"
mkdir -p "$SCREENSHOT_FOLDER"