package truyen.cloud.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentReportResponse {
    private String id;
    private String commentId;
    private String commentContent;
    private String commentUserName;
    private String reporterUserId;
    private String reporterUserName;
    private String reason;
    private String description;
    private String status;
    private String storySlug;
    private String chapterName;
    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;
}
