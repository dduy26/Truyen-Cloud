package truyen.cloud.controller;

import truyen.cloud.model.Story;
import truyen.cloud.service.MangadexImportService;
import truyen.cloud.service.OtruyenImportService;
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

    private final OtruyenImportService otruyenImportService;
    private final MangadexImportService mangadexImportService;

    @GetMapping("/search")
    public ResponseEntity<List<Map<String, Object>>> searchOtruyen(@RequestParam String q) {
        return ResponseEntity.ok(otruyenImportService.searchOtruyenStories(q));
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

    @PostMapping("/batch")
    public ResponseEntity<Map<String, Object>> importBatchStories(
            @RequestParam(required = false) Integer startPage,
            @RequestParam(required = false) Integer endPage,
            @RequestParam(defaultValue = "5") int pages) {
        Map<String, Object> response = new HashMap<>();

        int from = (startPage != null && startPage > 0) ? startPage : 1;
        int to = (endPage != null && endPage >= from) ? endPage : (startPage != null ? startPage : pages);

        otruyenImportService.importBatchStoriesAsync(from, to);

        int totalExpected = (to - from + 1) * 24;
        response.put("success", true);
        response.put("message", "🚀 Đã khởi chạy cào ngầm từ Trang " + from + " đến Trang " + to + " (~" + totalExpected + " bộ truyện)! Truyện đang tự động nạp vào Database.");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/sync-latest")
    public ResponseEntity<Map<String, Object>> syncLatestNewChapters() {
        Map<String, Object> response = new HashMap<>();
        try {
            int updatedCount = otruyenImportService.syncLatestNewChapters("MANUAL_TRIGGER");
            response.put("success", true);
            response.put("message", "⚡ Đã đồng bộ xong! Có " + updatedCount + " bộ truyện vừa được cập nhật chap mới nhất từ Otruyen.");
            response.put("updatedCount", updatedCount);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Lỗi khi đồng bộ chap mới: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @GetMapping("/crawler-logs")
    public ResponseEntity<List<truyen.cloud.model.CrawlerLog>> getCrawlerLogs() {
        try {
            return ResponseEntity.ok(otruyenImportService.getRecentCrawlerLogs());
        } catch (Exception e) {
            return ResponseEntity.ok(java.util.Collections.emptyList());
        }
    }

    @PostMapping("/{slug}")
    public ResponseEntity<Map<String, Object>> importStoryBySlug(@PathVariable String slug) {
        Map<String, Object> response = new HashMap<>();
        try {
            Story storyEntity = otruyenImportService.importStoryBySlug(slug);
            if (storyEntity != null) {
                response.put("success", true);
                response.put("message", "Đã import bộ truyện \"" + storyEntity.getName() + "\" thành công!");
                response.put("story", storyEntity);
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Không tìm thấy bộ truyện hoặc không thể lấy dữ liệu từ Otruyen API!");
                return ResponseEntity.badRequest().body(response);
            }
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Lỗi trong quá trình Import: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
}
