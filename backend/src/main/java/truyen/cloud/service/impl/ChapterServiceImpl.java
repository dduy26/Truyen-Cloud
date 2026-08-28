package truyen.cloud.service.impl;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Map;
import java.util.stream.Collectors;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
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
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Slf4j
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

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(12000);
        this.restTemplate = new RestTemplate(factory);
    }

    @Override
    @CacheEvict(value = {"stories_detail", "chapter_detail"}, allEntries = true)
    public ChapterResponse createChapter(ChapterRequest request) {
        Chapter chapter = chapterMapper.toEntity(request);
        chapter.setUpdatedAt(LocalDateTime.now());

        Chapter savedChapter = chapterRepository.save(chapter);

        if (request.getStorySlug() != null) {
            storyRepository.findBySlug(request.getStorySlug()).ifPresent(story -> {
                String chName = request.getChapterName() != null ? request.getChapterName() : "1";
                story.setLatestChapter("Ch. " + chName);
                story.setTotalChapters((int) chapterRepository.countByStorySlug(request.getStorySlug()));
                story.setUpdateAt(LocalDateTime.now());
                storyRepository.save(story);
            });
        }

        return chapterMapper.toResponse(savedChapter);
    }

    @Override
    public List<ChapterResponse> getChaptersByStorySlug(String storySlug) {
        List<Chapter> chapters = chapterRepository.findByStorySlug(storySlug);

        // Auto-sync story's latestChapter & totalChapters with actual chapter count
        if (!chapters.isEmpty()) {
            final List<Chapter> finalChapters = chapters;
            storyRepository.findBySlug(storySlug).ifPresent(story -> {
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

    private String fetchJson(String url) {
        // 1. Fast Direct Fetch (1.5s connect timeout) - Instant success when VPN is ON
        try {
            SimpleClientHttpRequestFactory fastFactory = new SimpleClientHttpRequestFactory();
            fastFactory.setConnectTimeout(1500);
            fastFactory.setReadTimeout(4000);
            RestTemplate fastRestTemplate = new RestTemplate(fastFactory);

            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<String> response = fastRestTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            if (response.getBody() != null && response.getStatusCode().is2xxSuccessful()) {
                return response.getBody();
            }
        } catch (Exception e) {
            log.warn("Direct fetch failed for {}, trying proxy fallback...", url);
        }

        // 2. Proxy Fallback 1: AllOrigins
        try {
            SimpleClientHttpRequestFactory proxyFactory = new SimpleClientHttpRequestFactory();
            proxyFactory.setConnectTimeout(3000);
            proxyFactory.setReadTimeout(5000);
            RestTemplate proxyRestTemplate = new RestTemplate(proxyFactory);

            String proxyUrl = "https://api.allorigins.win/raw?url=" + java.net.URLEncoder.encode(url, "UTF-8");
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<String> response = proxyRestTemplate.exchange(proxyUrl, HttpMethod.GET, entity, String.class);
            if (response.getBody() != null && response.getStatusCode().is2xxSuccessful()) {
                return response.getBody();
            }
        } catch (Exception ex) {
            log.warn("Proxy fallback 1 (allorigins) failed for {}: {}", url, ex.getMessage());
        }

        // 3. Proxy Fallback 2: Codetabs
        try {
            SimpleClientHttpRequestFactory proxyFactory = new SimpleClientHttpRequestFactory();
            proxyFactory.setConnectTimeout(3000);
            proxyFactory.setReadTimeout(5000);
            RestTemplate proxyRestTemplate = new RestTemplate(proxyFactory);

            String proxyUrl = "https://api.codetabs.com/v1/proxy?quest=" + java.net.URLEncoder.encode(url, "UTF-8");
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<String> response = proxyRestTemplate.exchange(proxyUrl, HttpMethod.GET, entity, String.class);
            if (response.getBody() != null && response.getStatusCode().is2xxSuccessful()) {
                return response.getBody();
            }
        } catch (Exception ex) {
            log.warn("Proxy fallback 2 (codetabs) failed for {}: {}", url, ex.getMessage());
        }

        return null;
    }

    @Override
    @Cacheable(value = "chapter_detail", key = "#storySlug + ':' + #chapterName", unless = "#result == null || #result.pages == null || #result.pages.isEmpty()")
    public ChapterResponse getChapterDetail(String storySlug, String chapterName) {
        // 1. First try exact match by storySlug & chapterName
        Optional<Chapter> chapterOpt = chapterRepository.findByStorySlugAndChapterName(storySlug, chapterName);

        // 2. If exact match fails, attempt flexible matching (e.g., "1" vs "1.0" or "01")
        if (chapterOpt.isEmpty()) {
            List<Chapter> chapters = chapterRepository.findByStorySlug(storySlug);
            if (!chapters.isEmpty()) {
                String targetTrim = chapterName.trim();
                for (Chapter c : chapters) {
                    if (c.getChapterName() == null) continue;
                    String cNameTrim = c.getChapterName().trim();
                    if (cNameTrim.equalsIgnoreCase(targetTrim)) {
                        chapterOpt = Optional.of(c);
                        break;
                    }
                    try {
                        float fTarget = Float.parseFloat(targetTrim);
                        float fChapter = Float.parseFloat(cNameTrim);
                        if (Math.abs(fTarget - fChapter) < 0.0001) {
                            chapterOpt = Optional.of(c);
                            break;
                        }
                    } catch (Exception ignored) {}
                }
            }
        }

        Chapter chapter;
        if (chapterOpt.isPresent()) {
            chapter = chapterOpt.get();
        } else {
            // Build a transient chapter response
            chapter = Chapter.builder()
                    .storySlug(storySlug)
                    .chapterName(chapterName)
                    .chapterTitle("Chương " + chapterName)
                    .pages(new ArrayList<>())
                    .updatedAt(LocalDateTime.now())
                    .build();

            // Try to resolve MangaDex chapter ID if story was imported from MangaDex
            try {
                Optional<Story> storyOpt = storyRepository.findBySlug(storySlug);
                if (storyOpt.isPresent() && storyOpt.get().getThumbUrl() != null && storyOpt.get().getThumbUrl().contains("mangadex.org/covers/")) {
                    String thumb = storyOpt.get().getThumbUrl();
                    String mangadexId = thumb.substring(thumb.indexOf("covers/") + 7).split("/")[0];
                    if (!mangadexId.isEmpty()) {
                        String feedUrl = "https://api.mangadex.org/manga/" + mangadexId + "/feed?translatedLanguage[]=en&translatedLanguage[]=vi&order[chapter]=asc&limit=300";
                        String jsonFeed = fetchJson(feedUrl);
                        if (jsonFeed != null) {
                            JsonNode feedRoot = objectMapper.readTree(jsonFeed);
                            JsonNode feedData = feedRoot.path("data");
                            if (feedData.isArray()) {
                                for (JsonNode chItem : feedData) {
                                    String chNum = chItem.path("attributes").path("chapter").asText("");
                                    try {
                                        if (Math.abs(Float.parseFloat(chNum) - Float.parseFloat(chapterName)) < 0.0001) {
                                            String chId = chItem.path("id").asText();
                                            String chTitle = chItem.path("attributes").path("title").asText("Chapter " + chNum);
                                            chapter.setChapterTitle(chTitle);
                                            chapter.setChapterApiUrl("https://api.mangadex.org/at-home/server/" + chId);
                                            break;
                                        }
                                    } catch (Exception ignored) {}
                                }
                            }
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Lỗi tự động tìm MangaDex chapter API URL cho {}/ch {}: {}", storySlug, chapterName, e.getMessage());
            }
        }

        // Check if pages list is empty or contains fallback cover image URLs
        boolean containsCoverUrls = chapter.getPages() != null && chapter.getPages().stream()
                .anyMatch(url -> url != null && (
                        url.contains("cdn.myanimelist.net") ||
                        url.contains("uploads.mangadex.org/covers")
                ));

        boolean isPageListInvalid = (chapter.getImageUrls() == null || chapter.getImageUrls().isEmpty())
                || (chapter.getPages() == null || chapter.getPages().isEmpty())
                || containsCoverUrls;

        // Lazy fetch MangaDex images if page list is invalid but chapterApiUrl is present
        if (isPageListInvalid && chapter.getChapterApiUrl() != null && !chapter.getChapterApiUrl().isEmpty()) {
            try {
                String jsonAtHome = fetchJson(chapter.getChapterApiUrl());
                if (jsonAtHome != null) {
                    JsonNode homeRoot = objectMapper.readTree(jsonAtHome);
                    String baseUrl = homeRoot.path("baseUrl").asText("");
                    String hash = homeRoot.path("chapter").path("hash").asText("");
                    JsonNode pageFiles = homeRoot.path("chapter").path("data");
                    if (pageFiles.isArray() && !baseUrl.isEmpty() && !hash.isEmpty()) {
                        List<String> urls = new ArrayList<>();
                        for (JsonNode pageFile : pageFiles) {
                            urls.add(baseUrl + "/data/" + hash + "/" + pageFile.asText());
                        }
                        if (!urls.isEmpty()) {
                            chapter.setImageUrls(urls);
                            chapter.setPages(urls);
                            chapterRepository.save(chapter);
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Lỗi lazy load MangaDex chapter {}: {}", chapterName, e.getMessage());
            }
        }

        // Clean up fallback poster URL from pages if lazy fetch didn't replace it
        if (chapter.getPages() != null && chapter.getPages().stream().anyMatch(url -> url != null && (
                url.contains("cdn.myanimelist.net") ||
                url.contains("uploads.mangadex.org/covers")))) {
            chapter.setPages(new ArrayList<>());
            chapter.setImageUrls(new ArrayList<>());
        }

        // Synchronize imageUrls and pages
        if ((chapter.getPages() == null || chapter.getPages().isEmpty()) && chapter.getImageUrls() != null && !chapter.getImageUrls().isEmpty()) {
            chapter.setPages(chapter.getImageUrls());
        } else if ((chapter.getImageUrls() == null || chapter.getImageUrls().isEmpty()) && chapter.getPages() != null && !chapter.getPages().isEmpty()) {
            chapter.setImageUrls(chapter.getPages());
        }

        return chapterMapper.toResponse(chapter);
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
            chapter.setImageUrls(request.getPages());
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
