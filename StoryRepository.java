package com.example.demo.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import com.example.demo.entity.Story;

import java.util.Optional;

@Repository
public interface StoryRepository extends MongoRepository<Story, String> {

    Optional<Story> findBySlug(String slug);

    // Đã sửa thành findByPublicTrue cho đúng chuẩn Spring Data
    Page<Story> findByPublicTrue(Pageable pageable);

    // Đã sửa thành AndPublicTrue ở cuối hàm tìm kiếm
    Page<Story> findByNameContainingIgnoreCaseAndPublicTrue(String name, Pageable pageable);

    boolean existsBySlug(String slug);
}
