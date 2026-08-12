package truyen.cloud.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChapterResponse {
    private String id;
    private String storySlug;
    private String chapterName;
    private String chapterTitle;
    private String chapterApiUrl;
    private List<String> pages;
    private LocalDateTime updatedAt;
}
