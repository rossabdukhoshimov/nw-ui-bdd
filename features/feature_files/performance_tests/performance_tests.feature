Feature: Performance tests for all UI related requests

  @performance_tests
  Scenario: The API requests supporting Dashboard should pass the performance threshold
    Given the artillery performance test is authorized with "UAT" tier "ADMINISTRATOR" API credentials
    When the artillery run performance test for scenario "sample_dashboard.yml" to generate report "sample_dashboard.json"
    Then in the generated performance test report, the endpoints should pass the following thresholds
      | endpoint              | mean | p50 | p95 | p99  | max  | error_rate |
      | list_all_participants | 200  | 150 | 300 | 3000 | 6000 | 0.01       |
      | list_all_protocols    | 300  | 200 | 500 | 3500 | 6000 | 0.01       |

  @performance_tests
  Scenario: The API requests supporting Participant List Page should pass the performance threshold
    Given the artillery performance test is authorized with "UAT" tier "ADMINISTRATOR" API credentials
    When the artillery run performance test for scenario "sample_participant_list.yml" to generate report "sample_participant_list.json"
    Then in the generated performance test report, the endpoints should pass the following thresholds
      | endpoint              | mean | p50 | p95 | p99  | max  | error_rate |
      | list_all_participants | 200  | 150 | 300 | 3000 | 6000 | 0.01       |
      | filter_participants   | 300  | 200 | 500 | 3500 | 6000 | 0.01       |
      | search_participants   | 300  | 200 | 500 | 3500 | 6000 | 0.01       |

  @performance_tests
  Scenario: The API requests supporting Participant Detail Page should pass the performance threshold
    Given the artillery performance test is authorized with "UAT" tier "ADMINISTRATOR" API credentials
    When the artillery run performance test for scenario "sample_participant_detail.yml" to generate report "sample_participant_detail.json"
    Then in the generated performance test report, the endpoints should pass the following thresholds
      | endpoint            | mean | p50 | p95 | p99  | max  | error_rate |
      | participant_details | 500  | 350 | 700 | 1000 | 2000 | 0.01       |

  @performance_tests
  Scenario: The API requests supporting Variant Report should pass the performance threshold
    Given the artillery performance test is authorized with "UAT" tier "ADMINISTRATOR" API credentials
    When the artillery run performance test for scenario "sample_variant_report_operations.yml" to generate report "sample_variant_report_operations.json"
    Then in the generated performance test report, the endpoints should pass the following thresholds
      | endpoint                                             | mean | p50  | p95  | p99  | max  | error_rate |
      | add_comments_to_participant                          | 1500 | 1000 | 2000 | 3500 | 6000 | 0.01       |
      | generate_presigned_url_to_upload_docs_to_participant | 1500 | 1000 | 2000 | 3500 | 6000 | 0.01       |
      | upload_docs_to_participant                           | 300  | 200  | 500  | 3500 | 6000 | 0.01       |
      | generate_presigned_url_to_upload_clia_report         | 1500 | 1000 | 2000 | 3500 | 6000 | 0.01       |
      | upload_clia_report                                   | 300  | 200  | 500  | 3500 | 6000 | 0.01       |
      | decide_a_variant                                     | 1500 | 1000 | 2000 | 3500 | 6000 | 0.01       |
      | confirm_variant_report                               | 3000 | 2000 | 5000 | 6500 | 8000 | 0.01       |

  @performance_tests
  Scenario: The API requests supporting Assignment Report should pass the performance threshold
    Given the artillery performance test is authorized with "UAT" tier "ADMINISTRATOR" API credentials
    When the artillery run performance test for scenario "sample_assignment_report_operations.yml" to generate report "sample_assignment_report_operations.json"
    Then in the generated performance test report, the endpoints should pass the following thresholds
      | endpoint                                          | mean | p50  | p95  | p99  | max  | error_rate |
      | generate_presigned_url_to_upload_pathology_report | 200  | 150  | 300  | 3000 | 6000 | 0.01       |
      | upload_pathology_report                           | 300  | 200  | 500  | 3500 | 6000 | 0.01       |
      | hold_assignment_report                            | 1500 | 1000 | 2000 | 3500 | 6000 | 0.01       |
      | release_assignment_report                         | 1500 | 1000 | 2000 | 3500 | 6000 | 0.01       |
      | confirm_assignment_report                         | 3000 | 2000 | 5000 | 6500 | 8000 | 0.01       |