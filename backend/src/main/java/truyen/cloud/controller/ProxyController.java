package truyen.cloud.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.net.URI;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@RestController
@RequestMapping("/api/v1/proxy-image")
@RequiredArgsConstructor
public class ProxyController {

    private final RestTemplate restTemplate = new RestTemplate();
    private final ConcurrentHashMap<String, byte[]> imageCache = new ConcurrentHashMap<>();

    @GetMapping
    public ResponseEntity<byte[]> proxyImage(@RequestParam("url") String imageUrl) {
        if (imageUrl == null || imageUrl.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        if (imageCache.containsKey(imageUrl)) {
            return ResponseEntity.ok()
                    .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                    .contentType(MediaType.IMAGE_JPEG)
                    .body(imageCache.get(imageUrl));
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            headers.set("Referer", "https://mangadex.org/");
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<byte[]> response = restTemplate.exchange(
                    URI.create(imageUrl),
                    HttpMethod.GET,
                    entity,
                    byte[].class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                byte[] body = response.getBody();
                if (imageCache.size() < 500) {
                    imageCache.put(imageUrl, body);
                }

                MediaType contentType = response.getHeaders().getContentType();
                if (contentType == null) {
                    contentType = MediaType.IMAGE_JPEG;
                }

                return ResponseEntity.ok()
                        .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                        .contentType(contentType)
                        .body(body);
            }
        } catch (Exception e) {
            log.warn("Direct proxy failed for URL: {}, trying fallback...", imageUrl);
        }

        try {
            String proxyUrl = "https://api.allorigins.win/raw?url=" + java.net.URLEncoder.encode(imageUrl, "UTF-8");
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<byte[]> proxyResp = restTemplate.exchange(URI.create(proxyUrl), HttpMethod.GET, entity, byte[].class);
            if (proxyResp.getStatusCode().is2xxSuccessful() && proxyResp.getBody() != null) {
                return ResponseEntity.ok()
                        .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                        .contentType(MediaType.IMAGE_JPEG)
                        .body(proxyResp.getBody());
            }
        } catch (Exception ex) {
            log.warn("Proxy fallback failed for URL: {} -> {}", imageUrl, ex.getMessage());
        }

        return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    }
}
