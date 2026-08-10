package com.example.demo.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.util.Date; // Sử dụng java.util.Date an toàn cho MongoDB
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "stories")
public class Story {
    @Id
    private String id;

    private String name;
    
    private String slug;

    @Field("origin_name")
    private List<String> originName;

    @Field("thumb_url")
    private String thumbUrl;

    private String author;

    private List<String> categories;

    private String status;

    private String summary; 

    @Field("rating")
    private double rating;

    @Field("created_at")
    private Date createdAt; // Đã đổi sang Date

    @Field("view_count")
    private long viewCount;

    @Field("is_public")
    private boolean isPublic;

    @Field("update_at")
    private Date updateAt; // Đã đổi sang Date
}
