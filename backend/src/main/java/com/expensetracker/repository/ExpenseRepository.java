package com.expensetracker.repository;

import com.expensetracker.entity.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * JpaSpecificationExecutor backs dynamic search/filter/sort combinations
 * (see ExpenseSpecifications). Additional @Query methods below cover
 * dashboard and report aggregations that are cleaner expressed directly.
 */
public interface ExpenseRepository extends JpaRepository<Expense, Long>, JpaSpecificationExecutor<Expense> {

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.expenseDate = :date")
    BigDecimal sumAmountByDate(@Param("date") LocalDate date);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.expenseDate BETWEEN :start AND :end")
    BigDecimal sumAmountBetween(@Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("SELECT e FROM Expense e ORDER BY e.createdAt DESC")
    List<Expense> findRecent(org.springframework.data.domain.Pageable pageable);

    @Query("""
        SELECT e.category.id, e.category.name, e.category.color, SUM(e.amount)
        FROM Expense e
        WHERE e.expenseDate BETWEEN :start AND :end
        GROUP BY e.category.id, e.category.name, e.category.color
        ORDER BY SUM(e.amount) DESC
        """)
    List<Object[]> sumAmountByCategoryBetween(@Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("""
        SELECT e.expenseDate, SUM(e.amount)
        FROM Expense e
        WHERE e.expenseDate BETWEEN :start AND :end
        GROUP BY e.expenseDate
        ORDER BY e.expenseDate ASC
        """)
    List<Object[]> sumAmountByDayBetween(@Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("""
        SELECT FUNCTION('DATE_TRUNC', 'month', e.expenseDate), SUM(e.amount)
        FROM Expense e
        WHERE e.expenseDate BETWEEN :start AND :end
        GROUP BY FUNCTION('DATE_TRUNC', 'month', e.expenseDate)
        ORDER BY FUNCTION('DATE_TRUNC', 'month', e.expenseDate) ASC
        """)
    List<Object[]> sumAmountByMonthBetween(@Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("SELECT COUNT(e) FROM Expense e WHERE e.expenseDate BETWEEN :start AND :end")
    long countBetween(@Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("SELECT MAX(e.amount) FROM Expense e WHERE e.expenseDate BETWEEN :start AND :end")
    BigDecimal maxAmountBetween(@Param("start") LocalDate start, @Param("end") LocalDate end);

    @Query("SELECT MIN(e.amount) FROM Expense e WHERE e.expenseDate BETWEEN :start AND :end")
    BigDecimal minAmountBetween(@Param("start") LocalDate start, @Param("end") LocalDate end);

    boolean existsByCategoryId(Long categoryId);
}
