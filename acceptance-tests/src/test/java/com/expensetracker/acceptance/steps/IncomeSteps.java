package com.expensetracker.acceptance.steps;

import com.expensetracker.acceptance.CucumberSpringConfiguration;
import com.expensetracker.acceptance.TestContext;
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

public class IncomeSteps {

    @Autowired
    private CucumberSpringConfiguration springConfig;

    @Autowired
    private TestContext testContext;

    private String getBaseUrl() {
        return "http://localhost:" + springConfig.getPort();
    }

    private Long getOrCreateIncomeCategoryId(String name) {
        String token = testContext.getToken();
        Response res = RestAssured.given()
                .baseUri(getBaseUrl())
                .header("Authorization", "Bearer " + token)
                .get("/api/income-categories");

        List<Map<String, Object>> categories = res.jsonPath().getList("");
        if (categories != null && !categories.isEmpty()) {
            for (Map<String, Object> cat : categories) {
                if (name.equalsIgnoreCase((String) cat.get("name"))) {
                    return ((Number) cat.get("id")).longValue();
                }
            }
            return ((Number) categories.get(0).get("id")).longValue();
        }

        // Create new income category if none exist
        Map<String, Object> catReq = Map.of("name", name, "color", "#10B981");
        Response createRes = RestAssured.given()
                .baseUri(getBaseUrl())
                .header("Authorization", "Bearer " + token)
                .contentType(ContentType.JSON)
                .body(catReq)
                .post("/api/income-categories");
        return ((Number) createRes.jsonPath().get("id")).longValue();
    }

    @When("the user creates an income entry with amount {double}, source {string}, and category {string}")
    public void user_creates_income(double amount, String source, String categoryName) {
        Long categoryId = getOrCreateIncomeCategoryId(categoryName);
        Map<String, Object> body = Map.of(
                "amount", amount,
                "incomeDate", LocalDate.now().toString(),
                "source", source,
                "incomeCategoryId", categoryId,
                "description", "Acceptance test income"
        );

        Response response = RestAssured.given()
                .baseUri(getBaseUrl())
                .header("Authorization", "Bearer " + testContext.getToken())
                .contentType(ContentType.JSON)
                .body(body)
                .post("/api/incomes");

        testContext.setLastResponse(response);
    }

    @When("the user attempts to create an income entry with date {int} days in the future")
    public void user_attempts_income_future_date(int daysInFuture) {
        Long categoryId = getOrCreateIncomeCategoryId("Salary");
        LocalDate futureDate = LocalDate.now().plusDays(daysInFuture);

        Map<String, Object> body = Map.of(
                "amount", 10000.0,
                "incomeDate", futureDate.toString(),
                "source", "Future Client",
                "incomeCategoryId", categoryId
        );

        Response response = RestAssured.given()
                .baseUri(getBaseUrl())
                .header("Authorization", "Bearer " + testContext.getToken())
                .contentType(ContentType.JSON)
                .body(body)
                .post("/api/incomes");

        testContext.setLastResponse(response);
    }

    @When("the user requests the income list")
    public void user_requests_income_list() {
        Response response = RestAssured.given()
                .baseUri(getBaseUrl())
                .header("Authorization", "Bearer " + testContext.getToken())
                .get("/api/incomes");

        testContext.setLastResponse(response);
    }

    @Then("the income response should contain source {string} and amount {double}")
    public void income_response_contains(String source, double amount) {
        Response res = testContext.getLastResponse();
        assertThat(res.jsonPath().getString("source"), is(source));
        assertThat(res.jsonPath().getDouble("amount"), is(closeTo(amount, 0.01)));
    }

    @Then("the response should contain a page of income records")
    public void response_should_contain_page_of_income() {
        Response res = testContext.getLastResponse();
        assertThat(res.jsonPath().getList("content"), notNullValue());
    }
}
