Feature: Maintain testing account password
#  Background:
#    Given I have the fresh password for "combo" accounts

  @maintenance
  Scenario Outline: Update testing account property
    Given I login Okta App as "<user>" user
    And I navigate to account settings
    When I update the password of the "<user>" user
    Then I update the GitHub Actions secret for "<user>" user
    Examples:
      | user                      |
      | Admin                     |
      | AR reviewer               |
      | Bioinformatician          |
      | CLIA report viewer        |
      | CLIA report uploader      |
      | LPO Alliance              |
      | LPO TT                    |
      | LPO MSP                   |
      | LPO TT MSP                |
      | LPO ECOG                  |
      | Pathology report viewer   |
      | Pathology report uploader |
      | Read only                 |
