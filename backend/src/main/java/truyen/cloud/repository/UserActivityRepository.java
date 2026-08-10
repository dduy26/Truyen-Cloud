package truyen.cloud.repository;

import truyen.cloud.model.UserActivity;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface UserActivityRepository extends MongoRepository<UserActivity, String> {
    Optional<UserActivity> findByUserId(String userId);

    boolean existsByUserId(String userId);
}
