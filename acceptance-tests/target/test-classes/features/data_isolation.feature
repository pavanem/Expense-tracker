Feature: Multi-Tenant Per-User Data Isolation

  Scenario: Users can only see their own expenses, income, dashboard, and reports
    Given an authenticated user "alice_user" exists with password "Password123!"
    And user "alice_user" creates an expense of amount 2500.0 with merchant "Alice Store"
    And user "alice_user" creates an income of amount 60000.0 with source "Alice Employer"
    When an authenticated user "bob_user" exists with password "Password123!"
    Then user "bob_user" should see 0 expenses in their expense list
    And user "bob_user" should see 0 income records in their income list
    And user "bob_user" dashboard should report current month total of 0.0
    And user "bob_user" dashboard should report current month income of 0.0
