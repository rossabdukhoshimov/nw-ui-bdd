import secrets
from cucumber_tracker import CucumberTestTracker, PASSED

tests = [
    {
        'scenario_name': 'creds_test a',
        'example_row': 'N/A',
        'scenario_outline': False,
        'test_location': 'dummy_folder/dummy_feature.feature:5',
        'tags': ['creds_test']
    },
    {
        'scenario_name': 'creds_test b',
        'example_row': 'N/A',
        'scenario_outline': False,
        'test_location': 'dummy_folder/dummy_feature.feature:15',
        'tags': ['creds_test']
    },
]
project_name = 'ci_cuc_dummy_project'
test_run_name = f"creds_test_{secrets.randbelow(100000)}"
validated = True

ctt = CucumberTestTracker(project_name, test_run_name)

# Run sync test run to make sure the AWS keys have access to the following operations:
# dynamodb:Query, dynamodb:PutItem, dynamodb:DeleteItem, dynamodb:BatchDelete,
ctt.sync_tests_in_test_run(tests)
print(f"ci_cuc_validate_aws_keys: Successfully created test run: {project_name} under project: {test_run_name}")

# Run update test status to make sure the AWS keys have access to the following operations:
# dynamodb:UpdateItem,
updated = ctt.update_test_status('creds_test a', 'N/A', PASSED)
validated = validated and updated
if updated:
    print("ci_cuc_validate_aws_keys: Successfully updated test status for 'creds_test a'")
else:
    print("ci_cuc_validate_aws_keys FAILED: Failed to update test status for 'creds_test a'")

# Run delete test run to clean up
ctt.delete_test_run()
print(f"ci_cuc_validate_aws_keys: Successfully deleted test run: {project_name} under project: {test_run_name}")

# Final verdict
if validated:
    print('ci_cuc_validate_aws_keys: ALL PASSED')
else:
    raise Exception('ci_cuc_validate_aws_keys FAILED: please check log to find the issue')
