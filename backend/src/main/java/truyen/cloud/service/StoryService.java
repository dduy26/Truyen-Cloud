package truyen.cloud.service; 

import java.util.List;
import truyen.cloud.dtos.request.StoryRequest;
import truyen.cloud.dtos.response.StoryResponse;

public interface StoryService {
    StoryResponse createStory(StoryRequest request);
    StoryResponse getStoryBySlug(String slug);
    List<StoryResponse> getAllStories();
    StoryResponse updateStory(String id, StoryRequest request);
    void deleteStory(String id);
}
