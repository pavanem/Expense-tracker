Feature: Authentication and Security Management

  Scenario: Register admin user and perform login
    Given the system has open registration
    When a user registers with username "adminuser", password "Password123!", and name "Admin User"
    Then the response status code should be 201
    And the response should contain an access token
    When the user logs in with username "adminuser" and password "Password123!"
    Then the response status code should be 200
    And the response should contain an access token

  Scenario: Reject registration with invalid or duplicate user
    When a user registers with username "adminuser", password "Short1!", and name "Duplicate User"
    Then the response status code should be 400

  Scenario: Reject login with invalid credentials
    When a user logs in with username "adminuser" and password "WrongPassword123!"
    Then the response status code should be 401

  Scenario: Protect secured endpoints when unauthenticated
    When an unauthenticated request is made to "/api/expenses"
    Then the response status code should be 401
