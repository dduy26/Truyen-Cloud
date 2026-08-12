package truyen.cloud.dtos.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentRequest {
    private String storySlug;
    private String chapterName;
    private String chapter;
    private String content;
    private String username;
    private String avatar;
    private String userAvatar;
}
