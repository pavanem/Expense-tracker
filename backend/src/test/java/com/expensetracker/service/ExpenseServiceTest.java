package com.expensetracker.service;

import com.expensetracker.dto.ExpenseRequest;
import com.expensetracker.dto.ExpenseResponse;
import com.expensetracker.entity.Category;
import com.expensetracker.entity.Expense;
import com.expensetracker.entity.PaymentMode;
import com.expensetracker.exception.ResourceNotFoundException;
import com.expensetracker.mapper.ExpenseMapper;
import com.expensetracker.repository.CategoryRepository;
import com.expensetracker.repository.ExpenseRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ExpenseServiceTest {

    @Mock private ExpenseRepository expenseRepository;
    @Mock private CategoryRepository categoryRepository;
    @Mock private ExpenseMapper expenseMapper;

    @InjectMocks
    private ExpenseService expenseService;

    private Category category;
    private ExpenseRequest request;

    @BeforeEach
    void setUp() {
        category = Category.builder().id(1L).name("Food").color("#FF7043").build();
        request = ExpenseRequest.builder()
                .amount(new BigDecimal("100.00"))
                .categoryId(1L)
                .merchant("Cafe")
                .paymentMode(PaymentMode.UPI)
                .expenseDate(LocalDate.now())
                .build();
    }

    @Test
    void create_attachesResolvedCategory_andSaves() {
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        when(expenseRepository.save(any(Expense.class))).thenAnswer(inv -> inv.getArgument(0));
        when(expenseMapper.toResponse(any(Expense.class))).thenReturn(
                ExpenseResponse.builder().id(1L).amount(new BigDecimal("100.00")).build());

        ExpenseResponse response = expenseService.create(request);

        assertThat(response.getAmount()).isEqualByComparingTo("100.00");
        verify(expenseRepository).save(argThat(e -> e.getCategory().equals(category)));
    }

    @Test
    void create_throwsNotFound_whenCategoryDoesNotExist() {
        when(categoryRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> expenseService.create(request))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(expenseRepository, never()).save(any());
    }

    @Test
    void findById_throwsNotFound_whenMissing() {
        when(expenseRepository.findById(42L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> expenseService.findById(42L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void update_reappliesRequestFields_ontoExistingEntity() {
        Expense existing = Expense.builder().id(5L).category(category).amount(new BigDecimal("10.00")).build();
        when(expenseRepository.findById(5L)).thenReturn(Optional.of(existing));
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        when(expenseRepository.save(existing)).thenReturn(existing);
        when(expenseMapper.toResponse(existing)).thenReturn(
                ExpenseResponse.builder().id(5L).amount(new BigDecimal("100.00")).build());

        ExpenseResponse response = expenseService.update(5L, request);

        assertThat(response.getAmount()).isEqualByComparingTo("100.00");
        assertThat(existing.getMerchant()).isEqualTo("Cafe");
    }

    @Test
    void delete_removesExistingExpense() {
        Expense existing = Expense.builder().id(7L).build();
        when(expenseRepository.findById(7L)).thenReturn(Optional.of(existing));

        expenseService.delete(7L);

        verify(expenseRepository).delete(existing);
    }

    @Test
    void search_delegatesToRepositoryWithSpecificationAndMapsResults() {
        Expense entity = Expense.builder().id(1L).category(category).amount(new BigDecimal("50.00")).build();
        Pageable pageable = PageRequest.of(0, 20);
        Page<Expense> page = new PageImpl<>(List.of(entity), pageable, 1);

        when(expenseRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(page);
        when(expenseMapper.toResponse(entity)).thenReturn(ExpenseResponse.builder().id(1L).build());

        var criteria = new ExpenseService.ExpenseSearchCriteria(
                null, 1L, PaymentMode.UPI, null, null, null, null, null);

        var result = expenseService.search(criteria, pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getTotalElements()).isEqualTo(1);
    }
}
