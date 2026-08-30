package truyen.cloud.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
public class RateLimiterFilter extends OncePerRequestFilter {

    private final RedisTemplate<String, Object> redisTemplate;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        // Không áp dụng rate limit cho API proxy ảnh & file tĩnh để tránh nghẽn khi cuộn đọc chapter
        return path.startsWith("/api/v1/proxy-image")
                || path.startsWith("/api/proxy")
                || path.startsWith("/uploads")
                || path.startsWith("/static")
                || path.equals("/api/v1/health");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();

        if (path.startsWith("/api/v1/")) {
            String clientIp = getClientIp(request);
            boolean isAuthEndpoint = path.startsWith("/api/v1/auth/");
            // 30 req/phút với Auth API (chống brute force), 500 req/phút với các API đọc truyện / tìm kiếm / comment
            int maxAllowedRequests = isAuthEndpoint ? 30 : 500;
            String redisKey = "RATE_LIMIT:" + clientIp + ":" + (isAuthEndpoint ? "auth" : "api");

            Long requestCount = redisTemplate.opsForValue().increment(redisKey);
            if (requestCount != null && requestCount == 1) {
                redisTemplate.expire(redisKey, 60, TimeUnit.SECONDS);
            }

            if (requestCount != null && requestCount > maxAllowedRequests) {
                response.setStatus(429);
                response.setContentType("application/json;charset=UTF-8");
                response.getWriter().write("{\"message\":\"Bạn đã thao tác quá nhanh. Vui lòng thử lại sau 1 phút!\",\"status\":429}");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private String getClientIp(HttpServletRequest request) {
        String clientIp = request.getHeader("X-Forwarded-For");
        if (clientIp == null || clientIp.isBlank() || "unknown".equalsIgnoreCase(clientIp)) {
            return request.getRemoteAddr();
        }
        return clientIp.split(",")[0].trim();
    }
}
