package truyen.cloud.service.impl;

import truyen.cloud.dtos.request.StoryRequest;
import truyen.cloud.dtos.response.StoryResponse;
import truyen.cloud.exception.ResourceNotFoundException;
import truyen.cloud.mapper.StoryMapper;
import truyen.cloud.model.Story;
import truyen.cloud.repository.StoryRepository;
import truyen.cloud.service.StoryService;
import truyen.cloud.util.SlugUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

import truyen.cloud.model.Chapter;
import truyen.cloud.repository.ChapterRepository;

@Service
@RequiredArgsConstructor
public class StoryServiceImpl implements StoryService {
    private final StoryRepository storyRepository;
    private final ChapterRepository chapterRepository;
    private final StoryMapper storyMapper; 

    @Override
    @CacheEvict(value = {"stories_detail", "stories_list", "chapter_detail"}, allEntries = true)
    public StoryResponse createStory(StoryRequest request) {
        Story story = storyMapper.toEntity(request);

        story.setSlug(SlugUtil.toSlug(request.getName()));
        story.setViewCount(0);
        story.setCreatedAt(LocalDateTime.now());
        story.setUpdateAt(LocalDateTime.now());

        Story savedStory = storyRepository.save(story);
        return storyMapper.toResponse(savedStory);
    }

    @Override
    @Cacheable(value = "stories_detail", key = "#slug")
    public StoryResponse getStoryBySlug(String slug) {
        Story story = storyRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy truyện với slug: " + slug));

        fixLatestChapterIfInaccurate(story);
        story.setViewCount(story.getViewCount() + 1);
        storyRepository.save(story);

        return storyMapper.toResponse(story);
    }

    @Override
    @Cacheable(value = "stories_list")
    public List<StoryResponse> getAllStories() {
        List<Story> stories = storyRepository.findAll();
        return storyMapper.toResponseList(stories);
    }

    private void fixLatestChapterIfInaccurate(Story story) {
        if (story.getSlug() == null) return;
        List<Chapter> chapters = chapterRepository.findByStorySlug(story.getSlug());
        if (!chapters.isEmpty()) {
            double maxCh = -1.0;
            String highestChName = "1";
            for (Chapter c : chapters) {
                String cName = c.getChapterName() != null ? c.getChapterName() : "1";
                try {
                    double p = Double.parseDouble(cName.replaceAll("[^0-9.]", ""));
                    if (p > maxCh) {
                        maxCh = p;
                        highestChName = cName;
                    }
                } catch (Exception ignored) {}
            }
            String calcLatest = "Ch. " + highestChName;
            int calcTotal = chapters.size();
            if (!calcLatest.equals(story.getLatestChapter()) || story.getTotalChapters() != calcTotal) {
                story.setLatestChapter(calcLatest);
                story.setTotalChapters(calcTotal);
                storyRepository.save(story);
            }
        }
    }

    @Override
    @CacheEvict(value = {"stories_detail", "stories_list", "chapter_detail"}, allEntries = true)
    public StoryResponse updateStory(String id, StoryRequest request) {
        Story story = storyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy truyện với id: " + id));

        story.setName(request.getName());
        story.setSlug(SlugUtil.toSlug(request.getName()));
        story.setOriginName(request.getOriginName());
        story.setThumbUrl(request.getThumbUrl());
        story.setAuthor(request.getAuthor());
        story.setCategories(request.getCategories());
        story.setStatus(request.getStatus());
        story.setSummary(request.getSummary());
        story.setPublic(request.isPublic());
        story.setUpdateAt(LocalDateTime.now());

        Story updatedStory = storyRepository.save(story);
        return storyMapper.toResponse(updatedStory);
    }

    @Override
    @CacheEvict(value = {"stories_detail", "stories_list", "chapter_detail"}, allEntries = true)
    public void deleteStory(String id) {
        if (!storyRepository.existsById(id)) {
            throw new ResourceNotFoundException("Không tìm thấy truyện để xóa với id: " + id);
        }
        storyRepository.deleteById(id);
    }
}