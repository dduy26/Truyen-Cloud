package truyen.cloud.model;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "chapters")
public class Chapter {
    @Id
    private String id;

    @Field("story_slug")
    private String storySlug;

    @Field("chapter_name")
    private String chapterName;  

    @Field("chapter_title")
    private String chapterTitle;  

    @Field("chapter_api_url")
    private String chapterApiUrl;  

    @Field("pages")
    private List<String> pages;  

    @Field("updated_at")
    private LocalDateTime updatedAt;

    public void setImageUrls(List<String> imageUrls) {
        this.pages = imageUrls;
    }

    public List<String> getImageUrls() {
        return this.pages;
    }
}