package com.example.demo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date; // Sử dụng java.util.Date đồng bộ
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoryResponse {
    private String id;
    private String name;
    private String slug;
    private List<String> originName;
    private String thumbUrl;
    private String author;
    private List<String> categories;
    private String status;
    private String summary;
    private long viewCount;
    private boolean isPublic;
    private double rating;
    private Date createdAt; // Đã đổi sang Date
    private Date updateAt;  // Đã đổi sang Date
}
