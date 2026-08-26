package truyen.cloud.controller;

import truyen.cloud.model.Story;
import truyen.cloud.service.MangadexImportService;
import truyen.cloud.service.CuutruyenImportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/import-cuutruyen")
@RequiredArgsConstructor
public class CuutruyenImportController {

    private final CuutruyenImportService cuutruyenImportService;
    private final MangadexImportService mangadexImportService;

    @GetMapping("/search")
    public ResponseEntity<List<Map<String, Object>>> searchCuutruyen(@RequestParam String q) {
        return ResponseEntity.ok(cuutruyenImportService.searchCuutruyenStories(q));
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

        cuutruyenImportService.importBatchStoriesAsync(from, to);

        int totalExpected = (to - from + 1) * 20;
        response.put("success", true);
        response.put("message", "🚀 Đã khởi chạy cào ngầm từ Trang " + from + " đến Trang " + to + " (~" + totalExpected + " bộ truyện từ CuuTruyen)! Truyện đang tự động nạp vào Database.");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/sync-latest")
    public ResponseEntity<Map<String, Object>> syncLatestNewChapters() {
        Map<String, Object> response = new HashMap<>();
        try {
            int updatedCount = cuutruyenImportService.syncLatestNewChapters("MANUAL_TRIGGER");
            response.put("success", true);
            response.put("message", "⚡ Đã đồng bộ xong! Có " + updatedCount + " bộ truyện vừa được cập nhật chap mới nhất từ CuuTruyen.");
            response.put("updatedCount", updatedCount);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Lỗi khi đồng bộ chap mới từ CuuTruyen: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @PostMapping("/migrate-legacy-urls")
    public ResponseEntity<Map<String, Object>> migrateLegacyUrls() {
        Map<String, Object> response = new HashMap<>();
        try {
            int count = cuutruyenImportService.migrateLegacyUrls();
            response.put("success", true);
            response.put("message", "⚡ Đã quét và cập nhật " + count + " bộ truyện có đường dẫn cũ sang CuuTruyen!");
            response.put("updatedCount", count);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Lỗi khi chuyển đổi URL cũ: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @GetMapping("/crawler-logs")
    public ResponseEntity<List<truyen.cloud.model.CrawlerLog>> getCrawlerLogs() {
        try {
            return ResponseEntity.ok(cuutruyenImportService.getRecentCrawlerLogs());
        } catch (Exception e) {
            return ResponseEntity.ok(java.util.Collections.emptyList());
        }
    }

    @PostMapping("/slug/{slug}")
    public ResponseEntity<Map<String, Object>> importStoryBySlugPath(@PathVariable String slug) {
        return importStoryBySlug(slug);
    }

    @PostMapping("/{slug}")
    public ResponseEntity<Map<String, Object>> importStoryBySlug(@PathVariable String slug) {
        Map<String, Object> response = new HashMap<>();
        try {
            Story storyEntity = cuutruyenImportService.importStoryBySlug(slug);
            if (storyEntity != null) {
                response.put("success", true);
                response.put("message", "Đã import bộ truyện CuuTruyen \"" + storyEntity.getName() + "\" thành công!");
                response.put("story", storyEntity);
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Không tìm thấy bộ truyện hoặc không thể lấy dữ liệu từ CuuTruyen API!");
                return ResponseEntity.badRequest().body(response);
            }
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Lỗi trong quá trình Import CuuTruyen: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }
}
