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

    // Tự động kiểm tra & đồng bộ chapter mới từ Otruyen mỗi 15 phút (900,000 ms)
    @Scheduled(fixedRate = 900000, initialDelay = 15000)
    public void autoSyncOtruyenNewChapters() {
        log.info("⏰ [Scheduler Task] Đang tự động kiểm tra chap mới nhất trên Otruyen...");
        try {
            int synced = otruyenImportService.syncLatestNewChapters();
            log.info("✅ [Scheduler Task] Đã hoàn tất tự động kiểm tra! Tổng số bộ truyện được cập nhật chap mới: {}", synced);
        } catch (Exception e) {
            log.error("❌ [Scheduler Task] Lỗi khi tự động đồng bộ chap mới: {}", e.getMessage());
        }
    }
}
