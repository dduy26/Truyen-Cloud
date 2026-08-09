package truyen.cloud.mapper;
import org.springframework.stereotype.Component;
import truyen.cloud.dtos.UserCreateRequest;
import truyen.cloud.dtos.UserResponse;
import truyen.cloud.model.User;

import java.time.LocalDateTime;
import java.util.UUID;
@Component
public class UserMapper {
    public User toEntity (UserCreateRequest request){
        if(request == null) return null;
        return User.builder()
                .id(UUID.randomUUID())
                .username(request.getUsername())
                .email(request.getEmail())
                .fullname(request.getFullname())
                .avatar(request.getAvatar())
                .roles(request.getRoles() != null ? request.getRoles() : "ROLE_USER")
                .isActive(request.isActive())
                .createAt(LocalDateTime.now())
                .build();
    }
    public UserResponse toResponse(User user){
        if(user == null) return null;
        UserResponse response = new UserResponse();
        response.setId(user.getId() != null ? user.getId().toString() : null); // Convert UUID sang String
        response.setUsername(user.getUsername());
        response.setEmail(user.getEmail());
        response.setFullName(user.getFullName());
        response.setAvatar(user.getAvatar());
        response.setRoles(user.getRoles());
        response.setIsActive(user.getIsActive());
        response.setCreatedAt(user.getCreatedAt());
        return response;
    }
}
