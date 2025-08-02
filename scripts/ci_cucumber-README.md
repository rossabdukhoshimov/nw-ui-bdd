## CI Cucumber

**CI Cucumber** is a lightweight, easy-to-adopt test management and execution framework with powerful features designed
for modern CI/CD workflows.

### 📌 Quick Links

- [Key Features](#-key-features)
- [Step-by-Step Configuration](#-step-by-step-configuration)

### 🔧 Key Features

#### ✅ Test Case Management

- Stores metadata for each Cucumber test case in the cloud.
- Metadata includes: scenario name, example row, file location, latest test result, and timestamp.
- Organize test cases by project and test run name for better traceability.

#### ⚡ Multi-Threaded Test Execution

- Dynamically distributes test cases across multiple testing threads.
- Threads can run on:
  - Separate test runners
  - Different cloud builds
  - Even locally on your machine
- Intelligent scheduling:
  - Guaranteed no race conditions — no test is claimed by more than one thread.
  - Smart load balancing — slow-running threads won’t delay others. Faster threads claim more tests.
- Compatible with all major Cucumber frameworks:
  - Ruby Cucumber
  - Python Behave
  - Cucumber-JS

#### 📊 Real-Time Test Reporting

- Live test reporting — view test run results in real time.
- Reports update continuously as tests execute.

#### ⚙️ Modular GitHub Actions Workflow

- Easy-to-copy and fully modular workflow for GitHub Actions.
- Supports:
  - Customizable input parameters
  - High-concurrency multithreaded execution
  - Optional low-thread reruns for flaky tests
  - Both API and multi-browser UI testing

### 📘 Step-by-Step Configuration

#### 1. Add `ci_cucumber` to Your Cucumber Environment

1. **Install**
    - Copy the `ci_tools` folder into your repository. It can be placed anywhere, but we strongly recommend
      keeping it at the root level.
    - Add the following line to the **requirements.txt** file in the root folder of your repo
   > -r {relative_path_from_repo_root}/ci_tools/ci_cucumber_src/ci_cuc_requirements.txt

2. **Set Environment Variables**  
   Open `ci_cucumber.sh`.  
   Uncomment the `export` lines and fill in values that suit your project.

3. **Setup Test Run**
   > _(Already included in the GitHub Actions workflow template)_

   Use the command `ci_cuc_reset_test_run`.  
   This scans your feature files (by tag), creates a test run in the cloud, and uploads metadata for each matching test
   case.

4. **Run Tests in Parallel**
   > _(Already included in the GitHub Actions workflow template)_

   Use the command `ci_cuc_test_run_in_parallel`.  
   This command:
    - Queries test metadata in the test run
    - Claims one `NOT_RUN` test
    - Runs it, then updates the status to `PASSED` or `FAILED`
    - Repeats until no `NOT_RUN` tests remain  
      Multiple threads or instances (local or cloud) can safely run in parallel — no duplicate execution or race
      conditions.

5. **Monitor Test Run Progress**
   > _(Already included in the GitHub Actions workflow template)_

    - Use `ci_cuc_plain_txt_test_report` locally
    - Use `ci_cuc_markdown_test_report` in your CI environment  
      Results update in real time.

---

#### 2. Set Up GitHub Actions Workflow

1. **Install GitHub Actions Scripts**  
   Copy the `.github/actions` folder into your repo’s `.github/` directory.

2. **Copy Test Run Template**  
   Copy `ci_cuc_test_run.yml` into `.github/workflows/`:

3. **Configure Workflow Inputs**  
   Open the workflow `.yml` files and fill in the necessary `env` values.  
   Think of these as reusable test run definitions — you provide all necessary test run parameters here.

4. **Use the Workflow in Other Workflows**  
   You can call these test run workflows from any other GitHub Actions workflow.  
   We provide full examples in the `workflow_templates` folder (see `example_*.yml`).  
   Copy, tweak, and use them as needed.

5. **AWS keys**
   It's crucial to make sure the AWS keys used in your GITHUB action workflow have correct access. At least it
   needs to have PutItem, UpdateItem, GetItem, DeleteItem in DynamoDB. Sometimes, lacking access does not give you error.
   It will just make the script skip without any feedback. Please contact the cloud engineer to make sure the build has
   correctly configured AWS keys

#### 3. More

For whatever file you copy from this template repo, please search
> _#---------- SETUP ----------#_

That is the indicator of the block that you need to configure with your own values 