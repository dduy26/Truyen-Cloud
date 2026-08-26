package truyen.cloud.service;

import java.util.List;
import java.util.Map;
import truyen.cloud.model.CrawlerLog;
import truyen.cloud.model.Story;

public interface CuutruyenImportService {
    Story importStoryBySlug(String slug) throws Exception;
    List<Map<String, Object>> searchCuutruyenStories(String keyword);
    void importBatchStoriesAsync(int pages);
    void importBatchStoriesAsync(int startPage, int endPage);
    int syncLatestNewChapters();
    int syncLatestNewChapters(String triggerType);
    List<CrawlerLog> getRecentCrawlerLogs();
    int migrateLegacyUrls();
    String formatThumbUrl(String thumbFile);
}
