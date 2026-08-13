package truyen.cloud.controller;

import truyen.cloud.dtos.response.UserResponse;
import truyen.cloud.model.User;
import truyen.cloud.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {
        private final UserRepository userRepository;

    // 1. Lấy danh sách tất cả người dùng trong hệ thống
    @GetMapping
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        List<User> users = userRepository.findAll();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        List<UserResponse> response = users.stream().map(user -> UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .avatar((user.getAvatar() != null && !user.getAvatar().isBlank()) ? user.getAvatar() : "data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 200 200\"><circle cx=\"100\" cy=\"100\" r=\"100\" fill=\"%23cbd5e1\"/><circle cx=\"100\" cy=\"75\" r=\"40\" fill=\"%23ffffff\"/><path d=\"M100 125c-42 0-75 22-75 48v20h150v-20c0-26-33-48-75-48z\" fill=\"%23ffffff\"/></svg>")
                .roles(user.getRoles())
                .status(user.isActive() ? "ACTIVE" : "BANNED")
                .joinedDate(user.getCreatedAt() != null ? user.getCreatedAt().format(formatter) : "2026-01-01")
                .build()
        ).collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    // 2. Khóa (Ban) hoặc Mở khóa tài khoản người dùng
    @PatchMapping("/{id}/status")
    public ResponseEntity<UserResponse> toggleUserStatus(
            @PathVariable String id,
            @RequestBody Map<String, String> payload) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng với ID: " + id));

        String status = payload.getOrDefault("status", "ACTIVE");
        user.setActive("ACTIVE".equalsIgnoreCase(status));
        userRepository.save(user);

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        UserResponse response = UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .avatar(user.getAvatar())
                .roles(user.getRoles())
                .status(user.isActive() ? "ACTIVE" : "BANNED")
                .joinedDate(user.getCreatedAt() != null ? user.getCreatedAt().format(formatter) : "2026-01-01")
                .build();

        return ResponseEntity.ok(response);
    }

    // 3. Cập nhật quyền hạn (Role) tài khoản
    @PatchMapping("/{id}/role")
    public ResponseEntity<UserResponse> updateUserRole(
            @PathVariable String id,
            @RequestBody Map<String, String> payload) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng với ID: " + id));

        String role = payload.getOrDefault("role", "ROLE_MEMBER");
        user.setRoles(List.of(role));
        userRepository.save(user);

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        UserResponse response = UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .avatar(user.getAvatar())
                .roles(user.getRoles())
                .status(user.isActive() ? "ACTIVE" : "BANNED")
                .joinedDate(user.getCreatedAt() != null ? user.getCreatedAt().format(formatter) : "2026-01-01")
                .build();

        return ResponseEntity.ok(response);
    }
}