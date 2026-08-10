package com.example.demo.service.impl;

import com.example.demo.dto.StoryRequest;
import com.example.demo.dto.StoryResponse;
import com.example.demo.entity.Story;
import com.example.demo.mapper.StoryMapper;
import com.example.demo.repository.StoryRepository;
import com.example.demo.service.StoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Date; // Sử dụng java.util.Date
import java.util.List;

@Service
@RequiredArgsConstructor
public class StoryServiceImpl implements StoryService {

    private final StoryRepository storyRepository;
    private final StoryMapper storyMapper;

    @Override
    public StoryResponse createStory(StoryRequest request) {
        Story story = storyMapper.toEntity(request);
        
        if (request.getName() != null) {
            String generatedSlug = request.getName().toLowerCase()
                    .replaceAll("[^a-z0-9\\s]", "")
                    .replaceAll("\\s+", "-");
            story.setSlug(generatedSlug);
        }
        
        story.setCreatedAt(new Date()); // Đổi thành new Date()
        story.setUpdateAt(new Date()); // Đổi thành new Date()
        story.setViewCount(0L);
        story.setRating(0.0);

        Story savedStory = storyRepository.save(story);
        return storyMapper.toResponse(savedStory);
    }

    @Override
    public StoryResponse getStoryBySlug(String slug) {
        Story story = storyRepository.findBySlug(slug)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bộ truyện với mã: " + slug));
        return storyMapper.toResponse(story);
    }

    @Override
    public List<StoryResponse> getAllStories() {
        List<Story> stories = storyRepository.findAll();
        return storyMapper.toResponseList(stories);
    }

    @Override
    public StoryResponse updateStory(String id, StoryRequest request) {
        Story story = storyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bộ truyện với ID: " + id));
        
        story.setName(request.getName());
        story.setOriginName(request.getOriginName());
        story.setThumbUrl(request.getThumbUrl());
        story.setAuthor(request.getAuthor());
        story.setCategories(request.getCategories());
        story.setStatus(request.getStatus());
        story.setSummary(request.getSummary());
        story.setPublic(request.isPublic());
        story.setUpdateAt(new Date()); // Đổi thành new Date()

        Story updatedStory = storyRepository.save(story);
        return storyMapper.toResponse(updatedStory);
    }

    @Override
    public void deleteStory(String id) {
        if (!storyRepository.existsById(id)) {
            throw new RuntimeException("Không tìm thấy bộ truyện với ID: " + id);
        }
        storyRepository.deleteById(id);
    }
}
