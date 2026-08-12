package truyen.cloud.repository;

import truyen.cloud.model.CommentReport;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface CommentReportRepository extends MongoRepository<CommentReport, String> {
    List<CommentReport> findAllByOrderByCreatedAtDesc();
    List<CommentReport> findByStatus(String status);
    long countByStatus(String status);
}
