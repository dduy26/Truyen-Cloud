package truyen.cloud.repository;

import truyen.cloud.model.Story;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface StoryRepository extends MongoRepository<Story, String> {

    Optional<Story> findBySlug(String slug);

    // Lấy danh sách truyện công khai có phân trang (dùng cho trang chủ)
    Page<Story> findByIsPublicTrue(Pageable pageable);

    // Tìm kiếm truyện theo tên (không phân biệt hoa thường)
    Page<Story> findByNameContainingIgnoreCaseAndIsPublicTrue(String name, Pageable pageable);

    boolean existsBySlug(String slug);
}