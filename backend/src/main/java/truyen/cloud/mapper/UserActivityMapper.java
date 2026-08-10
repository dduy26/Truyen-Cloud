package truyen.cloud.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

import truyen.cloud.dtos.response.UserActivityResponse;
import truyen.cloud.model.UserActivity;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface UserActivityMapper {
    UserActivityResponse toResponse(UserActivity activity);

    UserActivityResponse.HistoryResponseItem toHistoryResponseItem(UserActivity.HistoryItem item);
}
