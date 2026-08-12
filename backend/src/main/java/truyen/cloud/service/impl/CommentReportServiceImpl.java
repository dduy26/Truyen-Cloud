package truyen.cloud.service.impl;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import truyen.cloud.dtos.request.CommentReportRequest;
import truyen.cloud.dtos.response.CommentReportResponse;
import truyen.cloud.exception.ResourceNotFoundException;
import truyen.cloud.mapper.CommentReportMapper;
import truyen.cloud.model.Comment;
import truyen.cloud.model.CommentReport;
import truyen.cloud.model.User;
import truyen.cloud.repository.CommentReportRepository;
import truyen.cloud.repository.CommentRepository;
import truyen.cloud.repository.UserRepository;
import truyen.cloud.service.CommentReportService;

@Service
@RequiredArgsConstructor
public class CommentReportServiceImpl implements CommentReportService {

    private final CommentReportRepository commentReportRepository;
    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final CommentReportMapper commentReportMapper;

    @Override
    public CommentReportResponse createReport(String username, CommentReportRequest request) {
        User reporter = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng: " + username));

        Comment comment = commentRepository.findById(request.getCommentId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bình luận: " + request.getCommentId()));

        CommentReport report = CommentReport.builder()
                .commentId(comment.getId())
                .commentContent(comment.getContent())
                .commentUserName(comment.getUserName())
                .reporterUserId(reporter.getId())
                .reporterUserName(reporter.getUsername())
                .reason(request.getReason())
                .description(request.getDescription())
                .status("PENDING")
                .storySlug(comment.getStorySlug())
                .chapterName(comment.getChapterName())
                .createdAt(LocalDateTime.now())
                .build();

        CommentReport saved = commentReportRepository.save(report);
        return commentReportMapper.toResponse(saved);
    }

    @Override
    public List<CommentReportResponse> getAllReports() {
        return commentReportRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(commentReportMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public CommentReportResponse resolveReport(String reportId) {
        CommentReport report = commentReportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy báo cáo: " + reportId));

        report.setStatus("RESOLVED");
        report.setResolvedAt(LocalDateTime.now());
        CommentReport saved = commentReportRepository.save(report);
        return commentReportMapper.toResponse(saved);
    }

    @Override
    public CommentReportResponse dismissReport(String reportId) {
        CommentReport report = commentReportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy báo cáo: " + reportId));

        report.setStatus("DISMISSED");
        report.setResolvedAt(LocalDateTime.now());
        CommentReport saved = commentReportRepository.save(report);
        return commentReportMapper.toResponse(saved);
    }

    @Override
    public void deleteReport(String reportId) {
        if (!commentReportRepository.existsById(reportId)) {
            throw new ResourceNotFoundException("Không tìm thấy báo cáo: " + reportId);
        }
        commentReportRepository.deleteById(reportId);
    }
}
