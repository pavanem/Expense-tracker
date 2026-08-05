package com.expensetracker.acceptance;

import com.expensetracker.ExpenseTrackerApplication;
import io.cucumber.spring.CucumberContextConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.ActiveProfiles;
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
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("expense_tracker_test")
            .withUsername("test_user")
            .withPassword("test_pass");

    static {
        postgres.start();
    }

    public int getPort() {
        return port;
    }
}
