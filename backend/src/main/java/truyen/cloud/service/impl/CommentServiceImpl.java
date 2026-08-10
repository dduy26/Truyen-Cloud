package truyen.cloud.service.impl;

import java.time.LocalDateTime;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import truyen.cloud.dtos.request.CommentRequest;
import truyen.cloud.dtos.response.CommentResponse;
import truyen.cloud.exception.ResourceNotFoundException;
import truyen.cloud.mapper.CommentMapper;
import truyen.cloud.model.Comment;
import truyen.cloud.model.User;
import truyen.cloud.repository.CommentRepository;
import truyen.cloud.repository.UserRepository;
import truyen.cloud.service.CommentService;

@Service
@RequiredArgsConstructor
public class CommentServiceImpl implements CommentService {

    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final CommentMapper commentMapper;

    @Override
    public CommentResponse createComment(String username, CommentRequest request) {
        if (username == null || username.trim().isEmpty()) {
            throw new ResourceNotFoundException("Vui lòng đăng nhập để bình luận!");
        }

        Comment comment = commentMapper.toEntity(request);

        String effectiveChapterName = request.getChapterName() != null ? request.getChapterName() : request.getChapter();
        if (effectiveChapterName != null) {
            comment.setChapterName(effectiveChapterName);
        }

        userRepository.findByUsername(username).ifPresentOrElse(
            user -> {
                comment.setUserId(user.getId());
                comment.setUserName(user.getUsername());
                comment.setUserAvatar(user.getAvatar() != null ? user.getAvatar() : "");
            },
            () -> {
                comment.setUserId("usr-" + System.currentTimeMillis());
                comment.setUserName(username);
                String avatarUrl = request.getUserAvatar() != null ? request.getUserAvatar()
                        : (request.getAvatar() != null ? request.getAvatar() : "");
                comment.setUserAvatar(avatarUrl);
            }
        );

        comment.setCreatedAt(LocalDateTime.now());
        Comment savedComment = commentRepository.save(comment);
        return commentMapper.toResponse(savedComment);
    }

    @Override
    public Page<CommentResponse> getCommentsByStory(String storySlug, Pageable pageable) {
        Page<Comment> comments = commentRepository.findByStorySlug(storySlug, pageable);
        return comments.map(commentMapper::toResponse);
    }

    @Override
    public Page<CommentResponse> getCommentsByChapter(String storySlug, String chapterName, Pageable pageable) {
        Page<Comment> comments = commentRepository.findByStorySlugAndChapterName(storySlug, chapterName, pageable);
        
        return comments.map(commentMapper::toResponse);
    }

    @Override
    public void deleteComment(String commentId, String currentUsername) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bình luận với id: " + commentId));

        User currentUser = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng: " + currentUsername));

        boolean isAdmin = currentUser.getRoles() != null && currentUser.getRoles().contains("ROLE_ADMIN");
        boolean isOwner = comment.getUserId().equals(currentUser.getId());

        if (!isOwner && !isAdmin) {
            throw new RuntimeException("Bạn không có quyền xóa bình luận này!");
        }

        commentRepository.deleteById(commentId);
    }
}
