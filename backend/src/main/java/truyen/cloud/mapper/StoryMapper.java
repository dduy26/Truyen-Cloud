package truyen.cloud.mapper;

import truyen.cloud.dtos.request.StoryRequest;
import truyen.cloud.dtos.response.StoryResponse;
import truyen.cloud.model.Story;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;
import org.mapstruct.NullValuePropertyMappingStrategy;
import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE, nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface StoryMapper {

    StoryResponse toResponse(Story story);

    List<StoryResponse> toResponseList(List<Story> stories);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "slug", ignore = true)
    @Mapping(target = "latestChapter", ignore = true)
    @Mapping(target = "totalChapters", ignore = true)
    @Mapping(target = "rating", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "viewCount", ignore = true)
    @Mapping(target = "updateAt", ignore = true)
    Story toEntity(StoryRequest request);
}
