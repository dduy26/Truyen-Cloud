package truyen.cloud.service.impl;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Pattern;

import jakarta.annotation.PostConstruct;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import truyen.cloud.model.Chapter;
import truyen.cloud.model.CrawlerLog;
import truyen.cloud.model.Story;
import truyen.cloud.repository.ChapterRepository;
import truyen.cloud.repository.CrawlerLogRepository;
import truyen.cloud.repository.StoryRepository;
import truyen.cloud.service.MangadexImportService;

@Slf4j
@Service
@RequiredArgsConstructor
public class MangadexImportServiceImpl implements MangadexImportService {
    private final StoryRepository storyRepository;
    private final ChapterRepository chapterRepository;
    private final CrawlerLogRepository crawlerLogRepository;
    private final CacheManager cacheManager;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final AtomicBoolean isSyncing = new AtomicBoolean(false);

    private static final String MANGADEX_API_BASE = "https://api.mangadex.org/";



    private String fetchJson(String url) {
        for (int attempt = 1; attempt <= 3; attempt++) {
            try {
                HttpHeaders headers = new HttpHeaders();
                headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
                HttpEntity<String> entity = new HttpEntity<>(headers);
                ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    return response.getBody();
                }
            } catch (org.springframework.web.client.HttpClientErrorException.TooManyRequests e) {
                log.warn("MangaDex Rate Limit 429 on attempt {} for {}. Sleeping 1200ms...", attempt, url);
                if (attempt < 3) {
                    try { Thread.sleep(1200); } catch (InterruptedException ignored) {}
                }
            } catch (Exception e) {
                log.warn("Direct fetch attempt {} failed for {}: {}", attempt, url, e.getMessage());
                if (attempt < 3) {
                    try { Thread.sleep(600); } catch (InterruptedException ignored) {}
                }
            }
        }
        return null;
    }

    private String toSlug(String input) {
        if (input == null) return "";
        String nowhitespace = Pattern.compile("\\s+").matcher(input).replaceAll("-");
        String normalized = Normalizer.normalize(nowhitespace, Normalizer.Form.NFD);
        String slug = Pattern.compile("[^\\w-]").matcher(normalized).replaceAll("");
        return slug.toLowerCase(Locale.ENGLISH);
    }

    @Override
    public List<Map<String, Object>> searchMangadexStories(String keyword) {
        List<Map<String, Object>> results = new ArrayList<>();
        if (keyword == null || keyword.trim().isEmpty()) {
            return results;
        }
        try {
            String url = MANGADEX_API_BASE + "manga?limit=15&includes[]=cover_art&title=" + java.net.URLEncoder.encode(keyword.trim(), "UTF-8");
            String jsonRaw = fetchJson(url);
            if (jsonRaw != null) {
                JsonNode root = objectMapper.readTree(jsonRaw);
                JsonNode dataNode = root.path("data");
                if (dataNode.isArray()) {
                    for (JsonNode item : dataNode) {
                        Map<String, Object> map = new HashMap<>();
                        String id = item.path("id").asText();
                        map.put("id", id);

                        JsonNode titleObj = item.path("attributes").path("title");
                        String name = titleObj.path("vi").asText("");
                        if (name.isEmpty()) name = titleObj.path("en").asText("");
                        if (name.isEmpty() && titleObj.fieldNames().hasNext()) {
                            name = titleObj.path(titleObj.fieldNames().next()).asText("MangaDex Title");
                        }
                        map.put("name", name);
                        map.put("slug", toSlug(name));

                        String coverFileName = "";
                        JsonNode relationships = item.path("relationships");
                        if (relationships.isArray()) {
                            for (JsonNode rel : relationships) {
                                if ("cover_art".equals(rel.path("type").asText())) {
                                    coverFileName = rel.path("attributes").path("fileName").asText("");
                                }
                            }
                        }
                        String thumbUrl = coverFileName.isEmpty()
                                ? "https://uploads.mangadex.org/covers/" + id
                                : "https://uploads.mangadex.org/covers/" + id + "/" + coverFileName;
                        map.put("thumbUrl", thumbUrl);
                        map.put("status", item.path("attributes").path("status").asText("Ongoing"));
                        map.put("latestChapter", "Ch. MangaDex");

                        results.add(map);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Lỗi search MangaDex: " + e.getMessage());
        }
        return results;
    }

    @Override
    public Story importStoryFromMangadex(String mangadexId) throws Exception {
        if (mangadexId == null || mangadexId.trim().isEmpty()) {
            throw new IllegalArgumentException("MangaDex ID không hợp lệ.");
        }

        // 1. Fetch Manga Info
        String infoUrl = MANGADEX_API_BASE + "manga/" + mangadexId + "?includes[]=cover_art&includes[]=author";
        String jsonInfo = fetchJson(infoUrl);
        if (jsonInfo == null) throw new RuntimeException("Không tìm thấy bộ truyện trên MangaDex!");

        JsonNode root = objectMapper.readTree(jsonInfo);
        JsonNode dataNode = root.path("data");
        JsonNode attrsNode = dataNode.path("attributes");

        JsonNode titleObj = attrsNode.path("title");
        String name = titleObj.path("vi").asText("");
        if (name.isEmpty()) name = titleObj.path("en").asText("");
        if (name.isEmpty() && titleObj.fieldNames().hasNext()) {
            name = titleObj.path(titleObj.fieldNames().next()).asText("MangaDex Manga");
        }

        String computedSlug = toSlug(name);
        if (computedSlug.isEmpty()) {
            computedSlug = "mangadex-" + mangadexId.substring(0, Math.min(8, mangadexId.length()));
        }
        final String slug = computedSlug;

        String summary = attrsNode.path("description").path("vi").asText("");
        if (summary.isEmpty()) summary = attrsNode.path("description").path("en").asText("Bộ truyện MangaDex chất lượng cao.");

        String author = "MangaDex Author";
        String coverFileName = "";
        JsonNode relationships = dataNode.path("relationships");
        if (relationships.isArray()) {
            for (JsonNode rel : relationships) {
                if ("author".equals(rel.path("type").asText())) {
                    author = rel.path("attributes").path("name").asText("MangaDex Author");
                }
                if ("cover_art".equals(rel.path("type").asText())) {
                    coverFileName = rel.path("attributes").path("fileName").asText("");
                }
            }
        }

        String thumbUrl = coverFileName.isEmpty()
                ? "https://uploads.mangadex.org/covers/" + mangadexId
                : "https://uploads.mangadex.org/covers/" + mangadexId + "/" + coverFileName;

        List<String> categories = new ArrayList<>();
        JsonNode tags = attrsNode.path("tags");
        if (tags.isArray()) {
            for (JsonNode tag : tags) {
                String tagName = tag.path("attributes").path("name").path("en").asText("");
                if (!tagName.isEmpty()) categories.add(tagName);
            }
        }
        if (categories.isEmpty()) categories.add("Manga");

        // 2. Fetch ALL Chapters feed with offset pagination (Strictly filter English 'en' and Vietnamese 'vi')
        Map<String, JsonNode> chapterMap = new LinkedHashMap<>();
        int feedOffset = 0;
        boolean hasMoreFeed = true;

        while (hasMoreFeed && feedOffset < 2500) {
            String feedUrl = MANGADEX_API_BASE + "manga/" + mangadexId + "/feed?translatedLanguage[]=en&translatedLanguage[]=vi&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&order[chapter]=asc&limit=500&offset=" + feedOffset;
            String jsonFeed = fetchJson(feedUrl);

            if (jsonFeed == null && feedOffset == 0) {
                String fallbackFeedUrl = MANGADEX_API_BASE + "manga/" + mangadexId + "/feed?translatedLanguage[]=en&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&order[chapter]=asc&limit=500&offset=0";
                jsonFeed = fetchJson(fallbackFeedUrl);
            }

            if (jsonFeed == null) break;

            try {
                JsonNode feedRoot = objectMapper.readTree(jsonFeed);
                JsonNode feedData = feedRoot.path("data");
                if (!feedData.isArray() || feedData.isEmpty()) {
                    hasMoreFeed = false;
                    break;
                }

                for (JsonNode chItem : feedData) {
                    JsonNode chAttrs = chItem.path("attributes");
                    String chNum = chAttrs.path("chapter").asText("");
                    JsonNode extNode = chAttrs.path("externalUrl");
                    boolean hasExt = !extNode.isMissingNode() && !extNode.isNull() && !extNode.asText("").trim().isEmpty() && !"null".equalsIgnoreCase(extNode.asText("").trim());
                    int pageCount = chAttrs.path("pages").asInt(0);

                    // Skip external redirect links and 0-page placeholders
                    if (hasExt || pageCount == 0 || chNum.isEmpty()) continue;

                    // Deduplicate: Keep ONLY the first valid scanlation group for each chapter number ("1", "2", ... "23", "24")
                    if (!chapterMap.containsKey(chNum)) {
                        chapterMap.put(chNum, chItem);
                    }
                }

                if (feedData.size() < 500) {
                    hasMoreFeed = false;
                } else {
                    feedOffset += 500;
                }
            } catch (Exception e) {
                log.error("Lỗi parse feed offset {}: {}", feedOffset, e.getMessage());
                break;
            }
        }

        List<Chapter> chaptersToSave = new ArrayList<>();
        String latestChName = "Ch. 1";
        double maxChNum = -1.0;

        for (Map.Entry<String, JsonNode> entry : chapterMap.entrySet()) {
            String chNum = entry.getKey();
            JsonNode chItem = entry.getValue();
            String chId = chItem.path("id").asText();
            JsonNode chAttrs = chItem.path("attributes");

            String chTitle = chAttrs.path("title").asText("");
            if (chTitle.isEmpty()) chTitle = "Chapter " + chNum;

            String chapterApiUrl = MANGADEX_API_BASE + "at-home/server/" + chId;
            List<String> imageUrls = new ArrayList<>();

            // Pre-fetch image URLs for the first 2 chapters during import to prevent MangaDex 429 rate limit.
            // All other chapters are auto-repaired on-demand in <300ms when opened by reader in ChapterServiceImpl!
            if (chaptersToSave.size() < 2) {
                try {
                    String jsonAtHome = fetchJson(chapterApiUrl);
                    if (jsonAtHome != null) {
                        JsonNode homeRoot = objectMapper.readTree(jsonAtHome);
                        String hash = homeRoot.path("chapter").path("hash").asText("");
                        JsonNode pageFiles = homeRoot.path("chapter").path("data");
                        boolean isDataSaver = false;
                        if (!pageFiles.isArray() || pageFiles.isEmpty()) {
                            pageFiles = homeRoot.path("chapter").path("dataSaver");
                            isDataSaver = true;
                        }

                        if (pageFiles.isArray() && !hash.isEmpty()) {
                            String serverPrefix = "https://uploads.mangadex.org";
                            String pathPrefix = isDataSaver ? "/data-saver/" : "/data/";
                            for (JsonNode pageFile : pageFiles) {
                                String fileName = pageFile.asText("");
                                if (!fileName.isEmpty()) {
                                    imageUrls.add(serverPrefix + pathPrefix + hash + "/" + fileName);
                                }
                            }
                        }
                    }
                } catch (Exception e) {
                    log.warn("Không thể pre-fetch trang ảnh cho chapter {}: {}", chNum, e.getMessage());
                }
            }

            Optional<Chapter> existingCh = chapterRepository.findByStorySlugAndChapterName(slug, chNum);
            Chapter chapterEntity = existingCh.orElseGet(() -> Chapter.builder()
                    .storySlug(slug)
                    .chapterName(chNum)
                    .updatedAt(LocalDateTime.now())
                    .build());

            chapterEntity.setChapterTitle(chTitle);
            chapterEntity.setChapterApiUrl(chapterApiUrl);
            if (!imageUrls.isEmpty()) {
                chapterEntity.setImageUrls(imageUrls);
                chapterEntity.setPages(imageUrls);
            }
            chapterEntity.setUpdatedAt(LocalDateTime.now());
            chaptersToSave.add(chapterEntity);

            try {
                double parsed = Double.parseDouble(chNum);
                if (parsed >= maxChNum) {
                    maxChNum = parsed;
                    latestChName = "Ch. " + chNum;
                }
            } catch (Exception ignored) {}
        }

        Optional<Story> existingStoryOpt = storyRepository.findBySlug(slug);
        Story storyEntity = existingStoryOpt.orElseGet(() -> Story.builder()
                .slug(slug)
                .viewCount(200000L + new Random().nextInt(400000))
                .createdAt(LocalDateTime.now())
                .isPublic(true)
                .build());

        storyEntity.setName(name);
        storyEntity.setAuthor(author);
        storyEntity.setSummary(summary);
        storyEntity.setCategories(categories);
        storyEntity.setStatus("Ongoing");
        storyEntity.setThumbUrl(thumbUrl);
        storyEntity.setLatestChapter(latestChName);
        storyEntity.setTotalChapters(chaptersToSave.size() > 0 ? chaptersToSave.size() : 1);
        storyEntity.setPublic(true);
        storyEntity.setUpdateAt(LocalDateTime.now());

        storyRepository.save(storyEntity);

        if (!chaptersToSave.isEmpty()) {
            chapterRepository.saveAll(chaptersToSave);
        }

        clearCaches();

        log.info("✅ [MangaDex] Đã import thành công truyện '{}' với {} chapters.", name, chaptersToSave.size());
        return storyEntity;
    }

    @Async
    @Override
    public void importBatchMangadexStoriesAsync(int limit) {
        int targetPages = Math.max(1, (int) Math.ceil((double) limit / 25));
        importBatchMangadexPagesAsync(1, Math.min(targetPages, 10));
    }

    @Async
    @Override
    public void importBatchMangadexPagesAsync(int startPage, int endPage) {
        int from = Math.max(1, startPage);
        int to = Math.min(Math.max(from, endPage), 10);
        log.info("🚀 [MangaDex Batch] Bắt đầu cào tự động từ trang {} đến trang {} (khoảng {} bộ truyện nổi tiếng nhất)...", from, to, (to - from + 1) * 25);

        int totalCount = 0;
        for (int p = from; p <= to; p++) {
            int offset = (p - 1) * 25;
            try {
                String url = MANGADEX_API_BASE + "manga?limit=25&offset=" + offset + "&order[followedCount]=desc&includes[]=cover_art&includes[]=author";
                String jsonRaw = fetchJson(url);
                if (jsonRaw != null) {
                    JsonNode root = objectMapper.readTree(jsonRaw);
                    JsonNode dataNode = root.path("data");
                    if (dataNode.isArray()) {
                        int pageCount = 0;
                        for (JsonNode item : dataNode) {
                            String id = item.path("id").asText();
                            if (!id.isEmpty()) {
                                try {
                                    importStoryFromMangadex(id);
                                    pageCount++;
                                    totalCount++;
                                    Thread.sleep(500);
                                } catch (Exception e) {
                                    log.warn("Lỗi import MangaDex batch ID {}: {}", id, e.getMessage());
                                }
                            }
                        }
                        log.info("✓ [MangaDex Batch] Hoàn tất cào Trang {}/{} ({} bộ truyện).", p, to, pageCount);
                    }
                }
            } catch (Exception e) {
                log.error("Lỗi khi cào MangaDex trang {}: {}", p, e.getMessage());
            }
        }
        log.info("🎉 [MangaDex Batch] Hoàn tất toàn bộ tiến trình cào {} bộ truyện hot từ MangaDex!", totalCount);
    }

    @Override
    public int syncMangadexLatestUpdates() {
        return syncMangadexLatestUpdates("AUTO_SCHEDULED");
    }

    @Override
    public int syncMangadexLatestUpdates(String triggerType) {
        if (!isSyncing.compareAndSet(false, true)) {
            log.info("⚠️ [MangaDex Auto-Sync] Tiến trình cào truyện trước đó vẫn đang chạy, bỏ qua lần này.");
            return 0;
        }

        int updatedCount = 0;
        long startTime = System.currentTimeMillis();
        String status = "SUCCESS";
        String logMsg = "";
        List<CrawlerLog.UpdatedStoryDetail> updatedStoryDetailsList = new ArrayList<>();

        try {
            String latestUrl = MANGADEX_API_BASE + "chapter?limit=25&order[readableAt]=desc&translatedLanguage[]=en&translatedLanguage[]=vi&includes[]=manga";
            String jsonRaw = fetchJson(latestUrl);

            if (jsonRaw != null) {
                JsonNode root = objectMapper.readTree(jsonRaw);
                JsonNode dataNode = root.path("data");

                if (dataNode.isArray()) {
                    Set<String> processedMangaIds = new HashSet<>();

                    for (JsonNode chNode : dataNode) {
                        String mangaId = "";
                        String mangaTitle = "";
                        JsonNode relationships = chNode.path("relationships");
                        if (relationships.isArray()) {
                            for (JsonNode rel : relationships) {
                                if ("manga".equals(rel.path("type").asText())) {
                                    mangaId = rel.path("id").asText();
                                    JsonNode titleNode = rel.path("attributes").path("title");
                                    mangaTitle = titleNode.path("vi").asText("");
                                    if (mangaTitle.isEmpty()) mangaTitle = titleNode.path("en").asText("");
                                    if (mangaTitle.isEmpty() && titleNode.fieldNames().hasNext()) {
                                        mangaTitle = titleNode.path(titleNode.fieldNames().next()).asText("");
                                    }
                                }
                            }
                        }

                        if (mangaId.isEmpty() || processedMangaIds.contains(mangaId)) continue;
                        processedMangaIds.add(mangaId);

                        String chNum = chNode.path("attributes").path("chapter").asText("1");
                        String slug = toSlug(mangaTitle);

                        Optional<Story> localStoryOpt = storyRepository.findBySlug(slug);
                        if (localStoryOpt.isPresent()) {
                            Story localStory = localStoryOpt.get();
                            try {
                                double newNum = Double.parseDouble(chNum.replaceAll("[^0-9.]", ""));
                                double currNum = localStory.getLatestChapter() != null ? Double.parseDouble(localStory.getLatestChapter().replaceAll("[^0-9.]", "")) : -1.0;
                                if (newNum > currNum) {
                                    localStory.setLatestChapter("Ch. " + chNum);
                                    localStory.setUpdateAt(LocalDateTime.now());
                                    storyRepository.save(localStory);

                                    updatedCount++;
                                    updatedStoryDetailsList.add(CrawlerLog.UpdatedStoryDetail.builder()
                                            .slug(slug)
                                            .name(localStory.getName())
                                            .latestChapter("Ch. " + chNum)
                                            .thumbUrl(localStory.getThumbUrl())
                                            .build());
                                }
                            } catch (Exception ignored) {}
                        }
                    }
                }
            }

            if (updatedCount > 0) {
                clearCaches();
                logMsg = "⚡ [MangaDex Sync] Đã cập nhật chap mới cho " + updatedCount + " bộ truyện từ MangaDex Global CDN.";
            } else {
                logMsg = "✓ [MangaDex Sync] Đã kiểm tra các chapter mới nhất: Dữ liệu truyện MangaDex đang cập nhật đồng bộ.";
            }
        } catch (Exception e) {
            status = "FAILED";
            logMsg = "Lỗi khi đồng bộ MangaDex: " + e.getMessage();
            log.error("Lỗi syncMangadexLatestUpdates: {}", e.getMessage());
        } finally {
            isSyncing.set(false);
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
                log.error("Không thể lưu CrawlerLog: {}", e.getMessage());
            }
        }

        return updatedCount;
    }

    @Override
    public void resetAllData() {
        try {
            chapterRepository.deleteAll();
            storyRepository.deleteAll();
            clearCaches();
            log.info("Đã xóa sạch toàn bộ Chapters, Stories và Cache Redis thành công.");
        } catch (Exception e) {
            log.error("Lỗi khi resetAllData: {}", e.getMessage());
            throw new RuntimeException("Không thể xóa Database: " + e.getMessage());
        }
    }

    private void clearCaches() {
        try {
            if (cacheManager != null) {
                for (String name : cacheManager.getCacheNames()) {
                    Cache cache = cacheManager.getCache(name);
                    if (cache != null) {
                        cache.clear();
                    }
                }
            }
        } catch (Exception ignored) {}
    }
}
