package truyen.cloud.controller;

import truyen.cloud.model.CrawlerLog;
import truyen.cloud.model.Story;
import truyen.cloud.repository.CrawlerLogRepository;
import truyen.cloud.service.MangadexImportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/import-otruyen")
@RequiredArgsConstructor
public class OtruyenImportController {

    private final MangadexImportService mangadexImportService;
    private final CrawlerLogRepository crawlerLogRepository;

    @GetMapping("/search")
    public ResponseEntity<List<Map<String, Object>>> searchOtruyen(@RequestParam String q) {
        return ResponseEntity.ok(mangadexImportService.searchMangadexStories(q));
    }

    @GetMapping("/mangadex/search")
    public ResponseEntity<List<Map<String, Object>>> searchMangadex(@RequestParam String q) {
        return ResponseEntity.ok(mangadexImportService.searchMangadexStories(q));
    }

    @PostMapping("/mangadex/{id}")
    public ResponseEntity<Map<String, Object>> importMangadexById(@PathVariable String id) {
        Map<String, Object> response = new HashMap<>();
        try {
            Story storyEntity = mangadexImportService.importStoryFromMangadex(id);
            if (storyEntity != null) {
                response.put("success", true);
                response.put("message", "Đã import bộ truyện MangaDex \"" + storyEntity.getName() + "\" thành công!");
                response.put("story", storyEntity);
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Không tìm thấy bộ truyện hoặc không thể lấy dữ liệu từ MangaDex API!");
                return ResponseEntity.badRequest().body(response);
            }
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Lỗi trong quá trình Import MangaDex: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @PostMapping("/mangadex/batch")
    public ResponseEntity<Map<String, Object>> importBatchMangadex(@RequestParam(defaultValue = "30") int limit) {
        Map<String, Object> response = new HashMap<>();
        try {
            mangadexImportService.importBatchMangadexStoriesAsync(limit);
            response.put("success", true);
            response.put("message", "🚀 Đã khởi chạy cào ngầm Top " + limit + " bộ truyện Hot nhất từ MangaDex Global CDN!");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Lỗi: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @DeleteMapping("/clear-otruyen-stories")
    public ResponseEntity<Map<String, Object>> clearAllOtruyenStories() {
        Map<String, Object> response = new HashMap<>();
        try {
            int deleted = mangadexImportService.deleteAllOtruyenStories();
            response.put("success", true);
            response.put("message", "🧹 Đã xóa thành công " + deleted + " bộ truyện Otruyen cũ khỏi Database!");
            response.put("deletedCount", deleted);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Lỗi khi dọn dẹp: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @PostMapping("/batch")
    public ResponseEntity<Map<String, Object>> importBatchStories(
            @RequestParam(required = false) Integer startPage,
            @RequestParam(required = false) Integer endPage,
            @RequestParam(defaultValue = "5") int pages) {
        Map<String, Object> response = new HashMap<>();
        int from = (startPage != null && startPage > 0) ? startPage : 1;
        int to = (endPage != null && endPage >= from) ? endPage : (startPage != null ? startPage : pages);
        int totalLimit = (to - from + 1) * 10;
        mangadexImportService.importBatchMangadexStoriesAsync(totalLimit);
        response.put("success", true);
        response.put("message", "🚀 Đã khởi chạy cào ngầm Top " + totalLimit + " bộ truyện từ MangaDex Global CDN!");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/sync-latest")
    public ResponseEntity<Map<String, Object>> syncLatestNewChapters() {
        Map<String, Object> response = new HashMap<>();
        try {
            int updatedCount = mangadexImportService.syncMangadexLatestUpdates("MANUAL_TRIGGER");
            response.put("success", true);
            response.put("message", "⚡ Đã đồng bộ xong! Có " + updatedCount + " bộ truyện vừa được cập nhật chap mới từ MangaDex Global CDN.");
            response.put("updatedCount", updatedCount);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Lỗi khi đồng bộ: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @GetMapping("/crawler-logs")
    public ResponseEntity<List<CrawlerLog>> getCrawlerLogs() {
        try {
            return ResponseEntity.ok(crawlerLogRepository.findTop20ByOrderByCreatedAtDesc());
        } catch (Exception e) {
            return ResponseEntity.ok(java.util.Collections.emptyList());
        }
    }
}
