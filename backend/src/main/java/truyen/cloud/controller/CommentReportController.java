package truyen.cloud.controller;

import truyen.cloud.dtos.request.CommentReportRequest;
import truyen.cloud.dtos.response.CommentReportResponse;
import truyen.cloud.service.CommentReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/comment-reports")
@RequiredArgsConstructor
public class CommentReportController {
    private final CommentReportService commentReportService;

    // 1. Tạo báo cáo comment (User đã đăng nhập)
    @PostMapping
    public ResponseEntity<CommentReportResponse> createReport(
            Authentication authentication,
            @Valid @RequestBody CommentReportRequest request) {
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getName())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String username = authentication.getName();
        CommentReportResponse response = commentReportService.createReport(username, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // 2. Lấy tất cả báo cáo (Admin)
    @GetMapping
    public ResponseEntity<List<CommentReportResponse>> getAllReports() {
        List<CommentReportResponse> reports = commentReportService.getAllReports();
        return ResponseEntity.ok(reports);
    }

    // 3. Đánh dấu đã xử lý
    @PatchMapping("/{id}/resolve")
    public ResponseEntity<CommentReportResponse> resolveReport(@PathVariable String id) {
        CommentReportResponse response = commentReportService.resolveReport(id);
        return ResponseEntity.ok(response);
    }

    // 4. Bỏ qua báo cáo
    @PatchMapping("/{id}/dismiss")
    public ResponseEntity<CommentReportResponse> dismissReport(@PathVariable String id) {
        CommentReportResponse response = commentReportService.dismissReport(id);
        return ResponseEntity.ok(response);
    }

    // 5. Xóa báo cáo
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteReport(@PathVariable String id) {
        commentReportService.deleteReport(id);
        return ResponseEntity.noContent().build();
    }
}
