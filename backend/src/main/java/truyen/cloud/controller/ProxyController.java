package truyen.cloud.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

@Slf4j
@RestController
@RequestMapping({"/api/v1/proxy-image", "/api/proxy/image"})
public class ProxyController {

    private final RestTemplate restTemplate = new RestTemplate();

    @GetMapping
    public ResponseEntity<byte[]> proxyImage(@RequestParam("url") String imageUrl) {
        if (imageUrl == null || imageUrl.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        String targetUrl = imageUrl.trim();
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "TruyenCloud/1.0 (contact@truyencloud.com)");
            headers.set("Referer", "https://mangadex.org");
            headers.set("Accept", "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8");
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            // Attempt 1: Fetch from target URL
            try {
                ResponseEntity<byte[]> response = restTemplate.exchange(targetUrl, HttpMethod.GET, entity, byte[].class);
                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    MediaType mediaType = response.getHeaders().getContentType();
                    if (mediaType == null) {
                        if (targetUrl.endsWith(".png")) mediaType = MediaType.IMAGE_PNG;
                        else if (targetUrl.endsWith(".webp")) mediaType = MediaType.parseMediaType("image/webp");
                        else mediaType = MediaType.IMAGE_JPEG;
                    }
                    return ResponseEntity.ok()
                            .contentType(mediaType)
                            .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400, s-maxage=604800")
                            .body(response.getBody());
                }
            } catch (Exception e) {
                log.warn("Proxy attempt 1 failed for {}: {}", targetUrl, e.getMessage());
            }

            // Attempt 2 (Auto-repair 404): If original URL has /data/, retry with /data-saver/
            if (targetUrl.contains("/data/")) {
                String saverUrl = targetUrl.replace("/data/", "/data-saver/");
                try {
                    ResponseEntity<byte[]> saverRes = restTemplate.exchange(saverUrl, HttpMethod.GET, entity, byte[].class);
                    if (saverRes.getStatusCode().is2xxSuccessful() && saverRes.getBody() != null) {
                        return ResponseEntity.ok()
                                .contentType(MediaType.IMAGE_JPEG)
                                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400, s-maxage=604800")
                                .body(saverRes.getBody());
                    }
                } catch (Exception e) {
                    log.warn("Proxy attempt 2 (data-saver) failed for {}: {}", saverUrl, e.getMessage());
                }
            }
        } catch (Exception e) {
            log.error("Proxy image unhandled error for {}: {}", imageUrl, e.getMessage());
        }

        return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    }
}

