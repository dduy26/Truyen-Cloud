package truyen.cloud.service;

import java.util.List;
import java.util.Map;

import truyen.cloud.model.Story;

public interface MangadexImportService {
    List<Map<String, Object>> searchMangadexStories(String keyword);
    Story importStoryFromMangadex(String mangadexId) throws Exception;
}
