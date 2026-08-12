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
@Document(collection = "comments")
public class Comment {
    @Id
    private String id;

    @Field("story_slug")
    private String storySlug;      // Bình luận ở bộ truyện nào

    @Field("chapter_name")
    private String chapterName;    // Bình luận ở chương nào (Ví dụ: "Chương 100" hoặc "General" nếu ở trang truyện)

    @Field("user_id")
    private String userId;         // ID của người bình luận

    @Field("user_name")
    private String userName;       // Tên hiển thị độc giả

    @Field("user_avatar")
    private String userAvatar;     // Link ảnh đại diện độc giả

    private String content;        // Nội dung bình luận

    @Field("created_at")
    private LocalDateTime createdAt; // Thời gian bình luận

    @Field("updated_at")
    private LocalDateTime updatedAt; // Thời gian chỉnh sửa

    @Field("is_edited")
    private boolean isEdited;       // Đã chỉnh sửa hay chưa
}