package truyen.cloud.Implement;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import truyen.cloud.dtos.Request.UserCreateRequest;
import truyen.cloud.dtos.Request.UserUpdateRequest;
import truyen.cloud.dtos.Response.UserResponse;
import truyen.cloud.mapper.UserMapper;
import truyen.cloud.model.User;
import truyen.cloud.repository.UserRepository;
import truyen.cloud.service.UserService;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;

    @Override
    public UserResponse createUser(UserCreateRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username đã tồn tại!");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email đã tồn tại!");
        }

        User user = userMapper.toEntity(request);
        User savedUser = userRepository.save(user);
        return userMapper.toResponse(savedUser);
    }

    @Override
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(userMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public UserResponse getUserById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng với ID: " + id));
        return userMapper.toResponse(user);
    }

    @Override
    public UserResponse updateUser(UUID id, UserUpdateRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng với ID: " + id));

        if (request.getFullName() != null) user.setFullName(request.getFullName());
        if (request.getAvatar() != null) user.setAvatar(request.getAvatar());
        if (request.getRoles() != null) user.setRoles(request.getRoles());
        if (request.getIsActive() != null) user.setIsActive(request.getIsActive());

        User updatedUser = userRepository.save(user);
        return userMapper.toResponse(updatedUser);
    }

    @Override
    public void deleteUser(UUID id) {
        if (!userRepository.existsById(id)) {
            throw new RuntimeException("Không tìm thấy người dùng để xóa!");
        }
        userRepository.deleteById(id);
    }
}