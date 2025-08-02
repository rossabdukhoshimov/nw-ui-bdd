from cucumber_tracker import CucumberTestTracker, RUNNING
import argparse

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('project_name', type=str)
    parser.add_argument('test_run', type=str)
    parser.add_argument('scenario_name', type=str)
    parser.add_argument('example_row', type=str)
    parser.add_argument('status', type=str)
    args = parser.parse_args()

    ctt = CucumberTestTracker(args.project_name, args.test_run)
    ctt.update_test_status(args.scenario_name, args.example_row, args.status, RUNNING)