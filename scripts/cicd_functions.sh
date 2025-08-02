#!/usr/bin/env bash

export DEPLOY_HELPER_PROJECT='sample'
export DEPLOY_HELPER_REPOS='test-sample-ui'
export SLACK_WEBHOOK=$SAMPLE_SLACK_WEBHOOK

assert_configured () {
  missing_envs=()
  for env_name in "$@"; do
    if [ -z "${!env_name}" ]; then missing_envs+=("$env_name"); fi;
  done;
  if [ ${#missing_envs[@]} -ne 0 ]; then
    echo "***************** cicd_functions configuration ERROR *****************"
    echo "The following cicd_functions required ENV are not set. Please open cicd_functions.sh to find more information"
    for var in "${missing_envs[@]}"; do
      echo "  - $var"
    done
    echo "*******************************************************************"
    return 1
  fi
}

# Function to validate if the input value exists in the allowed options
validate_options() {
  local input_value="$1"
  local options="$2"

  # Convert the options into an array
  IFS=',' read -r -a option_array <<< "$options"

  # Check if input_value is in the list of options
  for option in "${option_array[@]}"; do
    if [[ "$input_value" == "$option" ]]; then
      return 0  # Input is valid, return success
    fi
  done

  # If not found, print a log before returning error
  echo "Error: '$input_value' is not a valid option. Allowed values are: $options."
  return 1  # Input is invalid
}

function normalize_bool_string () {
  if [[ "$(echo "$1" | tr '[:upper:]' '[:lower:]')" =~ ^(yes|true|on)$ ]]; then
    echo "TRUE"
  else
    echo "FALSE"
  fi
}

# This function install all required packages
setup_ubuntu_headless () {
#    sudo apt-get install toilet figlet
#    sudo apt-get install wget libgtk-3-0 libdbus-glib-1-2 libxt6
    echo "Install and verify xvfb"
    sudo apt-get update
    sudo apt-get install xvfb
#    which xvfb
    echo "Configuring xvfb"
    mkdir -p /tmp/.X11-unix
    sudo chmod 1777 /tmp/.X11-unix
    sudo chown root /tmp/.X11-unix/
    /opt/X11/bin/xvfb :99 -ac -screen 0 1024x768x8 & export DISPLAY=:99
}

# This function install ruby gems
install_dependencies () {
    echo "Installing ruby gems"
    sudo gem install bundler
    bundle config --local clean false
    echo "Running bundle install in silent mode"
    bundle install > /dev/null
    echo "Check bundle install result"
    bundle list
    ruby -v
    bundle --version
    npm install
}

function install_awscli() {
  pip install -U pip
  echo "Installing aws cli tool"
  pip install awscli
}

install_chrome_browser () {
  npm i puppeteer
  npx @puppeteer/browsers install chrome@stable
#    npx @puppeteer/browsers install firefox@stable
#    sudo apt-get install firefox -y
}

function new_version_in_int () {
    if [[ -z "$DEPLOY_HELPER_PROJECT" ]]; then echo '{"values": [{"name": "ENV JIRA_USER is needed", "id": "ENV JIRA_USER is needed"}]}'; return 1; fi
    REPOS_TO_SYNC=$(bundle exec deploy_helper new_versions -p "$DEPLOY_HELPER_PROJECT" -f int -t uat -r "$DEPLOY_HELPER_REPOS")
    if [[ -z "$REPOS_TO_SYNC" ]]; then
      echo "FALSE"
    else
      echo "TRUE"
    fi
}

function gap_analysis () {
  if [[ -z "$1" ]]; then project="$DEPLOY_HELPER_PROJECT"; else project="$1"; fi
  if [[ -z "$2" ]]; then repos="$DEPLOY_HELPER_REPOS"; else repos="$2"; fi
  cmd="bundle exec deploy_helper gap_analysis -p \"$project\" -t int,uat -g -d"
  if [[ -n $repos ]]; then cmd+=" -r \"$repos\""; fi
  eval "$cmd"
}

function sync_applications_to_uat () {
  if [[ -z "$1" ]]; then project="$DEPLOY_HELPER_PROJECT"; else project="$1"; fi
  if [[ -z "$2" ]]; then repos="$DEPLOY_HELPER_REPOS"; else repos="$2"; fi
  echo "#### Start to sync applications to UAT ####"
  cmd="bundle exec deploy_helper upgrade_tier -p \"$project\" -f int -t uat -w"
  if [[ -n $repos ]]; then cmd+=" -r \"$repos\""; fi
  eval "$cmd"
  echo "These are the Updated versions"
  cmd="bundle exec deploy_helper versions -p \"$project\" -t int,uat"
  if [[ -n $repos ]]; then cmd+=" -r \"$repos\""; fi
  eval "$cmd"
}


function notify_slack () {
  if [[ -z "$1" ]]; then echo 'Expected the 1st argument (Message Text), Found 0' && return 1; fi
  if [[ -z "$2" ]]; then echo 'Expected the 2nd argument (SLACK WEBHOOK), Found 0' && return 1; fi
  TEST_MESSAGE="$1"
  SLACK_WEBHOOK="$2"
  curl -X POST -H 'Content-type: application/json' --data "{\"text\":\"$TEST_MESSAGE\"}" "$SLACK_WEBHOOK"
}

function notify_uat_new_version () {
  if [[ -z "$1" ]]; then webhook="$SLACK_WEBHOOK"; else webhook="$1"; fi
  if [[ -z "$2" ]]; then project="$DEPLOY_HELPER_PROJECT"; else project="$2"; fi
  if [[ -z "$3" ]]; then repos="$DEPLOY_HELPER_REPOS"; else repos="$3"; fi
  cmd="bundle exec deploy_helper versions -p \"$project\" -t int,uat"
  if [[ -n $repos ]]; then cmd+=" -r \"$repos\""; fi
  message=$(eval "$cmd")
  formatted=$(echo "$message" | jq -r 'to_entries[] | "\(.key)\n\tint: \(.value.int)\n\tuat: \(.value.uat)\n"')
  slack_msg="INT to UAT code sync has been done:\n$formatted"
  notify_slack "$slack_msg" "$webhook"
}

function notify_deprecation_warnings() {
  if [[ -z "$1" ]]; then echo 'Expected 1st argument (log file), Found 0' && return 1; else log_file="$1"; fi
  if [[ -z "$2" ]]; then webhook="$SLACK_WEBHOOK"; else webhook="$2"; fi
  if [[ ! -s "$log_file" ]]; then echo "No warnings found in $log_file" && return 0; fi

  unique_file="${log_file%.txt}_unique.txt"
  grep -i "DeprecationWarning:" "$log_file" \
    | grep -viE "(process\.binding|url\.parse)" \
    | sed -E 's/\x1b\[[0-9;]*m//g; s/^[.\/]*//g; s/[[:space:]]*$//' \
    | sort | uniq > "$unique_file"

  if [[ ! -s "$unique_file" ]]; then echo "No deprecation warnings detected" && return 0; fi

  local repo_name="${GITHUB_REPOSITORY:-$(basename $(pwd))}"
  local count=$(wc -l < "$unique_file")
  local preview=$(awk '{print "Issue " NR ": " $0}' "$unique_file" | head -n 20 | sed 's/"/\\"/g')
  local slack_msg=":warning: Found $count unique deprecation warning(s) in *${repo_name}*:\n\`\`\`\n$preview\n\`\`\`"
  notify_slack "$slack_msg" "$webhook"
}

function markdown_app_versions () {
  if [[ -z "$1" ]]; then project="$DEPLOY_HELPER_PROJECT"; else project="$1"; fi
  if [[ -z "$2" ]]; then repos="$DEPLOY_HELPER_REPOS"; else repos="$2"; fi
  cmd="bundle exec deploy_helper versions -p \"$project\" -t int,uat"
  if [[ -n $repos ]]; then cmd+=" -r \"$repos\""; fi
  message=$(eval "$cmd")
formatted=$(echo "$message" | jq -r '
  "| Synced | Repository | INT | UAT |",
  "|---|---|---|---|",
  (to_entries[] |
    if .value.int != .value.uat then
      "| ⚠️ | \(.key) | \(.value.int) | \(.value.uat) |"
    else
      "| ✅ | \(.key) | \(.value.int) | \(.value.uat) |"
    end
  ),
  "---"
  ')
  echo "$formatted"
}

function markdown_var_chart() {
  if [[ -z "$1" ]]; then echo 'Expected the 1st argument (Table Title), Found 0' && return 1; fi
  if [[ -z "$2" ]]; then echo 'Expected the 2nd argument (VAR List), Found 0' && return 1; fi
  local title="$1"
  local var_list="$2"
  local IFS=','

  echo "## **$title**"
  echo

  read -ra var_names <<< "$var_list"

  # Header row
  for var in "${var_names[@]}"; do
    printf "| %s " "$var"
  done
  echo "|"

  # Separator row
  for _ in "${var_names[@]}"; do
    printf "| --- "
  done
  echo "|"

  # Value row
  for var in "${var_names[@]}"; do
    printf "| %s " "${!var}"
  done
  echo "|"
}

function gha_build_link () {
  if [[ -z "$1" ]]; then echo 'Expected the 1st argument (Repo Name), Found 0' && return 1; fi
  if [[ -z "$2" ]]; then echo 'Expected the 2nd argument (YML File Name), Found 0' && return 1; fi
  base_url='https://github.com/ORG_NAME'
  workflow_path='actions/workflows'
  repo="$1"
  yml_file="$2"
  yml_url="$base_url/$repo/$workflow_path/$yml_file"
  echo "[🔗 View the related workflow run]($yml_url)"
}

function trigger_gha_build() {
  if [[ -z "$1" ]]; then echo 'Expected the 1st argument (Repo Name), Found 0' && return 1; fi
  if [[ -z "$2" ]]; then echo 'Expected the 2nd argument (Event Type), Found 0' && return 1; fi
  if [[ -n "$3" ]]; then CLIENT_PAYLOAD="$3"; else CLIENT_PAYLOAD="{}"; fi
  curl --location "https://api.github.com/repos/ORG_NAME/$1/dispatches" \
  --header 'Accept: application/vnd.github+json' \
  --header "Authorization: Bearer $GIT_TOKEN" \
  --header 'Content-Type: application/json' \
  --header 'X-GitHub-Api-Version: 2022-11-28' \
  --data "{\"event_type\": \"$2\",\"client_payload\": $CLIENT_PAYLOAD}"
}

function runner_list () {
  if [ $# -ne 2 ]; then echo "Usage: runner_list <total_threads> <max_threads_per_runner>" && return 1; fi
  total_threads=$1
  max_threads_per_runner=$2
  json="["
  while [ "$total_threads" -gt "$max_threads_per_runner" ]; do
    json+="$max_threads_per_runner,"
    total_threads=$((total_threads - max_threads_per_runner))
  done
  json+="$total_threads]"
  echo "$json"
}

function calculate_threads_downgrade () {
  if [ $# -ne 2 ]; then
    echo "Usage: calculate_threads_downgrade <original_threads> <downgrade_scale>"
    return 1
  fi

  original_threads=$1
  downgrade_scale=$2

  low_threads=$(awk -v t="$original_threads" -v s="$downgrade_scale" 'BEGIN {
    divided = int(t / s)
    remainder = t % s
    if (remainder > 0) print divided + 1
    else print divided
  }')

  echo "$low_threads"
}
