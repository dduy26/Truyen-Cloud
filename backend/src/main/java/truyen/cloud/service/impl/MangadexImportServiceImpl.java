package truyen.cloud.service.impl;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.Set;
import java.util.regex.Pattern;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import truyen.cloud.model.Chapter;
import truyen.cloud.model.Story;
import truyen.cloud.repository.ChapterRepository;
import truyen.cloud.repository.StoryRepository;
import truyen.cloud.service.MangadexImportService;

@Slf4j
@Service
@RequiredArgsConstructor
public class MangadexImportServiceImpl implements MangadexImportService{
    private final StoryRepository storyRepository;
    private final ChapterRepository chapterRepository;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String MANGADEX_API_BASE = "https://api.mangadex.org/";

    private String fetchJson(String url) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "MangaCloud-App/1.0 (contact@mangacloud.com)");
            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            return response.getBody();
        } catch (Exception e) {
            log.error("Lỗi fetch URL MangaDex: " + url + " - " + e.getMessage());
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
            String url = MANGADEX_API_BASE + "manga?limit=10&includes[]=cover_art&title=" + java.net.URLEncoder.encode(keyword.trim(), "UTF-8");
            String jsonRaw = fetchJson(url);
            if (jsonRaw != null) {
                JsonNode root = objectMapper.readTree(jsonRaw);
                JsonNode dataNode = root.path("data");
                if (dataNode.isArray()) {
                    for (JsonNode item : dataNode) {
                        Map<String, Object> map = new HashMap<>();
                        String id = item.path("id").asText();
                        map.put("id", id);
                        
                        // Extract Title (en, vi, or default)
                        JsonNode titleObj = item.path("attributes").path("title");
                        String name = titleObj.path("vi").asText("");
                        if (name.isEmpty()) name = titleObj.path("en").asText("");
                        if (name.isEmpty() && titleObj.fieldNames().hasNext()) {
                            name = titleObj.path(titleObj.fieldNames().next()).asText("MangaDex Title");
                        }
                        map.put("name", name);
                        map.put("slug", toSlug(name));

                        // Extract Cover Art Image
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
                                ? "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400"
                                : "https://uploads.mangadex.org/covers/" + id + "/" + coverFileName;
                        map.put("thumbUrl", thumbUrl);
                        map.put("status", item.path("attributes").path("status").asText("Ongoing"));
                        map.put("latestChapter", "Ch. MangaDex");

                        results.add(map);
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Lỗi search MangaDex: " + e.getMessage());
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
        if (summary.isEmpty()) summary = attrsNode.path("description").path("en").asText("Truyện tranh MangaDex.");

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
                ? "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400"
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

        String feedUrl = MANGADEX_API_BASE + "manga/" + mangadexId + "/feed?translatedLanguage[]=vi&translatedLanguage[]=en&order[chapter]=asc&limit=500";
        String jsonFeed = fetchJson(feedUrl);
        List<Chapter> chaptersToSave = new ArrayList<>();
        String latestChName = "Ch. 1";

        if (jsonFeed != null) {
            JsonNode feedRoot = objectMapper.readTree(jsonFeed);
            JsonNode feedData = feedRoot.path("data");
            if (feedData.isArray()) {
                Set<String> seenCh = new HashSet<>();
                for (JsonNode chItem : feedData) {
                    String chId = chItem.path("id").asText();
                    JsonNode chAttrs = chItem.path("attributes");
                    String chNum = chAttrs.path("chapter").asText("");
                    if (chNum.isEmpty()) continue;
                    if (seenCh.contains(chNum)) continue;
                    seenCh.add(chNum);

                    String chTitle = chAttrs.path("title").asText("");
                    if (chTitle.isEmpty()) chTitle = "Chương " + chNum;

                    // Fetch chapter image filenames
                    String atHomeUrl = MANGADEX_API_BASE + "at-home/server/" + chId;
                    String jsonAtHome = fetchJson(atHomeUrl);
                    List<String> imageUrls = new ArrayList<>();
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

                    Optional<Chapter> existingCh = chapterRepository.findByStorySlugAndChapterName(slug, chNum);
                    Chapter chapterEntity = existingCh.orElseGet(() -> Chapter.builder()
                            .storySlug(slug)
                            .chapterName(chNum)
                            .updatedAt(LocalDateTime.now())
                            .build());

                    chapterEntity.setChapterTitle(chTitle);
                    chapterEntity.setImageUrls(imageUrls);
                    chaptersToSave.add(chapterEntity);
                    latestChName = "Ch. " + chNum;
                }
            }
        }

        Optional<Story> existingStoryOpt = storyRepository.findBySlug(slug);
        Story storyEntity = existingStoryOpt.orElseGet(() -> Story.builder()
                .slug(slug)
                .viewCount(150000L + new Random().nextInt(300000))
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
        storyEntity.setUpdateAt(LocalDateTime.now());

        storyRepository.save(storyEntity);

        if (!chaptersToSave.isEmpty()) {
            chapterRepository.saveAll(chaptersToSave);
        }

        return storyEntity;
    }
}
