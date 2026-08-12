package truyen.cloud.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UserResponse {
    private String id;
    private String username;
    private String email;
    private String avatar;
    private List<String> roles;
    private String status; // "ACTIVE" | "BANNED"
    private String joinedDate;
}
