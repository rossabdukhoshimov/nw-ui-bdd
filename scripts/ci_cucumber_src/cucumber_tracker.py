import secrets
from datetime import datetime
from zoneinfo import ZoneInfo
from botocore.exceptions import ClientError
from db_helpers import DBHelpers

TABLE_NAME = 'pmacc-bdd-result'
NOT_RUN = 'NOT_RUN'
RUNNING = 'RUNNING'
PASSED = 'PASSED'
FAILED = 'FAILED'
NONE = 'N/A'
STATUSES = [NOT_RUN, RUNNING, FAILED, PASSED]


def displayable_test_name(test_record: dict) -> str:
    name = test_record['scenario_name']
    return name if test_record['example_row'] == NONE else f"{name} -- {test_record['example_row']}"


def extract_test_run_timestamps(test_records: list[dict]) -> dict[str, str]:
    # The last_update_time is N/A for NOT_RUN tests, N/A is greater than any normal timestamp
    # So that's a good logic, that means if any of the test still NOT_RUN at this moment, the test run is not finished yet
    max_reset_time = max(r['test_run_reset_time'] for r in test_records) if len(test_records) > 0 else NONE
    max_finish_time = max(r['last_update_time'] for r in test_records) if len(test_records) > 0 else NONE
    return {'reset_time': max_reset_time, 'finish_time': max_finish_time}


def current_timestamp() -> str:
    return datetime.now(ZoneInfo("America/New_York")).strftime('%Y-%m-%dT%H:%M:%S')


def scenario_info_same(record1: dict, record2: dict) -> bool:
    fields = ['project_test_run', 'project', 'test_run_name', 'test_name_example_row', 'scenario_name', 'example_row',
              'scenario_outline', 'test_location']
    return all(record1[field] == record2[field] for field in fields)


