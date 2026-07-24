package com.expensetracker.mapper;

import com.expensetracker.dto.IncomeResponse;
import com.expensetracker.entity.Income;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring", uses = IncomeCategoryMapper.class)
public interface IncomeMapper {

    IncomeResponse toResponse(Income income);
}
