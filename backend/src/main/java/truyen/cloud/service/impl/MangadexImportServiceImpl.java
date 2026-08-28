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
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            if (response.getBody() != null) return response.getBody();
        } catch (Exception e) {
            log.warn("Direct fetch failed for {}, attempting proxy fallback...", url);
        }

        try {
            String proxyUrl = "https://api.allorigins.win/raw?url=" + java.net.URLEncoder.encode(url, "UTF-8");
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<String> response = restTemplate.exchange(proxyUrl, HttpMethod.GET, entity, String.class);
            return response.getBody();
        } catch (Exception ex) {
            log.error("Lỗi fetch URL MangaDex via proxy: " + url + " - " + ex.getMessage());
            return null;
        }
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
                                : "https://uploads.mangadex.org/covers/" + id + "/" + coverFileName + ".512.jpg";
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
                : "https://uploads.mangadex.org/covers/" + mangadexId + "/" + coverFileName + ".512.jpg";

        List<String> categories = new ArrayList<>();
        JsonNode tags = attrsNode.path("tags");
        if (tags.isArray()) {
            for (JsonNode tag : tags) {
                String tagName = tag.path("attributes").path("name").path("en").asText("");
                if (!tagName.isEmpty()) categories.add(tagName);
            }
        }
        if (categories.isEmpty()) categories.add("Manga");

        // 2. Fetch Chapters feed (English 'en' + Vietnamese 'vi')
        String feedUrl = MANGADEX_API_BASE + "manga/" + mangadexId + "/feed?translatedLanguage[]=en&translatedLanguage[]=vi&order[chapter]=asc&limit=300";
        String jsonFeed = fetchJson(feedUrl);
        List<Chapter> chaptersToSave = new ArrayList<>();
        String latestChName = "Ch. 1";

        if (jsonFeed != null) {
            JsonNode feedRoot = objectMapper.readTree(jsonFeed);
            JsonNode feedData = feedRoot.path("data");
            if (feedData.isArray()) {
                Set<String> seenCh = new HashSet<>();
                int processedChapters = 0;

                for (JsonNode chItem : feedData) {
                    String chId = chItem.path("id").asText();
                    JsonNode chAttrs = chItem.path("attributes");
                    String chNum = chAttrs.path("chapter").asText("");
                    if (chNum.isEmpty()) continue;
                    if (seenCh.contains(chNum)) continue;
                    seenCh.add(chNum);

                    String chTitle = chAttrs.path("title").asText("");
                    if (chTitle.isEmpty()) chTitle = "Chapter " + chNum;

                    // Fetch chapter image filenames directly via MangaDex At-Home CDN (Pre-fetch first 5 chapters to prevent 429 rate limits)
                    List<String> imageUrls = new ArrayList<>();
                    String chapterApiUrl = MANGADEX_API_BASE + "at-home/server/" + chId;

                    if (processedChapters < 5) {
                        try {
                            String jsonAtHome = fetchJson(chapterApiUrl);
                            if (jsonAtHome != null) {
                                JsonNode homeRoot = objectMapper.readTree(jsonAtHome);
                                String baseUrl = homeRoot.path("baseUrl").asText("");
                                String hash = homeRoot.path("chapter").path("hash").asText("");
                                JsonNode pageFiles = homeRoot.path("chapter").path("data");
                                if (pageFiles.isArray() && !baseUrl.isEmpty() && !hash.isEmpty()) {
                                    for (JsonNode pageFile : pageFiles) {
                                        imageUrls.add(baseUrl + "/data/" + hash + "/" + pageFile.asText());
                                    }
                                }
                            }
                        } catch (Exception e) {
                            log.warn("Không thể tải trước ảnh cho MangaDex chapter {}: {}", chNum, e.getMessage());
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
                    chapterEntity.setImageUrls(imageUrls);
                    chapterEntity.setPages(imageUrls);
                    chapterEntity.setUpdatedAt(LocalDateTime.now());
                    chaptersToSave.add(chapterEntity);
                    latestChName = "Ch. " + chNum;
                    processedChapters++;

                    if (processedChapters % 10 == 0) {
                        try { Thread.sleep(200); } catch (InterruptedException ignored) {}
                    }
                }
            }
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
        int target = Math.min(Math.max(5, limit), 50);
        log.info("🚀 [MangaDex Batch] Bắt đầu tự động cào Top {} bộ truyện nổi tiếng nhất từ MangaDex...", target);

        try {
            String url = MANGADEX_API_BASE + "manga?limit=" + target + "&order[followedCount]=desc&includes[]=cover_art&includes[]=author";
            String jsonRaw = fetchJson(url);
            if (jsonRaw != null) {
                JsonNode root = objectMapper.readTree(jsonRaw);
                JsonNode dataNode = root.path("data");
                if (dataNode.isArray()) {
                    int count = 0;
                    for (JsonNode item : dataNode) {
                        String id = item.path("id").asText();
                        if (!id.isEmpty()) {
                            try {
                                importStoryFromMangadex(id);
                                count++;
                                Thread.sleep(500);
                            } catch (Exception e) {
                                log.warn("Lỗi import MangaDex batch ID {}: {}", id, e.getMessage());
                            }
                        }
                    }
                    log.info("🎉 [MangaDex Batch] Đã hoàn tất cào {} bộ truyện hot từ MangaDex!", count);
                }
            }
        } catch (Exception e) {
            log.error("Lỗi khi chạy importBatchMangadexStoriesAsync: {}", e.getMessage());
        }
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
    public int deleteAllOtruyenStories() {
        try {
            List<Story> allStories = storyRepository.findAll();
            List<Story> otruyenStories = new ArrayList<>();
            for (Story s : allStories) {
                boolean isMangaDex = s.getThumbUrl() != null && (s.getThumbUrl().contains("mangadex.org") || s.getThumbUrl().contains("uploads.mangadex.org"));
                if (!isMangaDex) {
                    otruyenStories.add(s);
                }
            }

            if (!otruyenStories.isEmpty()) {
                for (Story s : otruyenStories) {
                    if (s.getSlug() != null) {
                        List<Chapter> chapters = chapterRepository.findByStorySlug(s.getSlug());
                        if (!chapters.isEmpty()) {
                            chapterRepository.deleteAll(chapters);
                        }
                    }
                }
                storyRepository.deleteAll(otruyenStories);
                log.info("🧹 Đã dọn dẹp xóa batch {} bộ truyện cũ (không thuộc MangaDex) khỏi MongoDB.", otruyenStories.size());
            }

            clearCaches();
            return otruyenStories.size();
        } catch (Exception e) {
            log.error("Lỗi khi xóa truyện cũ: {}", e.getMessage());
            return 0;
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
