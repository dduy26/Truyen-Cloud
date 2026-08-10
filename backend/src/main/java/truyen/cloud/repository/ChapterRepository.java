package truyen.cloud.repository;

import truyen.cloud.model.Chapter;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ChapterRepository extends MongoRepository<Chapter, String> {
    // Lấy toàn bộ danh sách chương của một bộ truyện
    List<Chapter> findByStorySlug(String storySlug);

    long countByStorySlug(String storySlug);

    Optional<Chapter> findFirstByStorySlugAndChapterName(String storySlug, String chapterName);

    default Optional<Chapter> findByStorySlugAndChapterName(String storySlug, String chapterName) {
        return findFirstByStorySlugAndChapterName(storySlug, chapterName);
    }

    void deleteByStorySlug(String storySlug);
}
