package truyen.cloud.service.impl;

import truyen.cloud.dtos.request.LoginRequest;
import truyen.cloud.dtos.request.RegisterRequest;
import truyen.cloud.dtos.response.AuthResponse;
import truyen.cloud.dtos.response.UserResponse;
import truyen.cloud.exception.ResourceNotFoundException;
import truyen.cloud.mapper.UserMapper;
import truyen.cloud.model.User;
import truyen.cloud.repository.UserRepository;
import truyen.cloud.service.UserService;
import truyen.cloud.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;


@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService{
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;
    private final UserMapper userMapper;

    @Override
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsernameIgnoreCase(request.getUsername())) {
            throw new RuntimeException("Lỗi: Username đã tồn tại!");
        }
        if (userRepository.existsByEmailIgnoreCase(request.getEmail())) {
            throw new RuntimeException("Lỗi: Email đã được sử dụng!");
        }

        // 1. Mã hóa mật khẩu
        String encodedPassword = passwordEncoder.encode(request.getPassword());

        // 2. Tận dụng UserMapper để tạo Entity
        User user = userMapper.toEntity(request, encodedPassword);
        user.setPassword(encodedPassword);
        
        user.setRoles(java.util.List.of("ROLE_MEMBER")); // Gán role mặc định   
        user.setCreatedAt(java.time.LocalDateTime.now()); 
        user.setActive(true);
        if (user.getAvatar() == null || user.getAvatar().isBlank()) {
            user.setAvatar("data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 200 200\"><circle cx=\"100\" cy=\"100\" r=\"100\" fill=\"%23cbd5e1\"/><circle cx=\"100\" cy=\"75\" r=\"40\" fill=\"%23ffffff\"/><path d=\"M100 125c-42 0-75 22-75 48v20h150v-20c0-26-33-48-75-48z\" fill=\"%23ffffff\"/></svg>");
        }

        User savedUser = userRepository.save(user);

        // 3. Tạo JWT Token
        String token = jwtUtil.generateToken(savedUser.getUsername());

        // 4. Tận dụng UserMapper để tạo AuthResponse từ savedUser đã có đầy đủ ID và thông tin
        AuthResponse response = userMapper.toAuthResponse(savedUser);
        response.setToken(token); 
        
        return response;
    }

    @Override
    public AuthResponse login(LoginRequest request) {
        // Xác thực qua Spring Security
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsernameOrEmail(),
                        request.getPassword()
                )
        );

        // Tìm User trong DB (Không phân biệt hoa/thường)
        User user = userRepository.findByUsernameIgnoreCase(request.getUsernameOrEmail())
                .orElseGet(() -> userRepository.findByEmailIgnoreCase(request.getUsernameOrEmail())
                        .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng!")));

        String token = jwtUtil.generateToken(user.getUsername());

        // Tận dụng UserMapper
        AuthResponse response = userMapper.toAuthResponse(user);
        response.setToken(token);
        return response;
    }

    @Override
    public UserResponse getCurrentUser(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin người dùng: " + username));
        
        // Chuyển từ User Entity sang UserResponse
        return userMapper.toUserResponse(user);
    }
}