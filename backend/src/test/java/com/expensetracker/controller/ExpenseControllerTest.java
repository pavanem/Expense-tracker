package com.expensetracker.controller;

import com.expensetracker.dto.ExpenseRequest;
import com.expensetracker.dto.ExpenseResponse;
import com.expensetracker.dto.PageResponse;
import com.expensetracker.entity.PaymentMode;
import com.expensetracker.exception.ResourceNotFoundException;
import com.expensetracker.service.ExpenseService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = ExpenseController.class)
@AutoConfigureMockMvc(addFilters = false)
class ExpenseControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockBean
    private ExpenseService expenseService;

    private ExpenseRequest validRequest() {
        return ExpenseRequest.builder()
                .amount(new BigDecimal("100.00"))
                .categoryId(1L)
                .paymentMode(PaymentMode.UPI)
                .expenseDate(LocalDate.now())
                .build();
    }

    @Test
    void create_returns201_withValidPayload() throws Exception {
        ExpenseResponse response = ExpenseResponse.builder().id(1L).amount(new BigDecimal("100.00")).build();
        when(expenseService.create(any(ExpenseRequest.class), any())).thenReturn(response);

        mockMvc.perform(post("/api/expenses")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    void create_returns400_whenAmountIsZero() throws Exception {
        ExpenseRequest invalid = ExpenseRequest.builder()
                .amount(BigDecimal.ZERO)
                .categoryId(1L)
                .paymentMode(PaymentMode.CASH)
                .expenseDate(LocalDate.now())
                .build();

        mockMvc.perform(post("/api/expenses")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.amount").exists());
    }

    @Test
    void create_returns400_whenExpenseDateExceeds45Days() throws Exception {
        ExpenseRequest invalid = ExpenseRequest.builder()
                .amount(new BigDecimal("10.00"))
                .categoryId(1L)
                .paymentMode(PaymentMode.CASH)
                .expenseDate(LocalDate.now().plusDays(46))
                .build();

        mockMvc.perform(post("/api/expenses")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void findById_returns404_whenMissing() throws Exception {
        when(expenseService.findById(eq(99L), any())).thenThrow(ResourceNotFoundException.forEntity("Expense", 99L));

        mockMvc.perform(get("/api/expenses/99"))
                .andExpect(status().isNotFound());
    }

    @Test
    void list_returns400_whenSortByIsNotWhitelisted() throws Exception {
        mockMvc.perform(get("/api/expenses").param("sortBy", "id; DROP TABLE expense"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void list_returnsPagedResults() throws Exception {
        PageResponse<ExpenseResponse> page = PageResponse.<ExpenseResponse>builder()
                .content(List.of(ExpenseResponse.builder().id(1L).build()))
                .page(0).size(20).totalElements(1).totalPages(1).last(true)
                .build();
        when(expenseService.search(any(), any())).thenReturn(page);

        mockMvc.perform(get("/api/expenses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(1))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void search_returnsPagedResults() throws Exception {
        PageResponse<ExpenseResponse> page = PageResponse.<ExpenseResponse>builder()
                .content(List.of(ExpenseResponse.builder().id(2L).build()))
                .page(0).size(20).totalElements(1).totalPages(1).last(true)
                .build();
        when(expenseService.search(any(), any())).thenReturn(page);

        mockMvc.perform(get("/api/expenses/search").param("keyword", "cafe"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(2));
    }

    @Test
    void delete_returns204() throws Exception {
        mockMvc.perform(delete("/api/expenses/1"))
                .andExpect(status().isNoContent());
    }
}
