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
@Document(collection = "stories")
public class Story {
    @Id
    private String id;

    private String name;
    
    private String slug;

    @Field("origin_name")
    private List<String> originName;

    @Field("thumb_url")
    private String thumbUrl;

    private String author;

    private List<String> categories;

    private String status;

    private String summary; 

    @Field("latest_chapter")
    private String latestChapter;

    @Field("total_chapters")
    private int totalChapters;

    @Field("rating")
    private double rating;

    @Field("created_at")
    private LocalDateTime createdAt;

    @Field("view_count")
    private long viewCount;

    @Field("is_public")
    private boolean isPublic;

    @Field("update_at")
    private LocalDateTime updateAt;
}