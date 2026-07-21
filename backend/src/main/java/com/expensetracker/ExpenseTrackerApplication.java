package com.expensetracker;

import com.expensetracker.config.JwtProperties;
import com.expensetracker.config.LockoutProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties({JwtProperties.class, LockoutProperties.class})
public class ExpenseTrackerApplication {

    public static void main(String[] args) {
        SpringApplication.run(ExpenseTrackerApplication.class, args);
    }
}
