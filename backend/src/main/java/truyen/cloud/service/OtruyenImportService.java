package truyen.cloud.service;

import java.util.List;
import java.util.Map;

import truyen.cloud.model.Story;

public interface OtruyenImportService {
    Story importStoryBySlug(String slug) throws Exception;
    List<Map<String, Object>> searchOtruyenStories(String keyword);
    void importBatchStoriesAsync(int pages);
    void importBatchStoriesAsync(int startPage, int endPage);
    int syncLatestNewChapters();
    int syncLatestNewChapters(String triggerType);
    List<truyen.cloud.model.CrawlerLog> getRecentCrawlerLogs();
    String formatThumbUrl(String thumbFile);
}
