Feature: Authentication and Security Management

  Scenario: Register first user or verify login works
    Given an authenticated user "adminuser" exists with password "Password123!"
    When the user logs in with username "adminuser" and password "Password123!"
    Then the response status code should be 200
    And the response should contain an access token

  Scenario: Reject registration when an account already exists
    Given an authenticated user "guard_user" exists with password "Password123!"
    When a user registers with username "duplicate_reject", password "Password123!", and name "Another User"
    Then the response status code should be 403

  Scenario: Reject login with invalid credentials
    Given an authenticated user "login_tester" exists with password "Password123!"
    When a user logs in with username "login_tester" and password "WrongPassword123!"
    Then the response status code should be 401

  Scenario: Protect secured endpoints when unauthenticated
    When an unauthenticated request is made to "/api/expenses"
    Then the response status code should be 401
