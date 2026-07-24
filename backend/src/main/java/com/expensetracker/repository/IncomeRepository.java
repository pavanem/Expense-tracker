package com.expensetracker.repository;

import com.expensetracker.entity.Income;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * All aggregate queries use (:userId IS NULL OR i.user.id = :userId) so
 * they work in both SECURITY_ENABLED modes — same pattern as ExpenseRepository.
 */
public interface IncomeRepository extends JpaRepository<Income, Long>, JpaSpecificationExecutor<Income> {

    @Query("SELECT COALESCE(SUM(i.amount), 0) FROM Income i " +
           "WHERE i.incomeDate BETWEEN :start AND :end AND (:userId IS NULL OR i.user.id = :userId)")
    BigDecimal sumAmountBetween(@Param("start") LocalDate start, @Param("end") LocalDate end,
                                @Param("userId") Long userId);

    @Query("SELECT COALESCE(SUM(i.amount), 0) FROM Income i " +
           "WHERE i.incomeDate = :date AND (:userId IS NULL OR i.user.id = :userId)")
    BigDecimal sumAmountByDate(@Param("date") LocalDate date, @Param("userId") Long userId);

    @Query("""
        SELECT i.incomeCategory.id, i.incomeCategory.name, i.incomeCategory.color, SUM(i.amount)
        FROM Income i
        WHERE i.incomeDate BETWEEN :start AND :end AND (:userId IS NULL OR i.user.id = :userId)
        GROUP BY i.incomeCategory.id, i.incomeCategory.name, i.incomeCategory.color
        ORDER BY SUM(i.amount) DESC
        """)
    List<Object[]> sumAmountByCategoryBetween(
            @Param("start") LocalDate start, @Param("end") LocalDate end, @Param("userId") Long userId);

    @Query("""
        SELECT FUNCTION('DATE_TRUNC', 'month', i.incomeDate), SUM(i.amount)
        FROM Income i
        WHERE i.incomeDate BETWEEN :start AND :end AND (:userId IS NULL OR i.user.id = :userId)
        GROUP BY FUNCTION('DATE_TRUNC', 'month', i.incomeDate)
        ORDER BY FUNCTION('DATE_TRUNC', 'month', i.incomeDate) ASC
        """)
    List<Object[]> sumAmountByMonthBetween(
            @Param("start") LocalDate start, @Param("end") LocalDate end, @Param("userId") Long userId);

    @Query("SELECT MIN(i.incomeDate) FROM Income i WHERE (:userId IS NULL OR i.user.id = :userId)")
    Optional<LocalDate> findEarliestDateByUser(@Param("userId") Long userId);

    boolean existsByIncomeCategoryId(Long categoryId);
}
