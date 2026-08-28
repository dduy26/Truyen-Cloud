package truyen.cloud.scheduler;

import truyen.cloud.service.MangadexImportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class StorySyncScheduler {
    private final MangadexImportService mangadexImportService;

    @Scheduled(cron = "${app.scheduler.cron:0 */10 * * * *}", zone = "Asia/Ho_Chi_Minh")
    public void autoSyncNewChapters() {
        log.info("⏰ [MangaCloud Scheduler] Đang tự động kiểm tra chapter mới từ MangaDex Global CDN...");
        try {
            int mangadexSynced = mangadexImportService.syncMangadexLatestUpdates("AUTO_SCHEDULED");
            log.info("✅ [Scheduler MangaDex] Hoàn tất quét MangaDex! Cập nhật {} bộ truyện.", mangadexSynced);
        } catch (Exception e) {
            log.error("❌ [Scheduler MangaDex] Lỗi đồng bộ MangaDex: {}", e.getMessage());
        }
    }
}
