Feature: Accessibility tests for dashboard page

  @axe_508
  Scenario Outline: Accessibility test on dashboard tables
  "**In order to** read and interact with the data in Sample dashboard tables"
  "**As** a user with visual or other reading disability"
  "**I want ** all elements in Sample dashboard page meet the accessibility standards"
    Given I login Sample as "Admin" user
    When I navigate to "dashboard" page
    And I should see the total number of participants that have "<table>"
    Then I run all accessibility rules on this window
    Examples:
      | table                             |
      | Assignment Reports Pending Review |
      | Variant Reports Pending Review    |
      | Assignment Reports on Hold        |
      | Participants Requiring Data       |