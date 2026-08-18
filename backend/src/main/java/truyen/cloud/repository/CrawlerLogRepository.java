package truyen.cloud.repository;

import truyen.cloud.model.CrawlerLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface CrawlerLogRepository extends MongoRepository<CrawlerLog, String> {
    List<CrawlerLog> findTop20ByOrderByCreatedAtDesc();
    List<CrawlerLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
