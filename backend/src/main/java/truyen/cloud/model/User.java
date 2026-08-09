package truyen.cloud.model;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.UUID;
@Document(collection = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    @Id
    private UUID id;
    private String username;
    private String email;
    private String password;
    private String fullName;
    private String avatar;
    private String roles;
    private Boolean isActive;
    private LocalDateTime createdAt;

}
