package truyen.cloud.dtos.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentReportRequest {
    private String commentId;
    private String reason;       // SPAM, NOI_DUNG_XAU, QUAY_ROI, KHAC
    private String description;  // Mô tả chi tiết (tùy chọn)
}
