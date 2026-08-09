package com.example.demo.mapper;

import com.example.demo.dto.StoryRequest;
import com.example.demo.dto.StoryResponse;
import com.example.demo.entity.Story;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class StoryMapper {

    public StoryResponse toResponse(Story story) {
        if (story == null) return null;
        
        StoryResponse response = new StoryResponse();
        response.setId(story.getId());
        response.setName(story.getName());
        response.setSlug(story.getSlug());
        response.setOriginName(story.getOriginName() != null ? story.getOriginName() : new ArrayList<>());
        response.setThumbUrl(story.getThumbUrl());
        response.setAuthor(story.getAuthor());
        response.setCategories(story.getCategories() != null ? story.getCategories() : new ArrayList<>());
        response.setStatus(story.getStatus());
        response.setSummary(story.getSummary());
        response.setViewCount(story.getViewCount());
        // Sửa hàm setPublic nhận giá trị từ isPublic của Entity cho đồng bộ
        response.setPublic(story.isPublic()); 
        response.setRating(story.getRating());
        response.setCreatedAt(story.getCreatedAt());
        response.setUpdateAt(story.getUpdateAt());
        return response;
    }

    public List<StoryResponse> toResponseList(List<Story> stories) {
        if (stories == null) return null;
        return stories.stream().map(this::toResponse).collect(Collectors.toList());
    }

    public Story toEntity(StoryRequest request) {
        if (request == null) return null;
        
        Story story = new Story();
        story.setName(request.getName());
        story.setOriginName(request.getOriginName() != null ? request.getOriginName() : new ArrayList<>());
        story.setThumbUrl(request.getThumbUrl());
        story.setAuthor(request.getAuthor());
        story.setCategories(request.getCategories() != null ? request.getCategories() : new ArrayList<>());
        story.setStatus(request.getStatus());
        story.setSummary(request.getSummary());
        story.setPublic(request.isPublic());
        return story;
    }
}
