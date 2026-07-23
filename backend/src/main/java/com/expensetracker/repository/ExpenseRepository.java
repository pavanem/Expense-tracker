package com.expensetracker.repository;

import com.expensetracker.entity.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * JpaSpecificationExecutor backs dynamic search/filter/sort combinations
 * (see ExpenseSpecifications). Additional @Query methods cover dashboard and
 * report aggregations scoped to the requesting user.
 */
public interface ExpenseRepository extends JpaRepository<Expense, Long>, JpaSpecificationExecutor<Expense> {

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.expenseDate = :date AND e.user.id = :userId")
    BigDecimal sumAmountByDate(@Param("date") LocalDate date, @Param("userId") Long userId);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE e.expenseDate BETWEEN :start AND :end AND e.user.id = :userId")
    BigDecimal sumAmountBetween(@Param("start") LocalDate start, @Param("end") LocalDate end, @Param("userId") Long userId);

    @Query("SELECT e FROM Expense e WHERE e.user.id = :userId ORDER BY e.createdAt DESC")
    List<Expense> findRecent(org.springframework.data.domain.Pageable pageable, @Param("userId") Long userId);

    @Query("""
        SELECT e.category.id, e.category.name, e.category.color, SUM(e.amount)
        FROM Expense e
        WHERE e.expenseDate BETWEEN :start AND :end AND e.user.id = :userId
        GROUP BY e.category.id, e.category.name, e.category.color
        ORDER BY SUM(e.amount) DESC
        """)
    List<Object[]> sumAmountByCategoryBetween(
            @Param("start") LocalDate start, @Param("end") LocalDate end, @Param("userId") Long userId);

    @Query("""
        SELECT e.expenseDate, SUM(e.amount)
        FROM Expense e
        WHERE e.expenseDate BETWEEN :start AND :end AND e.user.id = :userId
        GROUP BY e.expenseDate
        ORDER BY e.expenseDate ASC
        """)
    List<Object[]> sumAmountByDayBetween(
            @Param("start") LocalDate start, @Param("end") LocalDate end, @Param("userId") Long userId);

    @Query("""
        SELECT FUNCTION('DATE_TRUNC', 'month', e.expenseDate), SUM(e.amount)
        FROM Expense e
        WHERE e.expenseDate BETWEEN :start AND :end AND e.user.id = :userId
        GROUP BY FUNCTION('DATE_TRUNC', 'month', e.expenseDate)
        ORDER BY FUNCTION('DATE_TRUNC', 'month', e.expenseDate) ASC
        """)
    List<Object[]> sumAmountByMonthBetween(
            @Param("start") LocalDate start, @Param("end") LocalDate end, @Param("userId") Long userId);

    @Query("SELECT COUNT(e) FROM Expense e WHERE e.expenseDate BETWEEN :start AND :end AND e.user.id = :userId")
    long countBetween(@Param("start") LocalDate start, @Param("end") LocalDate end, @Param("userId") Long userId);

    @Query("SELECT MAX(e.amount) FROM Expense e WHERE e.expenseDate BETWEEN :start AND :end AND e.user.id = :userId")
    BigDecimal maxAmountBetween(@Param("start") LocalDate start, @Param("end") LocalDate end, @Param("userId") Long userId);

    @Query("SELECT MIN(e.amount) FROM Expense e WHERE e.expenseDate BETWEEN :start AND :end AND e.user.id = :userId")
    BigDecimal minAmountBetween(@Param("start") LocalDate start, @Param("end") LocalDate end, @Param("userId") Long userId);

    @Query("SELECT MIN(e.expenseDate) FROM Expense e WHERE e.user.id = :userId")
    Optional<LocalDate> findEarliestDateByUser(@Param("userId") Long userId);

    boolean existsByCategoryId(Long categoryId);
}
