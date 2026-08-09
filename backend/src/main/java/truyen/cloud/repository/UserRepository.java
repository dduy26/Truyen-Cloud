package truyen.cloud.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import truyen.cloud.model.User;

import java.util.Optional;
import java.util.UUID;
@Repository
public interface UserRepository extends MongoRepository<User,UUID>{
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    Optional<User> findByUsername(String username);
}