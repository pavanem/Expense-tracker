package com.expensetracker.acceptance.steps;

import com.expensetracker.acceptance.CucumberSpringConfiguration;
import com.expensetracker.acceptance.TestContext;
import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.Map;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

public class AuthSteps {

    @Autowired
    private CucumberSpringConfiguration springConfig;

    @Autowired
    private TestContext testContext;

    private String getBaseUrl() {
        return "http://localhost:" + springConfig.getPort();
    }

    @Given("the system has open registration")
    public void the_system_has_open_registration() {
        Response response = RestAssured.given()
                .baseUri(getBaseUrl())
                .get("/api/auth/registration-status");
        assertThat(response.getStatusCode(), is(200));
    }

    @When("a user registers with username {string}, password {string}, and name {string}")
    public void a_user_registers(String username, String password, String name) {
        Map<String, String> body = Map.of(
                "username", username,
                "password", password,
                "fullName", name
        );

        Response response = RestAssured.given()
                .baseUri(getBaseUrl())
                .contentType(ContentType.JSON)
                .body(body)
                .post("/api/auth/register");

        testContext.setLastResponse(response);
        if (response.getStatusCode() == 201 || response.getStatusCode() == 200) {
            String token = response.jsonPath().getString("accessToken");
            testContext.setToken(token);
            testContext.setUserToken(username, token);
            testContext.set("adminToken", token);
        }
    }

    @When("a user logs in with username {string} and password {string}")
    public void a_user_logs_in(String username, String password) {
        Map<String, String> body = Map.of(
                "username", username,
                "password", password,
                "deviceLabel", "AcceptanceTestRunner"
        );

        Response response = RestAssured.given()
                .baseUri(getBaseUrl())
                .contentType(ContentType.JSON)
                .body(body)
                .post("/api/auth/login");

        testContext.setLastResponse(response);
        if (response.getStatusCode() == 200) {
            String token = response.jsonPath().getString("accessToken");
            testContext.setToken(token);
            testContext.setUserToken(username, token);
            String cookie = response.getCookie("refreshToken");
            if (cookie != null) {
                testContext.set("refreshTokenCookie", cookie);
            }
        }
    }

    @When("the user refreshes the session token via cookie")
    public void the_user_refreshes_the_session_token_via_cookie() {
        String cookie = testContext.get("refreshTokenCookie");
        var request = RestAssured.given().baseUri(getBaseUrl());
        if (cookie != null) {
            request.cookie("refreshToken", cookie);
        }
        Response response = request.post("/api/auth/refresh");
        testContext.setLastResponse(response);
        if (response.getStatusCode() == 200) {
            String token = response.jsonPath().getString("accessToken");
            testContext.setToken(token);
        }
    }

    @When("an unauthenticated refresh request is made without a cookie or body")
    public void unauthenticated_refresh_request() {
        Response response = RestAssured.given()
                .baseUri(getBaseUrl())
                .post("/api/auth/refresh");
        testContext.setLastResponse(response);
    }

    @When("the user logs in with username {string} and password {string}")
    public void the_user_logs_in(String username, String password) {
        a_user_logs_in(username, password);
    }

    @When("an unauthenticated request is made to {string}")
    public void unauthenticated_request_to(String endpoint) {
        Response response = RestAssured.given()
                .baseUri(getBaseUrl())
                .get(endpoint);

        testContext.setLastResponse(response);
    }

    @Then("the response status code should be {int}")
    public void response_status_code_should_be(int statusCode) {
        assertThat(testContext.getLastResponse().getStatusCode(), is(statusCode));
    }

    @Then("the response should contain an access token")
    public void response_should_contain_access_token() {
        String token = testContext.getLastResponse().jsonPath().getString("accessToken");
        assertThat(token, notNullValue());
        assertThat(token, not(emptyString()));
    }
}
