package truyen.cloud.controller;

import truyen.cloud.dtos.request.ChapterRequest;
import truyen.cloud.dtos.response.ChapterResponse;
import truyen.cloud.service.ChapterService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/chapters")
@RequiredArgsConstructor
public class ChapterController {
    private final ChapterService chapterService;

    // 1. Tạo mới một chapter 
    @PostMapping
    public ResponseEntity<ChapterResponse> createChapter(@Valid @RequestBody ChapterRequest request) {
        ChapterResponse response = chapterService.createChapter(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // 2. Lấy danh sách tất cả chapter của 1 bộ truyện theo slug
    @GetMapping({"/story/{storySlug}", "/{storySlug}"})
    public ResponseEntity<List<ChapterResponse>> getChaptersByStorySlug(@PathVariable String storySlug) {
        List<ChapterResponse> response = chapterService.getChaptersByStorySlug(storySlug);
        return ResponseEntity.ok(response);
    }

    // 3. Lấy chi tiết 1 chapter cụ thể để đọc (Hỗ trợ cả /story/{slug}/{ch} và /{slug}/{ch})
    @GetMapping({"/story/{storySlug}/{chapterName}", "/{storySlug}/{chapterName}"})
    public ResponseEntity<ChapterResponse> getChapterDetail(
            @PathVariable String storySlug,
            @PathVariable String chapterName) {
        ChapterResponse response = chapterService.getChapterDetail(storySlug, chapterName);
        return ResponseEntity.ok(response);
    }

    // 4. Cập nhật thông tin chapter theo ID
    @PutMapping("/{id}")
    public ResponseEntity<ChapterResponse> updateChapter(
            @PathVariable String id,
            @Valid @RequestBody ChapterRequest request) {
        ChapterResponse response = chapterService.updateChapter(id, request);
        return ResponseEntity.ok(response);
    }

    // 5. Xóa chapter theo ID
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteChapter(@PathVariable String id) {
        chapterService.deleteChapter(id);
        return ResponseEntity.noContent().build();
    }
}
