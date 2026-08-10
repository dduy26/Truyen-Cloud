package truyen.cloud.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;


import truyen.cloud.dtos.request.RegisterRequest;
import truyen.cloud.dtos.response.AuthResponse;
import truyen.cloud.dtos.response.UserResponse;
import truyen.cloud.model.User;

@Mapper(componentModel = "spring",unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface UserMapper {
    UserResponse toUserResponse(User user);

    @Mapping(target = "roles", source = "roles")
    @Mapping(target = "createdAt", source = "createdAt")
    AuthResponse toAuthResponse(User user);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "password", source = "encodedPassword")
    User toEntity(RegisterRequest req, String encodedPassword);
}