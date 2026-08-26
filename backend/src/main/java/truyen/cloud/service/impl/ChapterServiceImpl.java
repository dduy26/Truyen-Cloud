package truyen.cloud.service.impl;

import java.net.URI;
import java.net.URLDecoder;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import truyen.cloud.dtos.request.ChapterRequest;
import truyen.cloud.dtos.response.ChapterResponse;
import truyen.cloud.exception.ResourceNotFoundException;
import truyen.cloud.mapper.ChapterMapper;
import truyen.cloud.model.Chapter;
import truyen.cloud.model.Story;
import truyen.cloud.repository.ChapterRepository;
import truyen.cloud.repository.StoryRepository;
import truyen.cloud.service.ChapterService;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class ChapterServiceImpl implements ChapterService {
    private final ChapterRepository chapterRepository;
    private final StoryRepository storyRepository;
    private final ChapterMapper chapterMapper;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ChapterServiceImpl(ChapterRepository chapterRepository, StoryRepository storyRepository, ChapterMapper chapterMapper) {
        this.chapterRepository = chapterRepository;
        this.storyRepository = storyRepository;
        this.chapterMapper = chapterMapper;

        org.springframework.http.client.SimpleClientHttpRequestFactory factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(1500);
        factory.setReadTimeout(2500);
        this.restTemplate = new RestTemplate(factory);
    }

    private String resolveRealSlug(String storySlug) {
        if (storySlug == null || storySlug.trim().isEmpty()) return "";
        Optional<Story> storyOpt = storyRepository.findBySlug(storySlug);
        if (storyOpt.isEmpty()) {
            storyOpt = storyRepository.findById(storySlug);
        }
        return storyOpt.map(s -> s.getSlug() != null ? s.getSlug() : storySlug).orElse(storySlug);
    }

    private String fetchJsonDirect(String url) {
        if (url == null || url.trim().isEmpty()) return null;
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            headers.set("Accept", "application/json, text/plain, */*");
            headers.set("Referer", "https://cuutruyen.net/");
            headers.set("Origin", "https://cuutruyen.net");
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            ResponseEntity<String> response = restTemplate.exchange(URI.create(url), HttpMethod.GET, entity, String.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody();
            }
        } catch (Exception e) {
            System.err.println("⚠️ Fetch direct failed for: " + url + " - " + e.getMessage());
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

    // Pattern để phát hiện nested proxy URL (cả v1 lẫn v2 của CuuTruyen)
    private static final Pattern PROXY_URL_PATTERN = Pattern.compile(".*/images/proxy\\?url=(.+)");

    /**
     * Trích xuất URL ảnh gốc từ nested proxy URL của CuuTruyen.
     * Nếu CuuTruyen trả về src = "https://cuutruyen.net/api/v1/images/proxy?url=https%3A%2F%2Fcdn..."
     * thì hàm này sẽ decode và trả về URL gốc trực tiếp "https://cdn..."
     */
    private String extractDirectImageUrl(String src) {
        if (src == null || src.isEmpty()) return src;
        String current = src.trim();
        for (int i = 0; i < 5; i++) {
            Matcher m = PROXY_URL_PATTERN.matcher(current);
            if (m.matches()) {
                try {
                    current = URLDecoder.decode(m.group(1), java.nio.charset.StandardCharsets.UTF_8).trim();
                } catch (Exception e) {
                    break;
                }
            } else {
                break;
            }
        }
        if (current.contains("storage-ct.lrclib.net")) {
            current = current.replace("storage-ct.lrclib.net", "cuutruyen.net");
        }
        return current;
    }

    @Override
    @CacheEvict(value = {"stories_detail", "chapter_detail"}, allEntries = true)
    public ChapterResponse createChapter(ChapterRequest request) {
        Chapter chapter = chapterMapper.toEntity(request);
        chapter.setUpdatedAt(LocalDateTime.now());

        Chapter savedChapter = chapterRepository.save(chapter);

        if (request.getStorySlug() != null) {
            String realSlug = resolveRealSlug(request.getStorySlug());
            storyRepository.findBySlug(realSlug).ifPresent(story -> {
                String chName = request.getChapterName() != null ? request.getChapterName() : "1";
                story.setLatestChapter("Ch. " + chName);
                story.setTotalChapters((int) chapterRepository.countByStorySlug(realSlug));
                story.setUpdateAt(LocalDateTime.now());
                storyRepository.save(story);
            });
        }

        return chapterMapper.toResponse(savedChapter);
    }

    @Override
    public List<ChapterResponse> getChaptersByStorySlug(String storySlug) {
        String realSlug = resolveRealSlug(storySlug);
        List<Chapter> chapters = chapterRepository.findByStorySlug(realSlug);
        if (chapters.isEmpty() && !realSlug.equals(storySlug)) {
            chapters = chapterRepository.findByStorySlug(storySlug);
        }

        if (chapters.isEmpty()) {
            chapters = fetchAndPopulateChaptersOnDemand(realSlug);
        }

        // Auto-sync story's latestChapter & totalChapters
        if (!chapters.isEmpty()) {
            final List<Chapter> finalChapters = chapters;
            storyRepository.findBySlug(realSlug).ifPresent(story -> {
                story.setTotalChapters(finalChapters.size());
                finalChapters.stream()
                        .map(Chapter::getChapterName)
                        .filter(n -> n != null && !n.isEmpty())
                        .max((a, b) -> {
                            try {
                                return Float.compare(Float.parseFloat(a), Float.parseFloat(b));
                            } catch (Exception e) {
                                return a.compareTo(b);
                            }
                        })
                        .ifPresent(maxCh -> story.setLatestChapter("Ch. " + maxCh));
                storyRepository.save(story);
            });
        }

        return chapterMapper.toResponseList(chapters);
    }

    @Override
    @Cacheable(value = "chapter_detail", key = "#storySlug + ':' + #chapterName")
    public ChapterResponse getChapterDetail(String storySlug, String chapterName) {
        String realSlug = resolveRealSlug(storySlug);

        Optional<Chapter> chapterOpt = chapterRepository.findByStorySlugAndChapterName(realSlug, chapterName);
        if (chapterOpt.isEmpty() && !realSlug.equals(storySlug)) {
            chapterOpt = chapterRepository.findByStorySlugAndChapterName(storySlug, chapterName);
        }

        Chapter chapter = null;
        if (chapterOpt.isPresent()) {
            chapter = chapterOpt.get();
        } else {
            List<Chapter> populated = fetchAndPopulateChaptersOnDemand(realSlug);
            chapter = populated.stream()
                    .filter(c -> chapterName.equalsIgnoreCase(c.getChapterName()))
                    .findFirst()
                    .orElse(null);
        }

        if (chapter == null) {
            chapter = Chapter.builder()
                    .storySlug(realSlug)
                    .chapterName(chapterName)
                    .chapterTitle("Chương " + chapterName)
                    .pages(new ArrayList<>())
                    .updatedAt(LocalDateTime.now())
                    .build();
            chapter = chapterRepository.save(chapter);
        }

        boolean needsRealPages = chapter.getPages() == null || chapter.getPages().isEmpty()
                || chapter.getPages().stream().anyMatch(p -> p != null && p.contains("unsplash.com"));

        if (needsRealPages) {
            String apiDataUrl = chapter.getChapterApiUrl();
            if (apiDataUrl == null || apiDataUrl.isEmpty() || apiDataUrl.contains("otruyenapi.com")) {
                apiDataUrl = "mangas/" + realSlug + "/chapters";
            }
            List<String> fetchedPages = fetchChapterPagesFromApi(apiDataUrl);
            if (!fetchedPages.isEmpty()) {
                chapter.setPages(fetchedPages);
                chapterRepository.save(chapter);
            }
        }

        return chapterMapper.toResponse(chapter);
    }

    private List<Chapter> fetchAndPopulateChaptersOnDemand(String storySlug) {
        List<Chapter> chaptersSaved = new ArrayList<>();
        try {
            String jsonResponse = fetchWithFallback("mangas/" + storySlug);
            if (jsonResponse != null) {
                JsonNode rootNode = objectMapper.readTree(jsonResponse);
                JsonNode dataNode = rootNode.has("data") ? rootNode.path("data") : rootNode;
                String mangaId = dataNode.has("id") ? dataNode.path("id").asText() : storySlug;

                String chaptersJson = fetchWithFallback("mangas/" + mangaId + "/chapters");
                if (chaptersJson != null) {
                    JsonNode chRoot = objectMapper.readTree(chaptersJson);
                    JsonNode serverData = chRoot.has("data") ? chRoot.path("data") : chRoot;
                    if (serverData.isArray() && serverData.size() > 0) {
                        List<Chapter> existingList = chapterRepository.findByStorySlug(storySlug);
                        Map<String, Chapter> existingMap = existingList.stream()
                                .collect(Collectors.toMap(Chapter::getChapterName, c -> c, (a, b) -> a));

                        for (int i = 0; i < serverData.size(); i++) {
                            JsonNode chNode = serverData.get(i);
                            String chName = chNode.has("number") ? chNode.path("number").asText() : chNode.path("name").asText(String.valueOf(i + 1));
                            String chTitle = chNode.has("title") ? chNode.path("title").asText("Chapter " + chName) : "Chapter " + chName;
                            String chId = chNode.path("id").asText();
                            String chapterApiUrl = "https://cuutruyen.net/api/v2/chapters/" + chId;

                            Chapter chapterEntity = existingMap.get(chName);
                            if (chapterEntity == null) {
                                chapterEntity = Chapter.builder()
                                        .storySlug(storySlug)
                                        .chapterName(chName)
                                        .updatedAt(LocalDateTime.now())
                                        .build();
                            }

                            chapterEntity.setChapterTitle(chTitle);
                            chapterEntity.setChapterApiUrl(chapterApiUrl);
                            chaptersSaved.add(chapterEntity);
                        }
                        if (!chaptersSaved.isEmpty()) {
                            chapterRepository.saveAll(chaptersSaved);
                        }
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Lỗi khi nạp tự động chapters từ CuuTruyen cho " + storySlug + ": " + e.getMessage());
        }

        List<Chapter> result = chapterRepository.findByStorySlug(storySlug);
        if (result.isEmpty()) {
            int total = 1;
            Optional<Story> sOpt = storyRepository.findBySlug(storySlug);
            if (sOpt.isEmpty()) sOpt = storyRepository.findById(storySlug);
            if (sOpt.isPresent() && sOpt.get().getTotalChapters() > 0) {
                total = sOpt.get().getTotalChapters();
            }
            List<Chapter> generated = new ArrayList<>();
            for (int i = 1; i <= Math.min(total, 500); i++) {
                generated.add(Chapter.builder()
                        .storySlug(storySlug)
                        .chapterName(String.valueOf(i))
                        .chapterTitle("Chương " + i)
                        .pages(new ArrayList<>())
                        .updatedAt(LocalDateTime.now())
                        .build());
            }
            chapterRepository.saveAll(generated);
            result = generated;
        }
        return result;
    }

    private List<String> fetchChapterPagesFromApi(String chapterApiUrl) {
        if (chapterApiUrl == null || chapterApiUrl.isEmpty()) return new ArrayList<>();
        try {
            String jsonResponse = fetchWithFallback(chapterApiUrl);
            if (jsonResponse != null) {
                JsonNode chRootNode = objectMapper.readTree(jsonResponse);
                JsonNode chDataNode = chRootNode.has("data") ? chRootNode.path("data") : chRootNode;

                List<String> pageUrls = new ArrayList<>();
                JsonNode pagesNode = chDataNode.has("pages") ? chDataNode.path("pages") : (chDataNode.has("images") ? chDataNode.path("images") : chDataNode.path("chapter_image"));
                if (pagesNode.isArray()) {
                    for (JsonNode pNode : pagesNode) {
                        String src = "";
                        if (pNode.isTextual()) {
                            src = pNode.asText();
                        } else if (pNode.has("image_url")) {
                            src = pNode.path("image_url").asText();
                        } else if (pNode.has("src")) {
                            src = pNode.path("src").asText();
                        } else if (pNode.has("url")) {
                            src = pNode.path("url").asText();
                        } else if (pNode.has("image_file")) {
                            src = pNode.path("image_file").asText();
                        }

                        if (!src.isEmpty()) {
                            // Unwrap nested proxy URL nếu CuuTruyen trả về URL đã qua proxy nội bộ
                            src = extractDirectImageUrl(src);
                            if (!src.startsWith("http")) {
                                src = "https://cuutruyen.net/" + src.replaceAll("^/+", "");
                            }
                            pageUrls.add(src);
                        }
                    }
                }
                return pageUrls;
            }
        } catch (Exception e) {
            System.err.println("Lỗi khi fetch ảnh chapter CuuTruyen API: " + e.getMessage());
        }
        return new ArrayList<>();
    }

    @Override
    @CacheEvict(value = {"stories_detail", "chapter_detail"}, allEntries = true)
    public ChapterResponse updateChapter(String id, ChapterRequest request) {
        Chapter chapter = chapterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chương với id: " + id));

        chapter.setStorySlug(request.getStorySlug());
        chapter.setChapterName(request.getChapterName());
        chapter.setChapterTitle(request.getChapterTitle());
        chapter.setChapterApiUrl(request.getChapterApiUrl());
        if (request.getPages() != null) {
            chapter.setPages(request.getPages());
        }
        chapter.setUpdatedAt(LocalDateTime.now());

        Chapter updatedChapter = chapterRepository.save(chapter);
        return chapterMapper.toResponse(updatedChapter);
    }

    @Override
    @CacheEvict(value = {"stories_detail", "chapter_detail"}, allEntries = true)
    public void deleteChapter(String id) {
        if (!chapterRepository.existsById(id)) {
            throw new ResourceNotFoundException("Không tìm thấy chương để xóa với id: " + id);
        }
        chapterRepository.deleteById(id);
    }
}
