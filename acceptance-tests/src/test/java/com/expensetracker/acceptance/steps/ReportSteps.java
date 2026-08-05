package com.expensetracker.acceptance.steps;

import com.expensetracker.acceptance.CucumberSpringConfiguration;
import com.expensetracker.acceptance.TestContext;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import io.restassured.RestAssured;
import io.restassured.response.Response;
import org.springframework.beans.factory.annotation.Autowired;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

public class ReportSteps {

    @Autowired
    private CucumberSpringConfiguration springConfig;

    @Autowired
    private TestContext testContext;

    private String getBaseUrl() {
        return "http://localhost:" + springConfig.getPort();
    }

    @When("the user generates a monthly expense report for month {int} and year {int}")
    public void user_generates_monthly_expense_report(int month, int year) {
        Response response = RestAssured.given()
                .baseUri(getBaseUrl())
                .header("Authorization", "Bearer " + testContext.getToken())
                .queryParam("month", month)
                .queryParam("year", year)
                .get("/api/reports/monthly");

        testContext.setLastResponse(response);
    }

    @When("the user generates a monthly income report for month {int} and year {int}")
    public void user_generates_monthly_income_report(int month, int year) {
        Response response = RestAssured.given()
                .baseUri(getBaseUrl())
                .header("Authorization", "Bearer " + testContext.getToken())
                .queryParam("month", month)
                .queryParam("year", year)
                .get("/api/reports/income/monthly");

        testContext.setLastResponse(response);
    }

    @When("the user exports CSV data")
    public void user_exports_csv_data() {
        Response response = RestAssured.given()
                .baseUri(getBaseUrl())
                .header("Authorization", "Bearer " + testContext.getToken())
                .get("/api/reports/export");

        testContext.setLastResponse(response);
    }

    @Then("the report response should contain totalExpenses field")
    public void report_contains_total_expenses() {
        Response res = testContext.getLastResponse();
        assertThat(res.jsonPath().get("totalExpenses"), notNullValue());
    }

    @Then("the response header {string} should contain {string}")
    public void response_header_contains(String headerName, String expectedValue) {
        Response res = testContext.getLastResponse();
        String headerVal = res.getHeader(headerName);
        assertThat(headerVal, notNullValue());
        assertThat(headerVal, containsString(expectedValue));
    }
}
