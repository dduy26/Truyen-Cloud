package truyen.cloud.dtos.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChapterRequest {
    private String storySlug;
    private String chapterName;
    private String chapterTitle;
    private String chapterApiUrl;
    private List<String> pages;
}