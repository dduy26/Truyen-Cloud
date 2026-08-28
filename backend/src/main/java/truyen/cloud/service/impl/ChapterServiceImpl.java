package truyen.cloud.service.impl;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

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
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Slf4j
@Service
public class ChapterServiceImpl implements ChapterService {
    private final ChapterRepository chapterRepository;
    private final StoryRepository storyRepository;
    private final ChapterMapper chapterMapper;

    public ChapterServiceImpl(ChapterRepository chapterRepository, StoryRepository storyRepository, ChapterMapper chapterMapper) {
        this.chapterRepository = chapterRepository;
        this.storyRepository = storyRepository;
        this.chapterMapper = chapterMapper;
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
            chapter = Chapter.builder()
                    .storySlug(storySlug)
                    .chapterName(chapterName)
                    .chapterTitle("Chương " + chapterName)
                    .pages(new ArrayList<>())
                    .updatedAt(LocalDateTime.now())
                    .build();
        }

        // Clean up temporary P2P mangadex.network URLs and replace with permanent uploads.mangadex.org
        if (chapter.getPages() != null) {
            List<String> cleaned = chapter.getPages().stream()
                    .filter(url -> url != null && !url.contains("cdn.myanimelist.net") && !url.contains("uploads.mangadex.org/covers"))
                    .map(url -> url.replaceAll("https://[a-zA-Z0-9.-]+\\.mangadex\\.network", "https://uploads.mangadex.org"))
                    .collect(Collectors.toList());
            chapter.setPages(cleaned);
            chapter.setImageUrls(cleaned);
            if (chapter.getId() != null) {
                chapterRepository.save(chapter);
            }
        }

        // On-demand fetch/repair if pages array is empty OR contains relative filenames missing http/https or containing spaces/old domains
        boolean hasInvalidUrls = chapter.getPages() == null || chapter.getPages().isEmpty() ||
                chapter.getPages().stream().anyMatch(url -> url == null || (!url.startsWith("http://") && !url.startsWith("https://")) || url.contains(" ") || url.contains(".mangadex.network"));

        if (hasInvalidUrls && chapter.getChapterApiUrl() != null && !chapter.getChapterApiUrl().isEmpty()) {
            try {
                RestTemplate rt = new RestTemplate();
                HttpHeaders headers = new HttpHeaders();
                headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
                HttpEntity<String> entity = new HttpEntity<>(headers);
                ResponseEntity<String> res = rt.exchange(chapter.getChapterApiUrl(), HttpMethod.GET, entity, String.class);
                if (res.getBody() != null) {
                    ObjectMapper mapper = new ObjectMapper();
                    JsonNode root = mapper.readTree(res.getBody());
                    String hash = root.path("chapter").path("hash").asText("");
                    JsonNode pageFiles = root.path("chapter").path("data");
                    boolean isDataSaver = false;
                    if (!pageFiles.isArray() || pageFiles.isEmpty()) {
                        pageFiles = root.path("chapter").path("dataSaver");
                        isDataSaver = true;
                    }
                    if (pageFiles.isArray() && !hash.isEmpty()) {
                        String prefix = "https://uploads.mangadex.org";
                        String pathPrefix = isDataSaver ? "/data-saver/" : "/data/";
                        List<String> livePages = new ArrayList<>();
                        for (JsonNode pf : pageFiles) {
                            String fName = pf.asText("");
                            if (!fName.isEmpty()) {
                                livePages.add(prefix + pathPrefix + hash + "/" + fName);
                            }
                        }
                        if (!livePages.isEmpty()) {
                            chapter.setPages(livePages);
                            chapter.setImageUrls(livePages);
                            if (chapter.getId() != null) {
                                chapterRepository.save(chapter);
                            }
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("On-demand fetch for chapter pages failed for {}: {}", chapter.getChapterApiUrl(), e.getMessage());
            }
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
