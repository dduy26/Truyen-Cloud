package truyen.cloud.scheduler;

import truyen.cloud.service.OtruyenImportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class StorySyncScheduler {
    private final OtruyenImportService otruyenImportService;

    @Scheduled(cron = "${app.scheduler.cron:0 */5 * * * *}", zone = "Asia/Ho_Chi_Minh")
    public void autoSyncOtruyenNewChapters() {
        log.info("[Scheduler Task - 5 phút/lần] Đang tự động quét kiểm tra chap mới trên Otruyen...");
        try {
            int synced = otruyenImportService.syncLatestNewChapters("AUTO_SCHEDULED");
            log.info("[Scheduler Task] Đã hoàn tất tự động kiểm tra! Tổng số bộ truyện được cập nhật chap mới: {}", synced);
        } catch (Exception e) {
            log.error("[Scheduler Task] Lỗi khi tự động đồng bộ chap mới: {}", e.getMessage());
        }
    }
}
