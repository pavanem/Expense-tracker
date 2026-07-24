package com.expensetracker.mapper;

import com.expensetracker.dto.IncomeCategoryRequest;
import com.expensetracker.dto.IncomeCategoryResponse;
import com.expensetracker.entity.IncomeCategory;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring")
public interface IncomeCategoryMapper {

    IncomeCategoryResponse toResponse(IncomeCategory category);

    IncomeCategory toEntity(IncomeCategoryRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntityFromRequest(IncomeCategoryRequest request, @MappingTarget IncomeCategory category);
}
