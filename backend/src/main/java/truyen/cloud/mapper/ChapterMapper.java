package truyen.cloud.mapper;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.ReportingPolicy;

import truyen.cloud.dtos.request.ChapterRequest;
import truyen.cloud.dtos.response.ChapterResponse;
import truyen.cloud.model.Chapter;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE, nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface ChapterMapper {
    ChapterResponse toResponse(Chapter chapter);

    List<ChapterResponse> toResponseList(List<Chapter> chapters);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Chapter toEntity(ChapterRequest request);
}