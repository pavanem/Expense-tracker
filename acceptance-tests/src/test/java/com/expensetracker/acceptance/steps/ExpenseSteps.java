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

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

public class ExpenseSteps {

    @Autowired
    private CucumberSpringConfiguration springConfig;

    @Autowired
    private TestContext testContext;

    private String getBaseUrl() {
        return "http://localhost:" + springConfig.getPort();
    }

    private Long getOrCreateCategoryId(String name) {
        String token = testContext.getToken();
        Response res = RestAssured.given()
                .baseUri(getBaseUrl())
                .header("Authorization", "Bearer " + token)
                .get("/api/categories");

        List<Map<String, Object>> categories = res.jsonPath().getList("");
        if (categories != null && !categories.isEmpty()) {
            for (Map<String, Object> cat : categories) {
                if (name.equalsIgnoreCase((String) cat.get("name"))) {
                    return ((Number) cat.get("id")).longValue();
                }
            }
            return ((Number) categories.get(0).get("id")).longValue();
        }

        // Create new category if none exist
        Map<String, Object> catReq = Map.of("name", name, "color", "#FF5733");
        Response createRes = RestAssured.given()
                .baseUri(getBaseUrl())
                .header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(catReq)
                .post("/api/categories");
        return ((Number) createRes.jsonPath().get("id")).longValue();
    }

    @Given("an authenticated user {string} exists with password {string}")
    public void authenticated_user_exists(String username, String password) {
        // If we already have a token for this user from a previous step, just reuse it
        if (testContext.getUserToken(username) != null) {
            testContext.setToken(testContext.getUserToken(username));
            return;
        }

        // 1) Try self-registration (only works for the very first user)
        Map<String, String> regBody = Map.of(
                "username", username,
                "password", password
        );
        Response regRes = RestAssured.given()
                .baseUri(getBaseUrl())
                .contentType(ContentType.JSON)
                .body(regBody)
                .post("/api/auth/register");

        if (regRes.getStatusCode() == 201 || regRes.getStatusCode() == 200) {
            String token = regRes.jsonPath().getString("accessToken");
            testContext.setToken(token);
            testContext.setUserToken(username, token);
            // Store the first user's admin token for creating subsequent users
            testContext.set("adminToken", token);
            return;
        }

        // 2) Registration is closed — try to log in (user may already exist from a prior scenario)
        Map<String, String> loginBody = Map.of(
                "username", username,
                "password", password
        );
        Response loginRes = RestAssured.given()
                .baseUri(getBaseUrl())
                .contentType(ContentType.JSON)
                .body(loginBody)
                .post("/api/auth/login");

        if (loginRes.getStatusCode() == 200) {
            String token = loginRes.jsonPath().getString("accessToken");
            testContext.setToken(token);
            testContext.setUserToken(username, token);
            return;
        }

        // 3) User doesn't exist yet — create via admin API, then log in
        String adminToken = testContext.get("adminToken");
        Map<String, String> createBody = Map.of(
                "username", username,
                "password", password
        );
        RestAssured.given()
                .baseUri(getBaseUrl())
                .header("Authorization", "Bearer " + adminToken)
                .contentType(ContentType.JSON)
                .body(createBody)
                .post("/api/admin/users");

        // Now log in as the newly created user
        Response newLoginRes = RestAssured.given()
                .baseUri(getBaseUrl())
                .contentType(ContentType.JSON)
                .body(loginBody)
                .post("/api/auth/login");
        String token = newLoginRes.jsonPath().getString("accessToken");
        testContext.setToken(token);
        testContext.setUserToken(username, token);
    }

    @When("the user creates an expense with amount {double}, merchant {string}, payment mode {string}, and category {string}")
    public void user_creates_expense(double amount, String merchant, String paymentMode, String categoryName) {
        Long categoryId = getOrCreateCategoryId(categoryName);
        Map<String, Object> body = Map.of(
                "amount", amount,
                "expenseDate", LocalDate.now().toString(),
                "merchant", merchant,
                "paymentMode", paymentMode,
                "categoryId", categoryId,
                "description", "Acceptance test expense"
        );

        Response response = RestAssured.given()
                .baseUri(getBaseUrl())
                .header("Authorization", "Bearer " + testContext.getToken())
                .contentType(ContentType.JSON)
                .body(body)
                .post("/api/expenses");

        testContext.setLastResponse(response);
    }

    @When("the user attempts to create an expense with date {int} days in the future")
    public void user_attempts_expense_future_date(int daysInFuture) {
        Long categoryId = getOrCreateCategoryId("Food");
        LocalDate futureDate = LocalDate.now().plusDays(daysInFuture);

        Map<String, Object> body = Map.of(
                "amount", 500.0,
                "expenseDate", futureDate.toString(),
                "merchant", "Future Shop",
                "paymentMode", "UPI",
                "categoryId", categoryId
        );

        Response response = RestAssured.given()
                .baseUri(getBaseUrl())
                .header("Authorization", "Bearer " + testContext.getToken())
                .contentType(ContentType.JSON)
                .body(body)
                .post("/api/expenses");

        testContext.setLastResponse(response);
    }

    @When("the user requests the expenses list")
    public void user_requests_expenses_list() {
        Response response = RestAssured.given()
                .baseUri(getBaseUrl())
                .header("Authorization", "Bearer " + testContext.getToken())
                .get("/api/expenses");

        testContext.setLastResponse(response);
    }

    @Then("the expense response should contain merchant {string} and amount {double}")
    public void expense_response_contains(String merchant, double amount) {
        Response res = testContext.getLastResponse();
        assertThat(res.jsonPath().getString("merchant"), is(merchant));
        assertThat(res.jsonPath().getDouble("amount"), is(closeTo(amount, 0.01)));
    }

    @Then("the response should contain a page of expense records")
    public void response_should_contain_page_of_expenses() {
        Response res = testContext.getLastResponse();
        assertThat(res.jsonPath().getList("content"), notNullValue());
    }
}
