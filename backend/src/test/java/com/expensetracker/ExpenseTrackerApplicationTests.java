package com.expensetracker;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Loads the entire application context (all @Service, @Repository,
 * @RestController, @Configuration beans, MapStruct-generated mapper impls,
 * Flyway-free H2 schema from src/test/resources/application.yml) end to end.
 * A failure here usually means a missing bean, a bad @Value binding, or a
 * MapStruct mapper that didn't get generated — the kind of break that unit
 * tests with mocked collaborators won't catch.
 */
@SpringBootTest
class ExpenseTrackerApplicationTests {

    @Test
    void contextLoads() {
        // Intentionally empty: a failed context load fails this test.
    }
}
