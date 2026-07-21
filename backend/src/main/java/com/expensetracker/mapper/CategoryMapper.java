package com.expensetracker.mapper;

import com.expensetracker.dto.CategoryRequest;
import com.expensetracker.dto.CategoryResponse;
import com.expensetracker.entity.Category;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring")
public interface CategoryMapper {

    CategoryResponse toResponse(Category category);

    Category toEntity(CategoryRequest request);

    /**
     * Applies non-null fields from the request onto an existing managed entity,
     * used by CategoryService#update so partial/PUT semantics don't clobber
     * server-managed fields (id, createdAt, updatedAt).
     */
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntityFromRequest(CategoryRequest request, @MappingTarget Category category);
}
