package truyen.cloud.mapper;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

import truyen.cloud.dtos.response.CommentReportResponse;
import truyen.cloud.model.CommentReport;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface CommentReportMapper {
    CommentReportResponse toResponse(CommentReport report);
    List<CommentReportResponse> toResponseList(List<CommentReport> reports);
}
