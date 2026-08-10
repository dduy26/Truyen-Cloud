package com.example.demo.dto; // Đã đổi lại tên package trùng khớp với cấu trúc thư mục của bạn

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoryRequest {
    private String name;
    private List<String> originName;
    private String thumbUrl;
    private String author;
    private List<String> categories;
    private String status;
    private String summary;
    private boolean isPublic;
}
