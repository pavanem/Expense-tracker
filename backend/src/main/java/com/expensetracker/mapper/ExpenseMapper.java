package com.expensetracker.mapper;

import com.expensetracker.dto.ExpenseRequest;
import com.expensetracker.dto.ExpenseResponse;
import com.expensetracker.entity.Expense;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring", uses = CategoryMapper.class)
public interface ExpenseMapper {

    ExpenseResponse toResponse(Expense expense);

    /**
     * Note: category is intentionally NOT mapped here because ExpenseService
     * must look up and validate the Category entity (existence + active
     * status) before attaching it — that resolution happens in the service,
     * not the mapper.
     */
}
