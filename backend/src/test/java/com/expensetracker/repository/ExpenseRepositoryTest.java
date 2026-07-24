package com.expensetracker.repository;

import com.expensetracker.entity.Category;
import com.expensetracker.entity.CategoryStatus;
import com.expensetracker.entity.Expense;
import com.expensetracker.entity.PaymentMode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.test.annotation.DirtiesContext;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class ExpenseRepositoryTest {

    @Autowired
    private ExpenseRepository expenseRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    private Category food;
    private Category travel;

    @BeforeEach
    void setUp() {
        food = categoryRepository.save(Category.builder()
                .name("Food").color("#FF7043").displayOrder(1).status(CategoryStatus.ACTIVE).build());
        travel = categoryRepository.save(Category.builder()
                .name("Travel").color("#29B6F6").displayOrder(2).status(CategoryStatus.ACTIVE).build());

        expenseRepository.save(expense(new BigDecimal("120.00"), food, "Cafe", PaymentMode.UPI, LocalDate.now()));
        expenseRepository.save(expense(new BigDecimal("250.00"), food, "Diner", PaymentMode.CASH, LocalDate.now().minusDays(1)));
        expenseRepository.save(expense(new BigDecimal("1800.00"), travel, "Airline", PaymentMode.CREDIT_CARD, LocalDate.now().minusDays(1)));
    }

    private Expense expense(BigDecimal amount, Category category, String merchant, PaymentMode mode, LocalDate date) {
        return Expense.builder()
                .amount(amount)
                .category(category)
                .merchant(merchant)
                .description(null)
                .paymentMode(mode)
                .expenseDate(date)
                .build();
    }

    @Test
    void sumAmountByDate_sumsOnlyThatDay() {
        BigDecimal today = expenseRepository.sumAmountByDate(LocalDate.now(), null);
        assertThat(today).isEqualByComparingTo("120.00");
    }

    @Test
    void sumAmountBetween_sumsInclusiveRange() {
        BigDecimal total = expenseRepository.sumAmountBetween(LocalDate.now().minusDays(1), LocalDate.now(), null);
        assertThat(total).isEqualByComparingTo("2170.00");
    }

    @Test
    void sumAmountByCategoryBetween_groupsByCategoryDescending() {
        List<Object[]> rows = expenseRepository.sumAmountByCategoryBetween(
                LocalDate.now().minusDays(1), LocalDate.now(), null);

        assertThat(rows).hasSize(2);
        assertThat(rows.get(0)[1]).isEqualTo("Travel"); // highest total first
        assertThat((BigDecimal) rows.get(0)[3]).isEqualByComparingTo("1800.00");
    }

    @Test
    void countBetween_and_maxMin_amountBetween() {
        long count = expenseRepository.countBetween(LocalDate.now().minusDays(1), LocalDate.now(), null);
        BigDecimal max = expenseRepository.maxAmountBetween(LocalDate.now().minusDays(1), LocalDate.now(), null);
        BigDecimal min = expenseRepository.minAmountBetween(LocalDate.now().minusDays(1), LocalDate.now(), null);

        assertThat(count).isEqualTo(3);
        assertThat(max).isEqualByComparingTo("1800.00");
        assertThat(min).isEqualByComparingTo("120.00");
    }

    @Test
    void existsByCategoryId_trueOnlyWhenExpensesReferenceIt() {
        assertThat(expenseRepository.existsByCategoryId(food.getId())).isTrue();

        Category unused = categoryRepository.save(Category.builder()
                .name("Unused").color("#000000").displayOrder(9).status(CategoryStatus.ACTIVE).build());
        assertThat(expenseRepository.existsByCategoryId(unused.getId())).isFalse();
    }

    @Test
    void findRecent_returnsMostRecentlyCreatedFirst() {
        Pageable top2 = PageRequest.of(0, 2);
        List<Expense> recent = expenseRepository.findRecent(top2, null);

        assertThat(recent).hasSize(2);
        // Most recently inserted (Airline) should come before earlier inserts.
        assertThat(recent.get(0).getMerchant()).isEqualTo("Airline");
    }

    @Test
    void specifications_composeCorrectly_forCategoryAndPaymentModeAndKeyword() {
        Specification<Expense> spec = Specification
                .where(ExpenseSpecifications.categoryIdEquals(food.getId()))
                .and(ExpenseSpecifications.paymentModeEquals(PaymentMode.UPI));

        List<Expense> results = expenseRepository.findAll(spec);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getMerchant()).isEqualTo("Cafe");
    }

    @Test
    void specifications_keywordSearch_matchesAcrossFields() {
        Specification<Expense> spec = ExpenseSpecifications.keywordSearch("airline");

        List<Expense> results = expenseRepository.findAll(spec);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getCategory().getName()).isEqualTo("Travel");
    }

    @Test
    void specifications_amountBetween_filtersByRange() {
        Specification<Expense> spec = ExpenseSpecifications.amountBetween(
                new BigDecimal("200.00"), new BigDecimal("2000.00"));

        List<Expense> results = expenseRepository.findAll(spec);

        assertThat(results).hasSize(2);
        assertThat(results).extracting(Expense::getMerchant).containsExactlyInAnyOrder("Diner", "Airline");
    }
}
