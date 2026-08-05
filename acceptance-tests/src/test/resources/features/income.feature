Feature: Income Management and Future Date Validation

  Background:
    Given an authenticated user "income_tester" exists with password "Password123!"

  Scenario: Create income entry with valid data
    When the user creates an income entry with amount 50000.0, source "Tech Corp Salary", and category "Salary"
    Then the response status code should be 201
    And the income response should contain source "Tech Corp Salary" and amount 50000.0

  Scenario: Reject income entry with date more than 2 months in future
    When the user attempts to create an income entry with date 70 days in the future
    Then the response status code should be 400

  Scenario: Allow income entry with date up to 2 months in future
    When the user attempts to create an income entry with date 45 days in the future
    Then the response status code should be 201

  Scenario: Fetch paginated income list
    When the user requests the income list
    Then the response status code should be 200
    And the response should contain a page of income records
