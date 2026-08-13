package truyen.cloud.service.impl;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;


import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import truyen.cloud.dtos.request.ChapterRequest;
import truyen.cloud.dtos.response.ChapterResponse;
import truyen.cloud.exception.ResourceNotFoundException;
import truyen.cloud.mapper.ChapterMapper;
import truyen.cloud.model.Chapter;
import truyen.cloud.repository.ChapterRepository;
import truyen.cloud.repository.StoryRepository;
import truyen.cloud.service.ChapterService;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class ChapterServiceImpl implements ChapterService{
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
        factory.setConnectTimeout(3000);
        factory.setReadTimeout(5000);
        this.restTemplate = new RestTemplate(factory);
    }

    @Override
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
        if (chapters.isEmpty()) {
            chapters = fetchAndPopulateChaptersOnDemand(storySlug);
        }
        
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
    public ChapterResponse getChapterDetail(String storySlug, String chapterName) {
        Optional<Chapter> chapterOpt = chapterRepository.findByStorySlugAndChapterName(storySlug, chapterName);
        Chapter chapter = null;

        if (chapterOpt.isPresent()) {
            chapter = chapterOpt.get();
        } else {
            List<Chapter> populated = fetchAndPopulateChaptersOnDemand(storySlug);
            chapter = populated.stream()
                    .filter(c -> chapterName.equalsIgnoreCase(c.getChapterName()))
                    .findFirst()
                    .orElse(null);
        }

        if (chapter == null) {
            throw new ResourceNotFoundException("Không tìm thấy chương " + chapterName + " của truyện: " + storySlug);
        }

        boolean needsRealPages = chapter.getPages() == null || chapter.getPages().isEmpty()
                || chapter.getPages().stream().anyMatch(p -> p != null && p.contains("unsplash.com"));

        if (needsRealPages) {
            String apiDataUrl = chapter.getChapterApiUrl();
            if (apiDataUrl == null || apiDataUrl.isEmpty()) {
                try {
                    String url = "https://otruyenapi.com/v1/api/truyen-tranh/" + storySlug;
                    HttpHeaders headers = new HttpHeaders();
                    headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
                    HttpEntity<String> entity = new HttpEntity<>(headers);
                    ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
                    if (response.getBody() != null) {
                        JsonNode root = objectMapper.readTree(response.getBody());
                        JsonNode chaptersNode = root.path("data").path("item").path("chapters");
                        if (chaptersNode.isArray() && chaptersNode.size() > 0) {
                            JsonNode serverData = chaptersNode.get(0).path("server_data");
                            if (serverData.isArray()) {
                                for (JsonNode chNode : serverData) {
                                    if (chapterName.equalsIgnoreCase(chNode.path("chapter_name").asText())) {
                                        apiDataUrl = chNode.path("chapter_api_data").asText();
                                        chapter.setChapterApiUrl(apiDataUrl);
                                        break;
                                    }
                                }
                            }
                        }
                    }
                } catch (Exception ignored) {}
            }

            if (apiDataUrl != null && !apiDataUrl.isEmpty()) {
                try {
                    List<String> fetchedPages = fetchChapterPagesFromApi(apiDataUrl);
                    if (!fetchedPages.isEmpty()) {
                        chapter.setPages(fetchedPages);
                        chapterRepository.save(chapter);
                    }
                } catch (Exception e) {
                    System.err.println("Lỗi Lazy Fetching ảnh chapter " + chapterName + " cho " + storySlug + ": " + e.getMessage());
                }
            }
        }

        return chapterMapper.toResponse(chapter);
    }

    private List<Chapter> fetchAndPopulateChaptersOnDemand(String storySlug) {
        List<Chapter> chaptersSaved = new ArrayList<>();
        try {
            String url = "https://otruyenapi.com/v1/api/truyen-tranh/" + storySlug;
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            String jsonResponse = response.getBody();
            if (jsonResponse != null) {
                JsonNode rootNode = objectMapper.readTree(jsonResponse);
                JsonNode itemNode = rootNode.path("data").path("item");
                JsonNode chaptersNode = itemNode.path("chapters");
                if (chaptersNode.isArray() && chaptersNode.size() > 0) {
                    JsonNode serverData = chaptersNode.get(0).path("server_data");
                    if (serverData.isArray()) {
                        for (int i = 0; i < serverData.size(); i++) {
                            JsonNode chNode = serverData.get(i);
                            String chName = chNode.path("chapter_name").asText();
                            String chTitle = chNode.path("chapter_title").asText("Chapter " + chName);
                            String chapterApiUrl = chNode.path("chapter_api_data").asText();

                            Optional<Chapter> existingCh = chapterRepository.findByStorySlugAndChapterName(storySlug, chName);
                            Chapter chapterEntity = existingCh.orElseGet(() -> Chapter.builder()
                                    .storySlug(storySlug)
                                    .chapterName(chName)
                                    .updatedAt(LocalDateTime.now())
                                    .build());

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
            System.err.println("Lỗi khi nạp tự động chapters cho " + storySlug + ": " + e.getMessage());
        }
        return chaptersSaved.isEmpty() ? chapterRepository.findByStorySlug(storySlug) : chaptersSaved;
    }

    private List<String> fetchChapterPagesFromApi(String chapterApiUrl) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<String> response = restTemplate.exchange(chapterApiUrl, HttpMethod.GET, entity, String.class);
            String jsonResponse = response.getBody();
            if (jsonResponse != null) {
                JsonNode chRootNode = objectMapper.readTree(jsonResponse);
                JsonNode chItemNode = chRootNode.path("data").path("item");
                String domainCdn = chRootNode.path("data").path("domain_cdn").asText("https://sv1.otruyencdn.com");
                String chapterPath = chItemNode.path("chapter_path").asText();

                List<String> pageUrls = new ArrayList<>();
                JsonNode imagesNode = chItemNode.path("chapter_image");
                if (imagesNode.isArray()) {
                    for (JsonNode imgNode : imagesNode) {
                        String imgFile = imgNode.path("image_file").asText();
                        if (!imgFile.isEmpty()) {
                            pageUrls.add(domainCdn + "/" + chapterPath + "/" + imgFile);
                        }
                    }
                }
                return pageUrls;
            }
        } catch (Exception e) {
            System.err.println("Lỗi khi fetch ảnh chapter API: " + e.getMessage());
        }
        return new ArrayList<>();
    }

    @Override
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
    public void deleteChapter(String id) {
        if (!chapterRepository.existsById(id)) {
            throw new ResourceNotFoundException("Không tìm thấy chương để xóa với id: " + id);
        }
        chapterRepository.deleteById(id);
    }
}
