from pathlib import Path
from typing import List, Dict, Optional, Any

FEATURE = 'Feature:'
SCN = 'Scenario:'
SCN_OTL = 'Scenario Outline:'
EXAMPLES = 'Examples:'
NO_EXAMPLE = 'N/A'
SCAN_STATUSES = ['look_for_tag', 'look_for_scn_name', 'look_for_example']


class FeatureScanner:
    def __init__(self, repo_root_path: str, feature_folder_path: str,
                 include_tags: List[str], exclude_tags: List[str] = None):
        if exclude_tags is None:
            exclude_tags = []
        self.repo_root: Path = Path(repo_root_path).resolve()
        feature_path_obj: Path = Path(feature_folder_path)
        if not feature_path_obj.is_absolute():
            feature_path_obj = self.repo_root / feature_folder_path
        self.feature_path: Path = feature_path_obj.resolve()

        # Ensure tags start with '@' and store them as sets for efficient lookup
        self.include_tags = [t[1:] if t.startswith('@') else t for t in include_tags]
        self.exclude_tags = [t[1:] if t.startswith('@') else t for t in exclude_tags]

        # Internal state variables reset for each file
        self._scenario_name: Optional[str] = None
        self._has_tag: bool = False
        self._looking_for_example: bool = False
        self._scanning_example: bool = False
        self._example_table_row: int = 0  # 0=Not started, 1=Header, 2+=Data rows

    def run(self) -> List[Dict[str, Any]]:
        scenarios: List[Dict[str, Any]] = []
        for file_path in self.feature_path.rglob('*.feature'):
            cf = CucumberFeature(file_path.as_posix())
            scenarios.extend(cf.scenarios_by_tag(self.include_tags, self.exclude_tags))

        for scenario in scenarios:
            scenario['test_location'] = scenario['test_location'].replace(f"{self.repo_root.as_posix()}/", "")
        scenarios.sort(key=lambda scn: f"{scn['scenario_name']}:{scn['example_row']:0>2}")
        return scenarios


class CucumberFeature:
    def __init__(self, filename: str):
        self.filename = filename
        with open(self.filename, 'r', encoding='utf-8') as f:
            self.feature_lines = [line.strip() for line in f.readlines()]
        self.feature_name: str = ''
        self.feature_tags: list[str] = []
        self.scenarios: list[dict] = []
        self.current_tags: list[str] = []
        self._parse()

    def all_scenarios(self) -> list[dict]:
        return self.scenarios.copy()

    def scenarios_by_tag(self, inclusion_tags: list[str], exclusion_tags: list[str] = None) -> list[dict]:
        if exclusion_tags is None:
            exclusion_tags = []
        filtered_scn = []
        for scenario in self.scenarios:
            inclusion_match = any(in_tag in scenario['tags'] for in_tag in inclusion_tags)
            exclusion_match = any(ex_tag in scenario['tags'] for ex_tag in exclusion_tags)
            if inclusion_match and not exclusion_match:
                filtered_scn.append(scenario)
        return filtered_scn.copy()

    def _parse(self):
        scenario_outline_name = ''
        scenario_outline_tags = []
        example_line = 0
        for i, line in enumerate(self.feature_lines):
            line_number = i + 1
            location = f"{self.filename}:{line_number}"
            self._gather_tags(line)
            if line.startswith('Feature:'):
                self.feature_name = line[len('Feature:'):].strip()
                self.feature_tags = self.current_tags
                self.current_tags = []
                scenario_outline_name = ''
            elif line.startswith('Scenario:'):
                this_scenario_tags = self.current_tags + self.feature_tags
                self.scenarios.append({
                    'scenario_name': line[len('Scenario:'):].strip(),
                    'scenario_outline': False,
                    'example_row': NO_EXAMPLE,
                    'test_location': location,
                    'tags': this_scenario_tags
                })
                self.current_tags = []
                scenario_outline_name = ''
            elif line.startswith('Scenario Outline:'):
                scenario_outline_name = line[len('Scenario Outline:'):].strip()
                scenario_outline_tags = self.current_tags + self.feature_tags
                example_line = 0
                self.current_tags = []
            elif line.startswith('Examples:'):
                if scenario_outline_name:
                    example_line = line_number
                else:
                    raise ValueError("Cannot find Scenario Outline before Examples at {location}")
            elif line.startswith('|') and scenario_outline_name and example_line > 0:
                example_table_row = line_number - example_line
                if example_table_row > 1:
                    self.scenarios.append({
                        'scenario_name': scenario_outline_name,
                        'scenario_outline': True,
                        'example_row': f"{example_table_row - 1}",
                        'test_location': location,
                        'tags': scenario_outline_tags
                    })

    def _gather_tags(self, line: str):
        if line.startswith('@'):
            self.current_tags.extend([tag.strip() for tag in line.split('@') if tag.strip()])

# import json
#
# repo = '/Users/wangl17/match_apps/test-sample-ui-bddtests'
# feature = 'features/feature_files'
# tags = ['regression_ui']
# fs = FeatureScanner(repo, feature, tags)
# result = fs.run()
# print(json.dumps(result, indent=2))
# print(len(result))
