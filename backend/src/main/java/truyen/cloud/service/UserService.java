package truyen.cloud.service;

import truyen.cloud.dtos.request.LoginRequest;
import truyen.cloud.dtos.request.RegisterRequest;
import truyen.cloud.dtos.response.AuthResponse;
import truyen.cloud.dtos.response.UserResponse;

public interface UserService {
    AuthResponse register(RegisterRequest request);
    AuthResponse login(LoginRequest request);
    UserResponse getCurrentUser(String username);
}

