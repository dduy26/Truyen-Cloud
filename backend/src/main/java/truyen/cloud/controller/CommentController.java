package truyen.cloud.controller;

import truyen.cloud.dtos.request.CommentRequest;
import truyen.cloud.dtos.response.CommentResponse;
import truyen.cloud.service.CommentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/comments")
@RequiredArgsConstructor
public class CommentController {
    private final CommentService commentService;

    // 1. Tạo bình luận mới (Chỉ dành cho user đã đăng nhập)
    @PostMapping
    public ResponseEntity<CommentResponse> createComment(
            Authentication authentication,
            @Valid @RequestBody CommentRequest request) {
        String username = (authentication != null && authentication.isAuthenticated() && !"anonymousUser".equals(authentication.getName()))
                ? authentication.getName()
                : (request.getUsername() != null && !request.getUsername().trim().isEmpty() ? request.getUsername() : null);

        if (username == null || "anonymousUser".equalsIgnoreCase(username) || "GUEST".equalsIgnoreCase(username)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        CommentResponse response = commentService.createComment(username, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // 2. Lấy bình luận của 1 bộ truyện
    @GetMapping("/story/{storySlug}")
    public ResponseEntity<Page<CommentResponse>> getCommentsByStory(
            @PathVariable String storySlug,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<CommentResponse> response = commentService.getCommentsByStory(storySlug, pageable);
        return ResponseEntity.ok(response);
    }

    // 3. Lấy bình luận của 1 chapter cụ thể trong truyện
    @GetMapping("/story/{storySlug}/{chapterName}")
    public ResponseEntity<Page<CommentResponse>> getCommentsByChapter(
            @PathVariable String storySlug,
            @PathVariable String chapterName,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<CommentResponse> response = commentService.getCommentsByChapter(storySlug, chapterName, pageable);
        return ResponseEntity.ok(response);
    }

    // 4. Xóa bình luận theo ID
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable String id,
            Authentication authentication) {
        String currentUsername = authentication.getName();
        commentService.deleteComment(id, currentUsername);
        return ResponseEntity.noContent().build();
    }
}
