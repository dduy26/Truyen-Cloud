package truyen.cloud.service.impl;

import truyen.cloud.dtos.request.BookmarkRequest;
import truyen.cloud.dtos.request.HistoryRequest;
import truyen.cloud.dtos.response.UserActivityResponse;
import truyen.cloud.mapper.UserActivityMapper;
import truyen.cloud.model.UserActivity;
import truyen.cloud.repository.UserActivityRepository;
import truyen.cloud.service.UserActivityService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;

@Service
@RequiredArgsConstructor
public class UserActivityServiceImpl implements UserActivityService {
    private final UserActivityRepository activityRepository;
    private final UserActivityMapper activityMapper;

    private UserActivity getOrCreateActivity(String userId) {
        return activityRepository.findByUserId(userId)
                .orElseGet(() -> {
                    UserActivity newActivity = UserActivity.builder()
                            .userId(userId)
                            .bookmarks(new ArrayList<>())
                            .history(new ArrayList<>())
                            .build();
                    return activityRepository.save(newActivity);
                });
    }

    @Override
    public UserActivityResponse getUserActivity(String userId) {
        UserActivity activity = getOrCreateActivity(userId);
        return activityMapper.toResponse(activity);
    }

    @Override
    public UserActivityResponse toggleBookmark(String userId, BookmarkRequest request) {
        UserActivity activity = getOrCreateActivity(userId);

        if (activity.getBookmarks() == null) {
            activity.setBookmarks(new ArrayList<>());
        }

        String storySlug = request.getStorySlug();
        
        // Logic Toggle: Có rồi thì xóa (hủy lưu), chưa có thì thêm vào
        if (activity.getBookmarks().contains(storySlug)) {
            activity.getBookmarks().remove(storySlug);
        } else {
            activity.getBookmarks().add(storySlug);
        }

        UserActivity saved = activityRepository.save(activity);
        return activityMapper.toResponse(saved);
    }

    @Override
    public UserActivityResponse saveHistory(String userId, HistoryRequest request) {
        UserActivity activity = getOrCreateActivity(userId);

        if (activity.getHistory() == null) {
            activity.setHistory(new ArrayList<>());
        }

        // Kiểm tra xem truyện này đã có trong lịch sử đọc chưa
        activity.getHistory().removeIf(item -> item.getStorySlug().equals(request.getStorySlug()));

        // Tạo item lịch sử mới và đẩy lên đầu danh sách (mới đọc gần đây nhất)
        UserActivity.HistoryItem newItem = new UserActivity.HistoryItem(
                request.getStorySlug(),
                request.getLastChapterName(),
                LocalDateTime.now()
        );

        activity.getHistory().add(0, newItem); 

        UserActivity saved = activityRepository.save(activity);
        return activityMapper.toResponse(saved);
    }

    @Override
    public UserActivityResponse removeHistory(String userId, String storySlug) {
        UserActivity activity = getOrCreateActivity(userId);

        if (activity.getHistory() != null) {
            activity.getHistory().removeIf(item -> item.getStorySlug().equals(storySlug));
            activityRepository.save(activity);
        }

        return activityMapper.toResponse(activity);
    }
}
