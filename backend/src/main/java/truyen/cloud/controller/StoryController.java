package com.example.demo.controller; // Giữ nguyên tên package thư mục của bạn

import com.example.demo.dto.StoryRequest; // Đổi lại đường dẫn import dto của bạn
import com.example.demo.dto.StoryResponse;
import com.example.demo.service.StoryService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/stories")
@RequiredArgsConstructor
public class StoryController {
    private final StoryService storyService;

    // 1. Lấy danh sách tất cả bộ truyện (Cho trang chủ / danh sách)
    @GetMapping
    public ResponseEntity<List<StoryResponse>> getAllStories() {
        List<StoryResponse> response = storyService.getAllStories();
        return ResponseEntity.ok(response);
    }

    // 2. Lấy chi tiết 1 bộ truyện theo Slug (VD: /api/v1/stories/dao-hai-tac)
    @GetMapping("/{slug}")
    public ResponseEntity<StoryResponse> getStoryBySlug(@PathVariable String slug) {
        StoryResponse response = storyService.getStoryBySlug(slug);
        return ResponseEntity.ok(response);
    }

    // 3. Tạo mới bộ truyện (Dành cho Admin / Editor)
    @PostMapping
    public ResponseEntity<StoryResponse> createStory(@Valid @RequestBody StoryRequest request) {
        StoryResponse response = storyService.createStory(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // 4. Cập nhật thông tin bộ truyện theo ID
    @PutMapping("/{id}")
    public ResponseEntity<StoryResponse> updateStory(
            @PathVariable String id,
            @Valid @RequestBody StoryRequest request) {
        StoryResponse response = storyService.updateStory(id, request);
        return ResponseEntity.ok(response);
    }

    // 5. Xóa bộ truyện theo ID
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteStory(@PathVariable String id) {
        storyService.deleteStory(id);
        return ResponseEntity.noContent().build(); // Trả về HTTP 204 No Content
    }
}
