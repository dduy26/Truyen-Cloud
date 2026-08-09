package truyen.cloud.dtos.Request;
import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.data.annotation.Id;

import lombok.Data;
@Data
public class UserCreateRequest{
    @Id
    private UUID id;
    private String username;
    private String email;
    private String password;
    private String fullname;
    private String avatar;
    private String roles;
}