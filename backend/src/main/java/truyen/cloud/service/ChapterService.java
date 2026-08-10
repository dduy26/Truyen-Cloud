package truyen.cloud.service;

import java.util.List;

import truyen.cloud.dtos.request.ChapterRequest;
import truyen.cloud.dtos.response.ChapterResponse;

public interface ChapterService {
    ChapterResponse createChapter(ChapterRequest request);
    List<ChapterResponse> getChaptersByStorySlug(String storySlug);
    ChapterResponse getChapterDetail(String storySlug, String chapterName);
    ChapterResponse updateChapter(String id, ChapterRequest request);
    void deleteChapter(String id);
}
