package truyen.cloud.service;

import truyen.cloud.dtos.request.CommentReportRequest;
import truyen.cloud.dtos.response.CommentReportResponse;

import java.util.List;

public interface CommentReportService {
    CommentReportResponse createReport(String username, CommentReportRequest request);
    List<CommentReportResponse> getAllReports();
    CommentReportResponse resolveReport(String reportId);
    CommentReportResponse dismissReport(String reportId);
    void deleteReport(String reportId);
}