class CucumberTestTracker:
    def __init__(self, project, test_run_name):
        self.project = project
        self.test_run_name = test_run_name
        self.prime_key_value = f"{self.project}/{self.test_run_name}"
        self.db = DBHelpers(TABLE_NAME, 'project_test_run', 'test_name_example_row')
        self.db_records = []

    def delete_test_run(self):
        keys_to_delete = [
            {
                'project_test_run': record['project_test_run'],
                'test_name_example_row': record['test_name_example_row']
            }
            for record in self._query_test_cases(force_query=True)
        ]
        self.db.batch_delete(keys_to_delete)
        print(f"Deleted test run '{self.prime_key_value}' from table '{TABLE_NAME}'.")

    def _query_test_cases(self, force_query=False):
        if len(self.db_records) > 0 and not force_query:
            return self.db_records
        return self.db.query_by_prime_key(self.prime_key_value)

    def all_tests(self):
        results = self._query_test_cases()
        return sorted(
            results,
            key=lambda r: f"{r['scenario_name']}:{str(r['example_row']):0>2}"
        )

    def tests_by_status(self, status_list):
        results = self._query_test_cases()
        filtered = [r for r in results if r.get('test_status') in status_list]
        return sorted(
            filtered,
            key=lambda r: f"{r['scenario_name']}:{str(r['example_row']):0>2}"
        )

    def tests_by_tags(self, tag_list):
        results = self._query_test_cases()
        filtered = [r for r in results if any(tag in r.get('scenario_tags', []) for tag in tag_list)]
        return sorted(
            filtered,
            key=lambda r: f"{r['scenario_name']}:{str(r['example_row']):0>2}"
        )

    def random_test_by_status(self, status_list):
        try:
            picked_list = self.tests_by_status(status_list)
            return secrets.choice(picked_list) if picked_list else {}
        except Exception as e:
            return f"error: cannot get tests by status - {str(e)}"

    def test_run_passed(self):
        report = self.tests_by_status(STATUSES)
        return all(r.get('test_status') == PASSED for r in report)

    def json_test_result(self):
        report = self.tests_by_status(STATUSES)
        timestamps = extract_test_run_timestamps(report)
        final_result = {
            'title': f"Test Result for {self.project} test run <{self.test_run_name}>",
            'reset_time': timestamps['reset_time'],
            'finish_time': timestamps['finish_time'],
            'timestamp': f"Reset At: {timestamps['reset_time']},  Finish At: {timestamps['finish_time']}",
            'summary': [f"Total: {len(report)}"],
            'detail_result': {status: [] for status in STATUSES}
        }
        for item in report:
            final_result['detail_result'][item['test_status']].append(displayable_test_name(item))
        for status in STATUSES:
            final_result['summary'].append(f"{status}: {len(final_result['detail_result'][status])}")
        return final_result

    def markdown_test_result(self, show_detail=None):
        raw = self.json_test_result()
        report_txt = f"## **{raw['title']}**\n"
        report_txt += f"### **Reset At**: {raw['reset_time']}, **Finish At**: {raw['finish_time']}\n"
        report_txt += f"### {' &nbsp; &nbsp; &nbsp;'.join(raw['summary'])}"
        for status, test_list in raw['detail_result'].items():
            if len(test_list) > 0:
                report_txt += f"\n#### **{status}:**\n"
                if show_detail and status in show_detail:
                    report_txt += '\n'.join(test_list)
                else:
                    report_txt += f"The list of {len(test_list)} {status} tests is hidden"
        report_txt += "\n"
        return report_txt

    def plain_text_test_result(self, show_detail=None):
        raw = self.json_test_result()
        report_txt = f"\n**** {raw['title']} ***\n\n{raw['timestamp']}\n\n{'   '.join(raw['summary'])}"
        for status, test_list in raw['detail_result'].items():
            if len(test_list) > 0:
                report_txt += f"\n\n{status}:\n  "
                if show_detail and status in show_detail:
                    report_txt += '\n  '.join(test_list)
                else:
                    report_txt += f"The list of {len(test_list)} {status} tests is hidden"
        return report_txt

    def update_test_status(self, test_name, example_row, status, from_status='', print_log=True):
        row = NONE if example_row in [None, '', '0'] else example_row
        status = status.upper()
        if status not in STATUSES:
            raise Exception(f"Unknown test status: {status}")
        if from_status and from_status not in STATUSES:
            raise Exception(f"Unknown test status: {status}")

        sort_key_value = f"{test_name}:{row}"
        new_values = {
            'test_status': status,
            'last_update_time': current_timestamp()
        }
        condition = {'test_status': from_status.upper()} if from_status else None

        try:
            self.db.update_item(
                self.prime_key_value,
                sort_key_value,
                new_values,
                condition
            )
            if print_log:
                print(f"Successfully set status {status} for {sort_key_value}")
            return True

        except ClientError as e:
            if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
                if print_log:
                    print(
                        f"Failed to set status {status} for {sort_key_value}. Condition not met (status was not {from_status.upper()}).")
            else:
                if print_log:
                    print(f"Error updating DynamoDB: {e.response['Error']['Message']}")
            return False

    def sync_tests_in_test_run(self, tests, reset_statuses=None, new_status=NOT_RUN):
        if reset_statuses is None:
            reset_statuses = [RUNNING, FAILED, PASSED]
        if len(tests) == 0:
            print("sync_tests_in_test_run: The tests list is empty")
            return
        db_records = {r['test_name_example_row']: r for r in self._query_test_cases(force_query=True)}
        new_records = self._tests_to_db_records(tests, new_status, current_timestamp())
        records_to_update = []
        for key, record in new_records.items():
            db_record = db_records.get(key)
            # If this new record cannot be found in db, or find in db, but the status is in the list of reset status, this record needs to be updated
            if db_record is None or db_record['test_status'] in reset_statuses:
                records_to_update.append(record)
            # If this record can be found in db, and the db status is also good, But the test case info has changed, also need to be updated
            elif not scenario_info_same(db_record, record):
                record['test_status'] = db_record['test_status']
                records_to_update.append(record)
        self.db.batch_put(records_to_update)
        keys_to_delete = [
            {
                'project_test_run': self.prime_key_value,
                'test_name_example_row': sort_key
            }
            for sort_key in db_records
            if sort_key not in new_records
        ]
        self.db.batch_delete(keys_to_delete)

        # self.
        # for this_new_record in new_records:
        #     this_db_record = any

        # records_to_update = new_records.map do |r|
        #   find = db_records.find { |db_r| db_r['test_name_example_row'] == r[:test_name_example_row] }
        #   next r if find.nil? || reset_statuses.include?(find['test_status'])
        #
        #   unless scenario_info_same?(find, r)
        #     r[:test_status] = find['test_status']
        #     r
        #   end
        # end
        # update_test_records(records_to_update.compact)
        # new_sorting_keys = new_records.collect { |r| r[:test_name_example_row] }
        # records_to_delete = db_records.select { |r| !new_sorting_keys.include?(r['test_name_example_row']) }
        # delete_unupdated_records(records_to_delete)

    def _tests_to_db_records(self, test_list, status, reset_time):
        return {
            f"{scn['scenario_name']}:{scn['example_row']}": {
                'project_test_run': self.prime_key_value, 'project': self.project, 'test_run_name': self.test_run_name,
                'test_name_example_row': f"{scn['scenario_name']}:{scn['example_row']}", 'last_update_time': NONE,
                'scenario_name': scn['scenario_name'], 'example_row': scn['example_row'],
                'scenario_outline': scn['scenario_outline'], 'test_location': scn['test_location'],
                'test_status': status, 'test_run_reset_time': reset_time, 'scenario_tags': scn.get('tags', [])
            }
            for scn in test_list
        }


class CucumberTestRuns:
    def __init__(self):
        self.db = DBHelpers(TABLE_NAME, 'project_test_run', 'test_name_example_row')

    def all_test_runs(self) -> dict[str, list[str]]:
        prime_keys = self.db.all_prime_keys()
        result = {}
        for prime_key in prime_keys:
            parts = prime_key.split('/')
            project = parts[0]
            test_run_name = '/'.join(parts[1:])
            if project in result:
                result[project].append(test_run_name)
            else:
                result[project] = [test_run_name]
        return result

    def list_projects(self) -> list[str]:
        details = self.all_test_runs()
        return list(details.keys())

    def list_test_runs(self, project: str) -> list[str]:
        details = self.all_test_runs()
        return details.get(project, [])
