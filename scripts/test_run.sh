#!/usr/bin/env bash
# Find the absolute path of the repository, the reason why we don't use TRAVIS_BUILD_DIR directly is we don't have that in local
export PROJECT_ROOT=$(git rev-parse --show-toplevel)
export RESULT_PATH="$PROJECT_ROOT/cucumber_results"
export SCREENSHOTS_FOLDER="$PROJECT_ROOT/results/screenshots"
export AXE_RESULTS_FOLDER="$PROJECT_ROOT/results/axe_results"
export PEF_RESULTS_FOLDER="$PROJECT_ROOT/perf_test_report"
export FEATURE_FOLDER="$PROJECT_ROOT/features/feature_files"
export TMP_FOLDER="$PROJECT_ROOT/tmp"
echo "The root path is $PROJECT_ROOT"
export AXE_TEST_RESULT=0
export BASE_URL_INT='https://sample-int.net/'
export BASE_URL_UAT='https://sample-uat.net/'
#export JIRA_BOARD_ID=69
#source $PROJECT_ROOT/scripts/current_sprint.sh
#export CURRENT_SPRINT=$(retrieve_current_sprint)
#export SPRINT_TEST_TAG="$CURRENT_SPRINT"
#if [[ $SPRINT_TEST_TAG != *_ui ]]; then export SPRINT_TEST_TAG="${SPRINT_TEST_TAG}_ui"; fi
export RERUN_FILE="@rerun.txt"
export RERUN_PATH="$PROJECT_ROOT/$RERUN_FILE"


# This function sets up the results folder under the PROJECT_ROOT
setup_results_directory() {
  rm -rf "$RESULT_PATH"
  mkdir -p "$RESULT_PATH"
  echo "Created cucumber result folder: $RESULT_PATH"
  rm -rf "$SCREENSHOTS_FOLDER"
  rm -rf "$AXE_RESULTS_FOLDER"
  rm -rf "$PEF_RESULTS_FOLDER"
  mkdir -p "$SCREENSHOTS_FOLDER"
  mkdir -p "$AXE_RESULTS_FOLDER"
  mkdir -p "$PEF_RESULTS_FOLDER"
  echo "Created cucumber result folder: $SCREENSHOTS_FOLDER"
  echo "Created axe result folder: $AXE_RESULTS_FOLDER"
  echo "Created axe result folder: $PEF_RESULTS_FOLDER"
}

# Argument 1: The test config file name -- required
# Argument 2: Browser -- optional
# Argument 3: Tags -- optional
setup_nightwatch() {
  if [[ -z "$1" ]]; then echo 'Expected the 1st argument (Test Config File Path), Found 0' && return 1; fi
  source "$1"
  if [[ -n "$2" ]]; then export NIGHTWATCH_ENV="$2"; fi
  if [[ -n "$3" ]]; then export CUCUMBER_TAGS="$3"; fi
  if [[ $IN_CI == "TRUE" ]]; then
    echo "*********** Checking ENV ***********"
    echo "Nightwatch Config: $NIGHTWATCH_ENV"
    echo "ChromeDriver: $(chromedriver --version)"
    echo "Chrome: $(google-chrome --version)"
    echo "GeckoDriver: $(geckodriver --version)"
    echo "FireFox: $(firefox --version)"
    echo "NodeJS: $(node --version)"
    echo "************************************"
  fi
  export NIGHTWATCH_SETUP='DONE'
}

# Argument 1: The test tag -- required
# Argument 2: Test Run Name -- optional
run_cucumber_by_tag() {
  if [[ -z "$1" ]]; then echo 'Expected the 1st argument (Cucumber Tag), Found 0' && return 1; fi
  if [[ -n "$2" ]]; then export TEST_RUN_NAME="$2"; fi
  if [[ -z "$NIGHTWATCH_SETUP" ]]; then echo 'Nightwatch has not been setup, please run setup_nightwatch first' && return 1; fi
  cd "$PROJECT_ROOT" || return 1
  resultFile="$RESULT_PATH/cucumber-ran-by-file_$(uuidgen).json"
  set +e # this make sure all the following lines (including loop) will execute even if they fail. Otherwise the github step will terminate immediately
  echo "Running Tests for Tag: <$1>"
  ./node_modules/.bin/cucumber-js "$FEATURE_FOLDER/**/*.feature" --require features/step_definitions --require features/support --require cucumber.conf.js -t "$1" --format json:"$resultFile" --no-strict --retry $CUCUMBER_RETRY # --parallel=$PARALLEL_WORKERS
  CUCUMBER_RESULT=$?
  upload_screenshots
  upload_json_files
  set -e
  return $CUCUMBER_RESULT
}

