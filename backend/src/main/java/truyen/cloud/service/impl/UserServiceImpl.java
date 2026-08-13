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

import java.time.LocalDateTime;
import java.util.List;

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
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Tên đăng nhập đã tồn tại!");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email đã được sử dụng!");
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .roles(List.of("ROLE_USER"))
                .createdAt(LocalDateTime.now())
                .build();

        userRepository.save(user);

        String accessToken = jwtUtil.generateAccessToken(user.getUsername());
        
        AuthResponse response = userMapper.toAuthResponse(user);
        response.setAccessToken(accessToken);
        return response;
    }

    @Override
    public AuthResponse login(LoginRequest request) {
        // 1. Nhờ AuthenticationManager xác thực username & password (tự bắn lỗi nếu sai)
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsernameOrEmail(), request.getPassword())
        );

        // 2. Tìm user trong DB
        User user = userRepository.findByUsername(request.getUsernameOrEmail())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng!"));

        // 3. Sinh Access Token
        String accessToken = jwtUtil.generateAccessToken(user.getUsername());

        // 4. Dùng Mapper chuyển từ User sang AuthResponse (hoặc dùng Builder)
        AuthResponse response = userMapper.toAuthResponse(user);
        response.setAccessToken(accessToken);
        return response;
    }

    @Override
    public UserResponse getCurrentUser(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng!"));

        return userMapper.toUserResponse(user);
    }
}