package truyen.cloud.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "comment_reports")
public class CommentReport {
    @Id
    private String id;

    @Field("comment_id")
    private String commentId;          // ID comment bị báo cáo

    @Field("comment_content")
    private String commentContent;     // Nội dung comment bị báo cáo (snapshot)

    @Field("comment_user_name")
    private String commentUserName;    // Tên người viết comment bị báo cáo

    @Field("reporter_user_id")
    private String reporterUserId;     // ID người báo cáo

    @Field("reporter_user_name")
    private String reporterUserName;   // Tên người báo cáo

    private String reason;             // SPAM, NOI_DUNG_XAU, QUAY_ROI, KHAC

    private String description;        // Mô tả chi tiết

    private String status;             // PENDING, RESOLVED, DISMISSED

    @Field("story_slug")
    private String storySlug;          // Truyện liên quan

    @Field("chapter_name")
    private String chapterName;        // Chapter liên quan

    @Field("created_at")
    private LocalDateTime createdAt;   // Thời gian báo cáo

    @Field("resolved_at")
    private LocalDateTime resolvedAt;  // Thời gian xử lý
}
