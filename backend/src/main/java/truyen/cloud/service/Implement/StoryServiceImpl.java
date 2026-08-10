package truyen.cloud.service.Implement;

import truyen.cloud.dtos.Request.StoryRequest;
import truyen.cloud.dtos.Response.StoryResponse;
import truyen.cloud.mapper.StoryMapper;
import truyen.cloud.model.Story;
import truyen.cloud.repository.StoryRepository;
import truyen.cloud.service.StoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Date; // Sử dụng java.util.Date
import java.util.List;

@Service
@RequiredArgsConstructor
public class StoryServiceImpl implements StoryService {
    private final StoryRepository storyRepository;
    private final ChapterRepository chapterRepository;
    private final StoryMapper storyMapper; 

    @Override
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
    public StoryResponse getStoryBySlug(String slug) {
        Story story = storyRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy truyện với slug: " + slug));

        fixLatestChapterIfInaccurate(story);
        story.setViewCount(story.getViewCount() + 1);
        storyRepository.save(story);

        return storyMapper.toResponse(story);
    }

    @Override
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
    public void deleteStory(String id) {
        if (!storyRepository.existsById(id)) {
            throw new ResourceNotFoundException("Không tìm thấy truyện để xóa với id: " + id);
        }
        storyRepository.deleteById(id);
    }
}