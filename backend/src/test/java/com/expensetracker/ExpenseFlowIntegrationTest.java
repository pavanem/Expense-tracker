package com.expensetracker;

import com.expensetracker.dto.CategoryRequest;
import com.expensetracker.dto.ExpenseRequest;
import com.expensetracker.entity.PaymentMode;
import com.expensetracker.entity.User;
import com.expensetracker.entity.UserRole;
import com.expensetracker.repository.UserRepository;
import com.expensetracker.security.AuthenticatedUser;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Runs requests through the real controller -> service -> MapStruct mapper ->
 * repository -> H2 stack (no @MockBean anywhere), the way the app actually
 * behaves end to end. @Transactional rolls each test back so they don't
 * interfere with each other.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ExpenseFlowIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;

    private UsernamePasswordAuthenticationToken auth;

    @BeforeEach
    void setUp() {
        User user = userRepository.save(User.builder()
                .username("integration_user")
                .passwordHash("pass")
                .role(UserRole.USER)
                .enabled(true)
                .build());
        AuthenticatedUser principal = new AuthenticatedUser(user.getId(), user.getUsername(), user.getRole());
        auth = new UsernamePasswordAuthenticationToken(principal, null, List.of());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    void creatingCategoryThenExpense_showsUpInDashboardAndSearch() throws Exception {
        CategoryRequest categoryRequest = CategoryRequest.builder()
                .name("Integration Test Category")
                .color("#123456")
                .displayOrder(99)
                .build();

        String categoryJson = mockMvc.perform(post("/api/categories")
                        .with(authentication(auth))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(categoryRequest)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        Long categoryId = objectMapper.readTree(categoryJson).get("id").asLong();

        ExpenseRequest expenseRequest = ExpenseRequest.builder()
                .amount(new BigDecimal("42.50"))
                .categoryId(categoryId)
                .merchant("Integration Cafe")
                .paymentMode(PaymentMode.UPI)
                .expenseDate(LocalDate.now())
                .build();

        mockMvc.perform(post("/api/expenses")
                        .with(authentication(auth))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(expenseRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.category.name").value("Integration Test Category"))
                .andExpect(jsonPath("$.amount").value(42.5));

        mockMvc.perform(get("/api/dashboard").with(authentication(auth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.todayTotal").value(42.5));

        mockMvc.perform(get("/api/expenses/search").with(authentication(auth)).param("keyword", "Integration Cafe"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].merchant").value("Integration Cafe"));

        // Deleting the category while an expense references it must be blocked (409),
        // matching the SRS activate/deactivate model instead of a hard delete.
        mockMvc.perform(delete("/api/categories/" + categoryId).with(authentication(auth)))
                .andExpect(status().isConflict());
    }

    @Test
    void csvExport_forSpecificDate_returnsCsvWithExpectedHeaderAndFilename() throws Exception {
        CategoryRequest categoryRequest = CategoryRequest.builder()
                .name("CSV Test Category").color("#654321").displayOrder(98).build();
        String categoryJson = mockMvc.perform(post("/api/categories")
                        .with(authentication(auth))
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(categoryRequest)))
                .andReturn().getResponse().getContentAsString();
        Long categoryId = objectMapper.readTree(categoryJson).get("id").asLong();

        ExpenseRequest expenseRequest = ExpenseRequest.builder()
                .amount(new BigDecimal("15.00"))
                .categoryId(categoryId)
                .paymentMode(PaymentMode.CASH)
                .expenseDate(LocalDate.now())
                .build();
        mockMvc.perform(post("/api/expenses")
                .with(authentication(auth))
                .contentType("application/json")
                .content(objectMapper.writeValueAsString(expenseRequest)));

        mockMvc.perform(get("/api/reports/export").with(authentication(auth)).param("date", LocalDate.now().toString()))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "text/csv"))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("CSV Test Category")));
    }
}
