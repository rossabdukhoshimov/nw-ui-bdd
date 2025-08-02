from cucumber_tracker import CucumberTestTracker
import argparse

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('project_name', type=str)
    parser.add_argument('test_run', type=str)
    args = parser.parse_args()

    # Do not include @ in the test run name, standardize the test run name,
    # avoiding the case that sometimes you use @tag, sometimes you use just tag
    test_name = args.test_run.replace('@', '')
    ctt = CucumberTestTracker(args.project_name, test_name)
    print('true' if ctt.test_run_passed() else 'false')
