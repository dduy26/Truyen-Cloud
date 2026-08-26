package truyen.cloud.controller;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/v1/images")
public class ImageProxyController {

    private final RestTemplate restTemplate;

    // Pattern để nhận diện nested proxy URL (cả v1 lẫn v2)
    private static final Pattern PROXY_PARAM_PATTERN = Pattern.compile(".*/images/proxy\\?url=(.+)");

    public ImageProxyController() {
        org.springframework.http.client.SimpleClientHttpRequestFactory factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(10000);
        this.restTemplate = new RestTemplate(factory);
    }

    /**
     * Unwrap nested proxy URLs.
     * Ví dụ: nếu CuuTruyen trả về:
     *   https://cuutruyen.net/api/v1/images/proxy?url=https%3A%2F%2Fcdn.example.com%2Fimg.jpg
     * thì hàm này sẽ decode ra URL gốc: https://cdn.example.com/img.jpg
     */
    private String unwrapProxyUrl(String url) {
        if (url == null) return null;
        String current = url.trim();
        int maxIterations = 5;
        for (int i = 0; i < maxIterations; i++) {
            Matcher matcher = PROXY_PARAM_PATTERN.matcher(current);
            if (matcher.matches()) {
                String inner = matcher.group(1);
                try {
                    current = URLDecoder.decode(inner, StandardCharsets.UTF_8).trim();
                } catch (Exception e) {
                    break;
                }
            } else {
                break;
            }
        }
        return current;
    }

    @GetMapping("/proxy")
    public ResponseEntity<byte[]> proxyImage(@RequestParam("url") String encodedUrl) {
        if (encodedUrl == null || encodedUrl.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        try {
            // Bước 1: Decode URL được gửi vào
            String decodedUrl = URLDecoder.decode(encodedUrl, StandardCharsets.UTF_8).trim();

            // Bước 2: Unwrap nested proxy — CuuTruyen thường trả về URL đã qua proxy nội bộ của họ
            // VD: https://cuutruyen.net/api/v1/images/proxy?url=https%3A%2F%2Fcdn.example.com%2Fimg.jpg
            decodedUrl = unwrapProxyUrl(decodedUrl);

            // Bước 3: Nếu vẫn là relative path, thêm domain mặc định
            if (!decodedUrl.startsWith("http://") && !decodedUrl.startsWith("https://")) {
                decodedUrl = "https://cuutruyen.net/" + decodedUrl.replaceAll("^/+", "");
            }

            // Bước 4: Fix domain storage-ct.lrclib.net -> cuutruyen.net (giữ /file/cuutruyen/ để 200 OK)
            if (decodedUrl.contains("storage-ct.lrclib.net")) {
                decodedUrl = decodedUrl.replace("storage-ct.lrclib.net", "cuutruyen.net");
            }

            // Bước 5: Nếu là Unsplash hoặc data URI, redirect trực tiếp
            if (decodedUrl.contains("unsplash.com") || decodedUrl.startsWith("data:")) {
                return ResponseEntity.status(HttpStatus.FOUND)
                        .header(HttpHeaders.LOCATION, decodedUrl)
                        .build();
            }

            System.out.println("🖼️ [ImageProxy] Fetching: " + decodedUrl);

            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            headers.set("Accept", "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8");

            // Set Referer & Origin động theo host đích
            if (decodedUrl.contains("mangadex.org")) {
                headers.set("Referer", "https://mangadex.org/");
                headers.set("Origin", "https://mangadex.org");
            } else if (decodedUrl.contains("cuutruyen")) {
                headers.set("Referer", "https://cuutruyen.net/");
                headers.set("Origin", "https://cuutruyen.net");
            } else {
                try {
                    URI uri = URI.create(decodedUrl);
                    String host = uri.getHost();
                    if (host != null) {
                        headers.set("Referer", "https://" + host + "/");
                    }
                } catch (Exception ignored) {}
            }

            HttpEntity<Void> requestEntity = new HttpEntity<>(headers);
            ResponseEntity<byte[]> response = restTemplate.exchange(URI.create(decodedUrl), HttpMethod.GET, requestEntity, byte[].class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                HttpHeaders responseHeaders = new HttpHeaders();
                MediaType contentType = response.getHeaders().getContentType();
                if (contentType != null) {
                    responseHeaders.setContentType(contentType);
                } else {
                    responseHeaders.setContentType(MediaType.IMAGE_JPEG);
                }
                responseHeaders.setCacheControl(CacheControl.maxAge(86400, java.util.concurrent.TimeUnit.SECONDS).cachePublic());
                return new ResponseEntity<>(response.getBody(), responseHeaders, HttpStatus.OK);
            }

            System.err.println("⚠️ [ImageProxy] Remote server returned non-2xx for: " + decodedUrl
                    + " | status=" + response.getStatusCode());
        } catch (Exception e) {
            System.err.println("⚠️ [ImageProxy] Exception fetching URL: " + encodedUrl + " → " + e.getMessage());
        }

        // Trả về SVG Placeholder 200 OK khi fetch nguồn thất bại (thay vì 404 hay 302 Unsplash)
        String svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"400\" height=\"600\" viewBox=\"0 0 400 600\">" +
                "<rect width=\"400\" height=\"600\" rx=\"16\" fill=\"#1e293b\"/>" +
                "<circle cx=\"200\" cy=\"220\" r=\"70\" fill=\"#334155\"/>" +
                "<path d=\"M165 240 L235 240 L200 170 Z\" fill=\"#64748b\"/>" +
                "<text x=\"50%\" y=\"380\" font-family=\"sans-serif\" font-size=\"22\" font-weight=\"bold\" fill=\"#ffffff\" text-anchor=\"middle\">Truyện Đang Cập Nhật</text>" +
                "<text x=\"50%\" y=\"420\" font-family=\"sans-serif\" font-size=\"14\" fill=\"#94a3b8\" text-anchor=\"middle\">TruyenCloud Proxy Fallback</text>" +
                "</svg>";
        HttpHeaders fallbackHeaders = new HttpHeaders();
        fallbackHeaders.setContentType(MediaType.parseMediaType("image/svg+xml"));
        fallbackHeaders.setCacheControl(CacheControl.maxAge(3600, java.util.concurrent.TimeUnit.SECONDS).cachePublic());
        return new ResponseEntity<>(svg.getBytes(StandardCharsets.UTF_8), fallbackHeaders, HttpStatus.OK);
    }
}
