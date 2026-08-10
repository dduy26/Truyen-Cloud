package com.example.demo.service; // Giữ đúng package thư mục hiện tại của bạn

import java.util.List;
import com.example.demo.dto.StoryRequest; // Import đúng đường dẫn các file dto của bạn
import com.example.demo.dto.StoryResponse;

public interface StoryService {
    StoryResponse createStory(StoryRequest request);
    StoryResponse getStoryBySlug(String slug);
    List<StoryResponse> getAllStories();
    StoryResponse updateStory(String id, StoryRequest request);
    void deleteStory(String id);
}
