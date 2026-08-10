package truyen.cloud.dtos.Request;
import lombok.Data;
@Data
public class UserUpdateRequest {
    private String fullName;
    private String avatar;
    private String roles;
    private Boolean isActive;
}
