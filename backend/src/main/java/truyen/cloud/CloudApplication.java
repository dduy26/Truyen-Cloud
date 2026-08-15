package truyen.cloud;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

import io.github.cdimascio.dotenv.Dotenv;

@SpringBootApplication
@EnableScheduling
@EnableAsync
public class CloudApplication {

    @jakarta.annotation.PostConstruct
    public void init() {
        java.util.TimeZone.setDefault(java.util.TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
    }

	public static void main(String[] args) {
		java.util.TimeZone.setDefault(java.util.TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));

		autoCopyEnvIfMissing();

		Dotenv dotenv = Dotenv.configure().ignoreIfMissing().load();
		dotenv.entries().forEach(entry -> {
			if (System.getProperty(entry.getKey()) == null) {
				System.setProperty(entry.getKey(), entry.getValue());
			}
		});

		if (dotenv.entries().isEmpty()) {
			Dotenv exampleDotenv = Dotenv.configure().filename(".env.example").ignoreIfMissing().load();
			exampleDotenv.entries().forEach(entry -> {
				if (System.getProperty(entry.getKey()) == null) {
					System.setProperty(entry.getKey(), entry.getValue());
				}
			});
		}

		SpringApplication.run(CloudApplication.class, args);
	}

	private static void autoCopyEnvIfMissing() {
		String[] paths = {".", "backend"};
		for (String basePath : paths) {
			java.io.File envFile = new java.io.File(basePath, ".env");
			java.io.File exampleFile = new java.io.File(basePath, ".env.example");
			if (!envFile.exists() && exampleFile.exists()) {
				try {
					java.nio.file.Files.copy(exampleFile.toPath(), envFile.toPath());
					System.out.println(">>> Tự động tạo file [.env] từ [.env.example] tại: " + envFile.getAbsolutePath());
				} catch (Exception e) {
					System.err.println(">>> Không thể copy .env.example: " + e.getMessage());
				}
			}
		}
	}

}

