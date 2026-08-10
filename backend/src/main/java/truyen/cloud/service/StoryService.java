package truyen.cloud.service; // Giữ đúng package thư mục hiện tại của bạn

import java.util.List;
import truyen.cloud.dtos.Request.StoryRequest;
import truyen.cloud.dtos.Response.StoryResponse;

public interface StoryService {
    StoryResponse createStory(StoryRequest request);
    StoryResponse getStoryBySlug(String slug);
    List<StoryResponse> getAllStories();
    StoryResponse updateStory(String id, StoryRequest request);
    void deleteStory(String id);
}
