package truyen.cloud.service.impl;

import truyen.cloud.service.RedisTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class RedisTokenServiceImpl implements RedisTokenService {

    private final RedisTemplate<String, Object> redisTemplate;
    private static final String KEY_PREFIX = "RT:";

    @Override
    public void saveRefreshToken(String username, String refreshToken, long durationMs) {
        String key = KEY_PREFIX + username;
        redisTemplate.opsForValue().set(key, refreshToken, durationMs, TimeUnit.MILLISECONDS);
    }

    @Override
    public String getRefreshToken(String username) {
        String key = KEY_PREFIX + username;
        Object val = redisTemplate.opsForValue().get(key);
        return val != null ? val.toString() : null;
    }

    @Override
    public boolean validateRefreshToken(String username, String refreshToken) {
        if (username == null || refreshToken == null) return false;
        String storedToken = getRefreshToken(username);
        return refreshToken.equals(storedToken);
    }

    @Override
    public void deleteRefreshToken(String username) {
        String key = KEY_PREFIX + username;
        redisTemplate.delete(key);
    }
}
