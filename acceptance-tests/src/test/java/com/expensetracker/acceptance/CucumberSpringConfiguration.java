package com.expensetracker.acceptance;

import com.expensetracker.ExpenseTrackerApplication;
import io.cucumber.spring.CucumberContextConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;

@CucumberContextConfiguration
@SpringBootTest(
    classes = ExpenseTrackerApplication.class,
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT
)
@ActiveProfiles("test")
public class CucumberSpringConfiguration {

    @LocalServerPort
    private int port;

    @Container
    private static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("expense_tracker_test")
            .withUsername("test_user")
            .withPassword("test_pass");

    static {
        postgres.start();
    }

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("app.security.enabled", () -> "true");
        registry.add("app.jwt.secret", () -> "TestSecretKeyForCucumberAcceptanceTestsMustBeLongEnough1234567890!");
    }

    public int getPort() {
        return port;
    }
}
