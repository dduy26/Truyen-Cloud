package truyen.cloud.service;

public interface RedisTokenService {
    void saveRefreshToken(String username, String refreshToken, long durationMs);
    String getRefreshToken(String username);
    boolean validateRefreshToken(String username, String refreshToken);
    void deleteRefreshToken(String username);
}
