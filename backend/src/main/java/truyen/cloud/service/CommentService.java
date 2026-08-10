package truyen.cloud.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import truyen.cloud.dtos.request.CommentRequest;
import truyen.cloud.dtos.response.CommentResponse;

public interface CommentService {
    CommentResponse createComment(String username, CommentRequest request);
    
    Page<CommentResponse> getCommentsByStory(String storySlug, Pageable pageable);
    Page<CommentResponse> getCommentsByChapter(String storySlug, String chapterName, Pageable pageable);
    
    void deleteComment(String commentId, String currentUsername);
}