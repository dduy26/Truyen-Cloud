package truyen.cloud.scheduler;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class StoryScheduler {
    private static final Logger log = LoggerFactory.getLogger(StoryScheduler.class);
    /**
     * Tác vụ 1: Chạy định kỳ theo khoảng thời gian cố định (Fixed Rate)
     * Ví dụ: Cứ 5 phút (300.000 ms) tự động tính lại Bảng xếp hạng Truyện Hot/Trending
     */
    @Scheduled(fixedRate = 300000) 
    public void syncStoryViewsAndTrending() {
        log.info("⏰ [Scheduler] Đang tính toán và cập nhật Bảng xếp hạng Truyện Hot...");
        
        // TODO: Gọi Service xử lý logic tại đây
        // storyService.updateTrendingList();
    }

    /**
     * Tác vụ 2: Chạy theo giờ cố định bằng cú pháp CRON Expression
     * Cú pháp: (Giây Phút Giờ Ngày Tháng Thứ)
     * Ví dụ: "0 0 0 * * ?" = Đúng 00:00:00 nửa đêm mỗi ngày
     */
    @Scheduled(cron = "0 0 0 * * ?") 
    public void cleanExpiredTokensAndTempData() {
        log.info("🧹 [Scheduler - Midnight] Bắt đầu dọn dẹp các Token hết hạn và dữ liệu rác...");
        
        // TODO: Gọi Service xóa token hết hạn trong DB
        // tokenRepository.deleteByExpiredTrue();
    }
}