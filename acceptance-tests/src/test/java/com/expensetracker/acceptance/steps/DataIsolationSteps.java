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
import java.util.List;
import java.util.Map;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

public class DataIsolationSteps {

    @Autowired
    private CucumberSpringConfiguration springConfig;

    @Autowired
    private TestContext testContext;

    private String getBaseUrl() {
        return "http://localhost:" + springConfig.getPort();
    }

    @Given("user {string} creates an expense of amount {double} with merchant {string}")
    public void user_creates_expense_with_amount(String username, double amount, String merchant) {
        String token = testContext.getUserToken(username);
        
        // Get category
        Response catRes = RestAssured.given()
                .baseUri(getBaseUrl())
                .header("Authorization", "Bearer " + token)
                .get("/api/categories");
        List<Map<String, Object>> categories = catRes.jsonPath().getList("content");
        Long categoryId = ((Number) categories.get(0).get("id")).longValue();

        Map<String, Object> body = Map.of(
                "amount", amount,
                "expenseDate", LocalDate.now().toString(),
                "merchant", merchant,
                "paymentMode", "CASH",
                "categoryId", categoryId
        );

        RestAssured.given()
                .baseUri(getBaseUrl())
                .header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(body)
                .post("/api/expenses");
    }

    @Given("user {string} creates an income of amount {double} with source {string}")
    public void user_creates_income_with_amount(String username, double amount, String source) {
        String token = testContext.getUserToken(username);
        
        Response catRes = RestAssured.given()
                .baseUri(getBaseUrl())
                .header("Authorization", "Bearer " + token)
                .get("/api/income-categories");
        List<Map<String, Object>> categories = catRes.jsonPath().getList("content");
        Long categoryId = ((Number) categories.get(0).get("id")).longValue();

        Map<String, Object> body = Map.of(
                "amount", amount,
                "incomeDate", LocalDate.now().toString(),
                "source", source,
                "incomeCategoryId", categoryId
        );

        RestAssured.given()
                .baseUri(getBaseUrl())
                .header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(body)
                .post("/api/income");
    }

    @Then("user {string} should see {int} expenses in their expense list")
    public void user_should_see_expenses_count(String username, int count) {
        String token = testContext.getUserToken(username);
        Response response = RestAssured.given()
                .baseUri(getBaseUrl())
                .header("Authorization", "Bearer " + token)
                .get("/api/expenses");

        assertThat(response.getStatusCode(), is(200));
        List<Object> content = response.jsonPath().getList("content");
        assertThat(content.size(), is(count));
    }

    @Then("user {string} should see {int} income records in their income list")
    public void user_should_see_income_count(String username, int count) {
        String token = testContext.getUserToken(username);
        Response response = RestAssured.given()
                .baseUri(getBaseUrl())
                .header("Authorization", "Bearer " + token)
                .get("/api/income");

        assertThat(response.getStatusCode(), is(200));
        List<Object> content = response.jsonPath().getList("content");
        assertThat(content.size(), is(count));
    }

    @Then("user {string} dashboard should report current month total of {double}")
    public void user_dashboard_expense_total(String username, double total) {
        String token = testContext.getUserToken(username);
        Response response = RestAssured.given()
                .baseUri(getBaseUrl())
                .header("Authorization", "Bearer " + token)
                .get("/api/dashboard");

        assertThat(response.getStatusCode(), is(200));
        assertThat(response.jsonPath().getDouble("currentMonthTotal"), is(closeTo(total, 0.01)));
    }

    @Then("user {string} dashboard should report current month income of {double}")
    public void user_dashboard_income_total(String username, double total) {
        String token = testContext.getUserToken(username);
        Response response = RestAssured.given()
                .baseUri(getBaseUrl())
                .header("Authorization", "Bearer " + token)
                .get("/api/dashboard");

        assertThat(response.getStatusCode(), is(200));
        assertThat(response.jsonPath().getDouble("currentMonthIncome"), is(closeTo(total, 0.01)));
    }
}
