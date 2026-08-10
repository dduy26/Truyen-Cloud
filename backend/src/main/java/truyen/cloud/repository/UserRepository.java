package truyen.cloud.repository;

import truyen.cloud.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {
    
    Optional<User> findByEmail(String email);
    Optional<User> findByEmailIgnoreCase(String email);
    
    Optional<User> findByUsername(String username);
    Optional<User> findByUsernameIgnoreCase(String username);
    
    boolean existsByEmail(String email);
    boolean existsByEmailIgnoreCase(String email);
    
    boolean existsByUsername(String username);
    boolean existsByUsernameIgnoreCase(String username);
}