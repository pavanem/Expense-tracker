Feature: Expense Management and Validation Rules

  Background:
    Given an authenticated user "expense_tester" exists with password "Password123!"

  Scenario: Create expense with valid data
    When the user creates an expense with amount 1500.50, merchant "Supermarket", payment mode "CREDIT_CARD", and category "Food"
    Then the response status code should be 201
    And the expense response should contain merchant "Supermarket" and amount 1500.50

  Scenario: Reject expense with date more than 45 days in the future
    When the user attempts to create an expense with date 50 days in the future
    Then the response status code should be 400

  Scenario: Allow expense with date within 45 days in the future
    When the user attempts to create an expense with date 30 days in the future
    Then the response status code should be 201

  Scenario: Fetch paginated expenses list
    When the user requests the expenses list
    Then the response status code should be 200
    And the response should contain a page of expense records
