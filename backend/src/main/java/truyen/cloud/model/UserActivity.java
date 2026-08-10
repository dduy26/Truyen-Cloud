package truyen.cloud.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "user_activities")
public class UserActivity {
    @Id
    private String id;

    @Field("user_id")
    private String userId;

    private List<String> bookmarks;

    private List<HistoryItem> history;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HistoryItem {
        @Field("story_slug")
        private String storySlug;

        @Field("last_chapter_name")
        private String lastChapterName;

        @Field("read_at")
        private LocalDateTime readAt;
    }
}
