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
public class UserActivityResponse {
    private String id;
    private String userId;
    private List<String> bookmarks;
    private List<HistoryResponseItem> history;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HistoryResponseItem {
        private String storySlug;
        private String lastChapterName;
        private LocalDateTime readAt;
    }
}
