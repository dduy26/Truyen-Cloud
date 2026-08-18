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
@Document(collection = "crawler_logs")
public class CrawlerLog {
    @Id
    private String id;

    private String type; 

    private String status; 

    private String message;

    @Field("updated_stories_count")
    private int updatedStoriesCount;

    @Field("updated_story_details")
    private List<UpdatedStoryDetail> updatedStoryDetails;

    @Field("execution_time_ms")
    private long executionTimeMs;

    @Field("created_at")
    private LocalDateTime createdAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdatedStoryDetail {
        private String slug;
        private String name;
        private String latestChapter;
        private String thumbUrl;
    }
}
