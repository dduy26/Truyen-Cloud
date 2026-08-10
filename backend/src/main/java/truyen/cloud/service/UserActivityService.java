package truyen.cloud.service;

import truyen.cloud.dtos.request.BookmarkRequest;
import truyen.cloud.dtos.request.HistoryRequest;
import truyen.cloud.dtos.response.UserActivityResponse;

public interface UserActivityService {
    UserActivityResponse getUserActivity(String userId);
    UserActivityResponse toggleBookmark(String userId, BookmarkRequest request);
    UserActivityResponse saveHistory(String userId, HistoryRequest request);
    UserActivityResponse removeHistory(String userId, String storySlug);
}
