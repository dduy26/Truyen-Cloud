package truyen.cloud.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import truyen.cloud.model.Chapter;
import truyen.cloud.model.CrawlerLog;
import truyen.cloud.model.Story;
import truyen.cloud.repository.ChapterRepository;
import truyen.cloud.repository.CrawlerLogRepository;
import truyen.cloud.repository.StoryRepository;
import truyen.cloud.service.CuutruyenImportService;
import truyen.cloud.service.MangadexImportService;
import org.springframework.cache.CacheManager;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class CuutruyenImportServiceImpl implements CuutruyenImportService {
    private final StoryRepository storyRepository;
    private final ChapterRepository chapterRepository;
    private final CrawlerLogRepository crawlerLogRepository;
    private final CacheManager cacheManager;
    private final MangadexImportService mangadexImportService;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${cuutruyen.cdn.url:https://cuutruyen.net}")
    private String cuutruyenCdnUrl;

    @Value("${cuutruyen.api.base-url:https://cuutruyen.net/api/v2/}")
    private String cuutruyenApiBaseUrl;

    public CuutruyenImportServiceImpl(StoryRepository storyRepository,
                                       ChapterRepository chapterRepository,
                                       CrawlerLogRepository crawlerLogRepository,
                                       CacheManager cacheManager,
                                       MangadexImportService mangadexImportService) {
        this.storyRepository = storyRepository;
        this.chapterRepository = chapterRepository;
        this.crawlerLogRepository = crawlerLogRepository;
        this.cacheManager = cacheManager;
        this.mangadexImportService = mangadexImportService;

        org.springframework.http.client.SimpleClientHttpRequestFactory factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(4000);
        factory.setReadTimeout(6000);
        this.restTemplate = new RestTemplate(factory);
    }

    @Override
    public String formatThumbUrl(String thumbFile) {
        if (thumbFile == null || thumbFile.isEmpty()) {
            return "";
        }
        if (thumbFile.contains("storage-ct.lrclib.net")) {
            thumbFile = thumbFile.replace("storage-ct.lrclib.net", "cuutruyen.net");
        }
        if (thumbFile.startsWith("http")) {
            return thumbFile;
        }
        return cuutruyenCdnUrl + (thumbFile.startsWith("/") ? "" : "/") + thumbFile;
    }

    @jakarta.annotation.PostConstruct
    public void ensureAllStoriesPublic() {
        try {
            List<Story> allStories = storyRepository.findAll();
            if (!allStories.isEmpty()) {
                for (Story s : allStories) {
                    s.setPublic(true);
                }
                storyRepository.saveAll(allStories);
                clearAllStoryCaches();
            }
        } catch (Exception e) {
            System.err.println("Lỗi ensureAllStoriesPublic CuuTruyen: " + e.getMessage());
        }
    }

    private String fetchJsonDirect(String url) {
        if (url == null || url.trim().isEmpty()) {
            return null;
        }
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            headers.set("Accept", "application/json, text/plain, */*");
            headers.set("Referer", "https://cuutruyen.net/");
            headers.set("Origin", "https://cuutruyen.net");
            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<String> response = restTemplate.exchange(URI.create(url), HttpMethod.GET, entity, String.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody();
            }
        } catch (Exception e) {
            System.err.println("⚠️ Fetch URL CuuTruyen không phản hồi (" + url + "): " + e.getMessage());
        }
        return null;
    }

    private String fetchWithFallback(String pathOrUrl) {
        if (pathOrUrl == null || pathOrUrl.trim().isEmpty()) return null;

        if (pathOrUrl.startsWith("http")) {
            String res = fetchJsonDirect(pathOrUrl);
            if (res != null) return res;
        }

        String relativePath = pathOrUrl.replaceAll("^https?://[^/]+/api/v2/", "").replaceAll("^/+", "");

        List<String> mirrorBaseUrls = List.of(
            cuutruyenApiBaseUrl,
            "https://cuutruyen.net/api/v2/",
            "https://cuutruyen.moe/api/v2/",
            "https://cuutruyen.org/api/v2/"
        );

        for (String baseUrl : mirrorBaseUrls) {
            String fullUrl = baseUrl + (baseUrl.endsWith("/") ? "" : "/") + relativePath;
            String res = fetchJsonDirect(fullUrl);
            if (res != null) return res;
        }
        return null;
    }

    @Override
    public List<Map<String, Object>> searchCuutruyenStories(String keyword) {
        List<Map<String, Object>> results = new ArrayList<>();
        if (keyword == null || keyword.trim().isEmpty()) {
            return results;
        }
        try {
            String encodedKeyword = URLEncoder.encode(keyword.trim(), StandardCharsets.UTF_8);
            String jsonRaw = fetchWithFallback("mangas/search?q=" + encodedKeyword);
            if (jsonRaw == null) {
                jsonRaw = fetchWithFallback("mangas?query=" + encodedKeyword);
            }

            if (jsonRaw != null) {
                JsonNode root = objectMapper.readTree(jsonRaw);
                JsonNode items = root.has("data") ? root.path("data") : root;
                if (items.has("items")) items = items.path("items");
                else if (items.has("mangas")) items = items.path("mangas");

                if (items.isArray()) {
                    for (JsonNode item : items) {
                        Map<String, Object> map = new HashMap<>();
                        String name = item.has("name") ? item.path("name").asText("") : item.path("title").asText("");
                        String slug = item.has("slug") ? item.path("slug").asText("") : item.path("id").asText("");
                        String thumb = item.has("cover_url") ? item.path("cover_url").asText("") : item.path("thumb_url").asText("");

                        map.put("name", name);
                        map.put("slug", slug);
                        map.put("thumbUrl", formatThumbUrl(thumb));
                        map.put("status", item.path("status").asText("Ongoing"));

                        String latestCh = "Ch. 1";
                        if (item.has("latest_chapter_number")) {
                            latestCh = "Ch. " + item.path("latest_chapter_number").asText("1");
                        } else if (item.has("chapters_count")) {
                            latestCh = "Ch. " + item.path("chapters_count").asText("1");
                        }
                        map.put("latestChapter", latestCh);
                        results.add(map);
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Lỗi tìm kiếm CuuTruyen: " + e.getMessage());
        }

        // Fallback to MangaDex search if CuuTruyen returned empty
        if (results.isEmpty() && mangadexImportService != null) {
            try {
                results = mangadexImportService.searchMangadexStories(keyword);
            } catch (Exception ignored) {}
        }

        return results;
    }

    @Override
    public Story importStoryBySlug(String slug) throws Exception {
        return importStoryInternal(slug);
    }

    @Async
    @Override
    public void importBatchStoriesAsync(int pages) {
        importBatchStoriesAsync(1, pages);
    }

    @Async
    @Override
    public void importBatchStoriesAsync(int startPage, int endPage) {
        int totalStoriesImported = 0;
        int fromPage = Math.max(1, startPage);
        int toPage = Math.max(fromPage, endPage);

        System.out.println("🚀 [Async Worker] Bắt đầu cào dữ liệu từ Trang " + fromPage + " đến Trang " + toPage + " từ CuuTruyen API...");

        boolean anySuccess = false;
        for (int page = fromPage; page <= toPage; page++) {
            String catalogJson = fetchWithFallback("mangas?page=" + page);
            if (catalogJson == null) {
                catalogJson = fetchWithFallback("mangas/top?page=" + page);
            }
            if (catalogJson == null) {
                catalogJson = fetchWithFallback("mangas/recently_updated?page=" + page);
            }

            if (catalogJson != null) {
                anySuccess = true;
                try {
                    JsonNode root = objectMapper.readTree(catalogJson);
                    JsonNode items = root.has("data") ? root.path("data") : root;
                    if (items.has("items")) items = items.path("items");
                    else if (items.has("mangas")) items = items.path("mangas");

                    if (items.isArray()) {
                        for (JsonNode item : items) {
                            String slug = item.has("slug") ? item.path("slug").asText() : item.path("id").asText();
                            if (!slug.isEmpty()) {
                                try {
                                    Story imported = importStoryInternal(slug);
                                    if (imported != null) {
                                        totalStoriesImported++;
                                    }
                                    Thread.sleep(150);
                                } catch (Exception e) {
                                    System.err.println("Lỗi cào CuuTruyen batch item " + slug + ": " + e.getMessage());
                                }
                            }
                        }
                    }
                } catch (Exception e) {
                    System.err.println("Lỗi parse JSON CuuTruyen catalog page " + page + ": " + e.getMessage());
                }
            } else {
                System.err.println("⚠️ Không thể lấy dữ liệu catalog trang " + page + " từ cuutruyen.net!");
            }
        }

        // Fallback: If CuuTruyen API is blocked/down, fallback to MangaDex popular stories import
        if (!anySuccess && mangadexImportService != null) {
            System.out.println("⚡ [Fallback Worker] Server CuuTruyen API bị chặn/timeout. Tự động chuyển sang nạp truyện từ MangaDex...");
            try {
                List<Map<String, Object>> fallbackStories = mangadexImportService.searchMangadexStories("Manga");
                if (fallbackStories.isEmpty()) {
                    fallbackStories = mangadexImportService.searchMangadexStories("Solo");
                }
                for (Map<String, Object> item : fallbackStories) {
                    String id = (String) item.get("id");
                    if (id != null && !id.isEmpty()) {
                        try {
                            Story s = mangadexImportService.importStoryFromMangadex(id);
                            if (s != null) totalStoriesImported++;
                            Thread.sleep(200);
                        } catch (Exception ignored) {}
                    }
                }
            } catch (Exception e) {
                System.err.println("Lỗi MangaDex Fallback Batch Import: " + e.getMessage());
            }
        }

        clearAllStoryCaches();
        System.out.println("✅ [Async Worker] Hoàn tất cào dữ liệu từ Trang " + fromPage + " đến Trang " + toPage + "! Tổng bộ truyện đã nạp vào DB: " + totalStoriesImported);
    }

    private void clearAllStoryCaches() {
        try {
            if (cacheManager != null) {
                var listCache = cacheManager.getCache("stories_list");
                if (listCache != null) listCache.clear();
                var detailCache = cacheManager.getCache("stories_detail");
                if (detailCache != null) detailCache.clear();
            }
        } catch (Exception e) {
            System.err.println("Lỗi khi clear Redis cache: " + e.getMessage());
        }
    }

    private double parseChapterNumber(String str) {
        if (str == null || str.trim().isEmpty()) return 0.0;
        try {
            String cleaned = str.replaceAll("[^0-9.]", "");
            if (cleaned.isEmpty()) return 0.0;
            return Double.parseDouble(cleaned);
        } catch (Exception e) {
            return 0.0;
        }
    }

    @Override
    public int syncLatestNewChapters() {
        return syncLatestNewChapters("AUTO_SCHEDULED");
    }

    @Override
    public int syncLatestNewChapters(String triggerType) {
        int updatedCount = 0;
        long startTime = System.currentTimeMillis();
        String status = "SUCCESS";
        String logMsg = "";
        List<CrawlerLog.UpdatedStoryDetail> updatedStoryDetailsList = new ArrayList<>();
        Set<String> processedSlugs = new HashSet<>();
        boolean connectionSuccess = false;

        try {
            for (int page = 1; page <= 3; page++) {
                String catalogJson = fetchWithFallback("mangas?page=" + page);
                if (catalogJson == null) {
                    catalogJson = fetchWithFallback("mangas/top?page=" + page);
                }
                if (catalogJson != null) {
                    connectionSuccess = true;
                    JsonNode root = objectMapper.readTree(catalogJson);
                    JsonNode items = root.has("data") ? root.path("data") : root;
                    if (items.has("items")) items = items.path("items");
                    else if (items.has("mangas")) items = items.path("mangas");

                    if (items.isArray()) {
                        for (JsonNode item : items) {
                            String slug = item.has("slug") ? item.path("slug").asText() : item.path("id").asText();
                            if (slug.isEmpty() || processedSlugs.contains(slug)) continue;
                            processedSlugs.add(slug);

                            Optional<Story> storyOpt = storyRepository.findBySlug(slug);
                            boolean isNewOrOutdated = false;

                            if (storyOpt.isEmpty()) {
                                isNewOrOutdated = true;
                            } else {
                                Story existing = storyOpt.get();
                                String cuutruyenLatestChStr = item.has("latest_chapter_number") ? item.path("latest_chapter_number").asText("1") : "1";
                                double cuutruyenChNum = parseChapterNumber(cuutruyenLatestChStr);
                                double localChNum = parseChapterNumber(existing.getLatestChapter());
                                if (cuutruyenChNum > localChNum || (localChNum == 0 && cuutruyenChNum > 0)) {
                                    isNewOrOutdated = true;
                                }
                            }

                            if (isNewOrOutdated) {
                                try {
                                    Story imported = importStoryInternal(slug);
                                    if (imported != null) {
                                        updatedCount++;
                                        updatedStoryDetailsList.add(CrawlerLog.UpdatedStoryDetail.builder()
                                                .slug(slug)
                                                .name(imported.getName())
                                                .latestChapter(imported.getLatestChapter())
                                                .thumbUrl(imported.getThumbUrl())
                                                .build());
                                        System.out.println("🔄 [Auto-Sync CuuTruyen] Đã tự động cập nhật chap mới: " + slug + " (" + imported.getLatestChapter() + ")");
                                    }
                                    Thread.sleep(200);
                                } catch (Exception e) {
                                    System.err.println("Lỗi auto-sync CuuTruyen story " + slug + ": " + e.getMessage());
                                }
                            }
                        }
                    }
                }
            }

            if (!connectionSuccess) {
                status = "WARNING";
                logMsg = "⚠️ Server CuuTruyen API không phản hồi / bị chặn kết nối TLS. Tự động chuyển sang chế độ Standby.";
            } else if (updatedCount > 0) {
                clearAllStoryCaches();
                logMsg = "⚡ Đã phát hiện và tự động đồng bộ " + updatedCount + " bộ truyện có chapter mới từ CuuTruyen API.";
            } else {
                logMsg = "✓ Đã kiểm tra danh sách CuuTruyen mới nhất: Tất cả đều đã được cập nhật bản mới nhất.";
            }
        } catch (Exception e) {
            status = "FAILED";
            logMsg = "Lỗi khi chạy đồng bộ chap mới từ CuuTruyen: " + e.getMessage();
            System.err.println("Lỗi chạy syncLatestNewChapters CuuTruyen: " + e.getMessage());
        } finally {
            long executionTimeMs = System.currentTimeMillis() - startTime;
            try {
                CrawlerLog crawlerLog = CrawlerLog.builder()
                        .type(triggerType != null ? triggerType : "AUTO_SCHEDULED")
                        .status(status)
                        .message(logMsg)
                        .updatedStoriesCount(updatedCount)
                        .updatedStoryDetails(updatedStoryDetailsList)
                        .executionTimeMs(executionTimeMs)
                        .createdAt(LocalDateTime.now())
                        .build();
                crawlerLogRepository.save(crawlerLog);
            } catch (Exception e) {
                System.err.println("Không thể lưu CrawlerLog CuuTruyen: " + e.getMessage());
            }
        }
        return updatedCount;
    }

    @Override
    public List<CrawlerLog> getRecentCrawlerLogs() {
        try {
            return crawlerLogRepository.findTop20ByOrderByCreatedAtDesc();
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    @Override
    public int migrateLegacyUrls() {
        int updatedCount = 0;
        try {
            List<Story> stories = storyRepository.findAll();
            for (Story story : stories) {
                boolean modified = false;
                if (story.getThumbUrl() != null && (story.getThumbUrl().contains("otruyenapi.com") || story.getThumbUrl().contains("otruyencdn.com"))) {
                    story.setThumbUrl(story.getThumbUrl().replaceAll("https?://(img\\.)*otruyenapi\\.com/uploads/comics/", cuutruyenCdnUrl + "/covers/"));
                    modified = true;
                }
                if (story.getSummary() != null && story.getSummary().contains("Otruyen")) {
                    story.setSummary(story.getSummary().replace("Otruyen", "CuuTruyen"));
                    modified = true;
                }
                if (modified) {
                    storyRepository.save(story);
                    updatedCount++;
                }
            }

            List<Chapter> chapters = chapterRepository.findAll();
            for (Chapter chapter : chapters) {
                boolean modified = false;
                if (chapter.getChapterApiUrl() != null && (chapter.getChapterApiUrl().contains("otruyenapi.com") || chapter.getChapterApiUrl().contains("otruyencdn.com"))) {
                    chapter.setChapterApiUrl("");
                    chapter.setPages(new ArrayList<>());
                    modified = true;
                }
                if (modified) {
                    chapterRepository.save(chapter);
                }
            }
            clearAllStoryCaches();
        } catch (Exception e) {
            System.err.println("Lỗi khi migrate legacy URLs: " + e.getMessage());
        }
        return updatedCount;
    }

    private Story importStoryInternal(String slugOrId) throws Exception {
        String jsonResponse = fetchWithFallback("mangas/" + slugOrId);
        if (jsonResponse == null) {
            // Try importing via MangaDex if slug matches or fallback
            if (mangadexImportService != null) {
                try {
                    return mangadexImportService.importStoryFromMangadex(slugOrId);
                } catch (Exception ignored) {}
            }
            return null;
        }

        JsonNode rootNode = objectMapper.readTree(jsonResponse);
        JsonNode dataNode = rootNode.has("data") ? rootNode.path("data") : rootNode;

        if (dataNode.isMissingNode() || dataNode.isNull()) return null;

        String id = dataNode.has("id") ? dataNode.path("id").asText() : slugOrId;
        String name = dataNode.has("name") ? dataNode.path("name").asText("Truyện CuuTruyen") : dataNode.path("title").asText("Truyện CuuTruyen");
        String storySlug = dataNode.has("slug") ? dataNode.path("slug").asText(slugOrId) : slugOrId;
        String summary = dataNode.has("description") ? dataNode.path("description").asText("Tóm tắt nội dung chưa cập nhật.").replaceAll("<[^>]*>", "") : "Tóm tắt chưa cập nhật.";

        String rawStatus = dataNode.path("status").asText();
        String status = "completed".equalsIgnoreCase(rawStatus) || "finished".equalsIgnoreCase(rawStatus) ? "Completed" : ("upcoming".equalsIgnoreCase(rawStatus) ? "Upcoming" : "Ongoing");

        String author = "Đang cập nhật";
        if (dataNode.has("author_name")) {
            author = dataNode.path("author_name").asText("Đang cập nhật");
        } else if (dataNode.has("author") && dataNode.path("author").has("name")) {
            author = dataNode.path("author").path("name").asText("Đang cập nhật");
        }

        List<String> categories = new ArrayList<>();
        if (dataNode.path("genres").isArray()) {
            for (JsonNode gNode : dataNode.path("genres")) {
                String gName = gNode.has("name") ? gNode.path("name").asText() : gNode.asText();
                if (!gName.isEmpty()) categories.add(gName);
            }
        } else if (dataNode.path("categories").isArray()) {
            for (JsonNode catNode : dataNode.path("categories")) {
                categories.add(catNode.path("name").asText());
            }
        }
        if (categories.isEmpty()) categories.add("Manga");

        String thumbFile = dataNode.has("cover_url") ? dataNode.path("cover_url").asText() : dataNode.path("thumb_url").asText("");
        String thumbUrl = formatThumbUrl(thumbFile);

        // Fetch chapters list for manga from CuuTruyen API
        String chaptersJson = fetchWithFallback("mangas/" + id + "/chapters");

        List<ChapterData> chapterListToImport = new ArrayList<>();
        String latestChapterName = "Ch. 1";

        if (chaptersJson != null) {
            JsonNode chRoot = objectMapper.readTree(chaptersJson);
            JsonNode chItems = chRoot.has("data") ? chRoot.path("data") : chRoot;
            if (chItems.isArray() && chItems.size() > 0) {
                double maxChNum = -1.0;
                String highestChNum = "1";

                for (int i = 0; i < chItems.size(); i++) {
                    JsonNode chNode = chItems.get(i);
                    String chId = chNode.path("id").asText();
                    String chNumber = chNode.has("number") ? chNode.path("number").asText() : chNode.path("name").asText(String.valueOf(i + 1));
                    String chTitle = chNode.has("title") ? chNode.path("title").asText("Chapter " + chNumber) : "Chapter " + chNumber;

                    String chapterApiUrl = cuutruyenApiBaseUrl + "chapters/" + chId;
                    chapterListToImport.add(new ChapterData(chNumber, chTitle, chapterApiUrl));

                    try {
                        double parsed = Double.parseDouble(chNumber.replaceAll("[^0-9.]", ""));
                        if (parsed > maxChNum) {
                            maxChNum = parsed;
                            highestChNum = chNumber;
                        }
                    } catch (Exception ignored) {
                        if (highestChNum.equals("1")) highestChNum = chNumber;
                    }
                }
                latestChapterName = "Ch. " + highestChNum;
            }
        }

        Optional<Story> existingStoryOpt = storyRepository.findBySlug(storySlug);
        Story storyEntity = existingStoryOpt.orElseGet(() -> Story.builder()
                .slug(storySlug)
                .viewCount(100000L + new Random().nextInt(500000))
                .createdAt(LocalDateTime.now())
                .isPublic(true)
                .build());

        storyEntity.setName(name);
        storyEntity.setAuthor(author);
        storyEntity.setSummary(summary);
        storyEntity.setCategories(categories);
        storyEntity.setStatus(status);
        storyEntity.setThumbUrl(thumbUrl);
        storyEntity.setLatestChapter(latestChapterName);
        storyEntity.setTotalChapters(chapterListToImport.size());
        storyEntity.setPublic(true);
        storyEntity.setUpdateAt(LocalDateTime.now());

        storyRepository.save(storyEntity);

        // Save Chapters into Mongo
        List<Chapter> chaptersToSave = new ArrayList<>();
        for (ChapterData chData : chapterListToImport) {
            Optional<Chapter> existingCh = chapterRepository.findByStorySlugAndChapterName(storySlug, chData.chName);
            Chapter chapterEntity = existingCh.orElseGet(() -> Chapter.builder()
                    .storySlug(storySlug)
                    .chapterName(chData.chName)
                    .updatedAt(LocalDateTime.now())
                    .build());

            chapterEntity.setChapterTitle(chData.chTitle);
            chapterEntity.setChapterApiUrl(chData.chapterApiUrl);
            chaptersToSave.add(chapterEntity);
        }
        if (!chaptersToSave.isEmpty()) {
            chapterRepository.saveAll(chaptersToSave);
        }

        return storyEntity;
    }

    private static class ChapterData {
        String chName;
        String chTitle;
        String chapterApiUrl;

        public ChapterData(String chName, String chTitle, String chapterApiUrl) {
            this.chName = chName;
            this.chTitle = chTitle;
            this.chapterApiUrl = chapterApiUrl;
        }
    }
}
