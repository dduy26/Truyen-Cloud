package truyen.cloud.service;
import truyen.cloud.dtos.Request.UserCreateRequest;
import truyen.cloud.dtos.Request.UserUpdateRequest;
import truyen.cloud.dtos.Response.UserResponse;

import java.util.List;
import java.util.UUID;
public interface UserService {
        UserResponse createUser(UserCreateRequest userCreateRequest);
        UserResponse updateUser(UUID userId, UserUpdateRequest userUpdateRequest);
        List<UserResponse> getAllUsers();
        UserResponse getUserById(UUID userId);
        void deleteUser(UUID userId);
    }

