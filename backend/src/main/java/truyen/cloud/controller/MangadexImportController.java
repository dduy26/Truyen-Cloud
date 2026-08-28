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
@RequestMapping("/api/v1/admin/mangadex")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class MangadexImportController {

    private final MangadexImportService mangadexImportService;
    private final CrawlerLogRepository crawlerLogRepository;

    @GetMapping("/search")
    public ResponseEntity<List<Map<String, Object>>> searchMangadex(@RequestParam String q) {
        return ResponseEntity.ok(mangadexImportService.searchMangadexStories(q));
    }

    @RequestMapping(value = {"/import/{id}", "/{id}"}, method = {RequestMethod.POST, RequestMethod.GET})
    public ResponseEntity<Map<String, Object>> importMangadexById(@PathVariable String id) {
        Map<String, Object> response = new HashMap<>();
        try {
            Story storyEntity = mangadexImportService.importStoryFromMangadex(id);
            if (storyEntity != null) {
                response.put("success", true);
                response.put("message", "Đã cào bộ truyện MangaDex \"" + storyEntity.getName() + "\" thành công!");
                response.put("story", storyEntity);
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Không tìm thấy bộ truyện hoặc không thể lấy dữ liệu từ MangaDex API!");
                return ResponseEntity.badRequest().body(response);
            }
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Lỗi trong quá trình Cào MangaDex: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @RequestMapping(value = {"/crawl-range", "/batch"}, method = {RequestMethod.POST, RequestMethod.GET})
    public ResponseEntity<Map<String, Object>> crawlRange(
            @RequestParam(defaultValue = "1") int startPage,
            @RequestParam(defaultValue = "5") int endPage,
            @RequestParam(required = false) Integer limit) {
        Map<String, Object> response = new HashMap<>();
        try {
            int from = Math.max(1, startPage);
            int to = (endPage >= from) ? endPage : (limit != null ? (int) Math.ceil((double) limit / 25) : 5);

            mangadexImportService.importBatchMangadexPagesAsync(from, to);

            int totalExpected = (to - from + 1) * 25;
            response.put("success", true);
            response.put("message", "Đã khởi chạy cào ngầm từ Trang " + from + " đến Trang " + to + " (khoảng " + totalExpected + " bộ truyện Hot nhất từ MangaDex Global CDN)!");
            response.put("startPage", from);
            response.put("endPage", to);
            response.put("estimatedStoriesCount", totalExpected);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Lỗi khi cào dữ liệu: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @RequestMapping(value = "/reset-database", method = {RequestMethod.POST, RequestMethod.DELETE, RequestMethod.GET})
    public ResponseEntity<Map<String, Object>> resetDatabase() {
        Map<String, Object> response = new HashMap<>();
        try {
            mangadexImportService.resetAllData();
            response.put("success", true);
            response.put("message", "🧹 Đã xóa sạch 100% dữ liệu Chapters, Stories và Cache Redis thành công!");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Lỗi reset Database: " + e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @PostMapping("/sync-latest")
    public ResponseEntity<Map<String, Object>> syncLatestNewChapters() {
        Map<String, Object> response = new HashMap<>();
        try {
            int updatedCount = mangadexImportService.syncMangadexLatestUpdates("MANUAL_TRIGGER");
            response.put("success", true);
            response.put("message", "Đã đồng bộ xong! Có " + updatedCount + " bộ truyện vừa được cập nhật chap mới từ MangaDex Global CDN.");
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