# Argument 1: The test file name/path -- required
# Argument 2: Test Run Name -- optional
run_cucumber_by_file() {
  if [[ -z "$1" ]]; then echo 'Expected the 1st argument (Test File Name), Found 0' && return 1; fi
  if [[ -n "$2" ]]; then export TEST_RUN_NAME="$2"; fi
  if [[ -z "$NIGHTWATCH_SETUP" ]]; then echo 'Nightwatch has not been setup, please run setup_nightwatch first' && return 1; fi
  cd "$PROJECT_ROOT" || return 1
  cp "$1" "./$RERUN_FILE" # cucumber-js only support run the file with name @rerun.txt
  echo "============================== The following tests will be executed  ==============================="
  cat "$RERUN_FILE"
  echo "===================================================================================================="
  resultFile="$RESULT_PATH/cucumber-ran-by-file_$(uuidgen).json"
  set +e # this make sure all the following lines (including loop) will execute even if they fail. Otherwise the github step will terminate immediately
  ./node_modules/.bin/cucumber-js "$RERUN_FILE" --require features/step_definitions --require features/support --require cucumber.conf.js --format json:"$resultFile" --no-strict --retry $CUCUMBER_RETRY
  CUCUMBER_RESULT=$?
  upload_screenshots
  upload_json_files
  set -e
  return $CUCUMBER_RESULT
}

# Argument 1: The test file name/path -- required
# Argument 2: Test Run Name -- optional
run_cucumber_by_location() {
  if [[ -z "$1" ]]; then echo 'Expected the 1st argument (Test Location), Found 0' && return 1; fi
  if [[ -n "$2" ]]; then export TEST_RUN_NAME="$2"; fi
  if [[ -z "$NIGHTWATCH_SETUP" ]]; then echo 'Nightwatch has not been setup, please run setup_nightwatch first' && return 1; fi
  cd "$PROJECT_ROOT" || return 1
  local location="$1"
  local resultFile="$RESULT_PATH/cucumber-result-$(echo "${location##*/}" | sed 's/:/-/g; s/.feature/_feature/').xml"
  ./node_modules/.bin/cucumber-js --require features/step_definitions --require features/support --require cucumber.conf.js --format junit:"$resultFile" --no-strict "$1"
}

run_cucumber() {
  [[ -z "$1" ]] && CONFIG_FILE="$PROJECT_ROOT/test_config/int_local.sh" || CONFIG_FILE=$1
  cd "$PROJECT_ROOT"
  setup_nightwatch "$CONFIG_FILE" "$2" "$3"
  rm -f "$RERUN_PATH" # -f is force, so it will not throw exception if file does not exist
  setup_results_directory
  ./node_modules/.bin/cucumber-js "$FEATURE_FOLDER/**/*.feature" --require features/step_definitions --require features/support --require cucumber.conf.js -t "$CUCUMBER_TAGS" --format json:"$RESULT_PATH/cucumber-output-$NIGHTWATCH_ENV.json" --format rerun:"$RERUN_FILE" --no-strict --parallel=$PARALLEL_WORKERS
  CUCUMBER_RESULT=$?
  return $CUCUMBER_RESULT
}


axe_tests() {
  if [[ -z "$1" ]]; then echo 'Expected the 1st argument (Browser), Found 0' && return 1; fi
  TEST_RUN_NAME='axe'
  TEST_TAG='axe'
  download_data_setup_folder
  setup_results_directory
  ci_cuc_reset_test_run "$TEST_TAG" "$TEST_RUN_NAME"
  setup_nightwatch "$PROJECT_ROOT/test_config/int_ci.sh" "$1"
  echo "Start Accessibility tests"
  set +e # this make sure all the following lines (including loop) will execute even if they fail. Otherwise the github step will terminate immediately
  run_cucumber_by_tag "@$TEST_TAG" "$TEST_RUN_NAME"
  AXE_TEST_RESULT=$?
  report=$(ci_cuc_markdown_test_report "$TEST_RUN_NAME")
  echo "$report" >> "$GITHUB_STEP_SUMMARY"
  set -e
  return $AXE_TEST_RESULT
}

# Argument 1: Browser -- required
wip_tests() {
  if [[ -z "$1" ]]; then echo 'Expected the 1st argument (Browser), Found 0' && return 1; fi
  TEST_RUN_NAME='wip_api'
  TEST_TAG='wip_api'
  download_data_setup_folder
  setup_results_directory
  ci_cuc_reset_test_run "$TEST_TAG" "$TEST_RUN_NAME"
  setup_nightwatch "$PROJECT_ROOT/test_config/int_ci.sh" "$1"
  run_cucumber_by_tag "@$TEST_TAG" "$TEST_RUN_NAME"
  TEST_RESULT=$?
  report=$(ci_cuc_markdown_test_report "$TEST_RUN_NAME")
  echo "$report" >> "$GITHUB_STEP_SUMMARY"
  return $TEST_RESULT
}

upload_screenshots() {
  echo "upload_screenshots function has not been implemented yet"
}

upload_json_files() {
  echo "upload_json_files function has not been implemented yet"
}
