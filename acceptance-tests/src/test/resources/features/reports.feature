Feature: Reports Generation and Data Export

  Background:
    Given an authenticated user "reporter_user" exists with password "Password123!"

  Scenario: Generate monthly expense report
    When the user generates a monthly expense report for month 8 and year 2026
    Then the response status code should be 200
    And the report response should contain totalExpenses field

  Scenario: Generate monthly income report
    When the user generates a monthly income report for month 8 and year 2026
    Then the response status code should be 200
    And the report response should contain totalExpenses field

  Scenario: Export database CSV report
    When the user exports CSV data
    Then the response status code should be 200
    And the response header "Content-Type" should contain "text/csv"
