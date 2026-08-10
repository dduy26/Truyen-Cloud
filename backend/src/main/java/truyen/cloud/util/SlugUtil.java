package truyen.cloud.util;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

public class SlugUtil {
    private static final Pattern NONLATIN = Pattern.compile("[^\\w-]");
    private static final Pattern WHITESPACE = Pattern.compile("[\\s]");
    private static final Pattern EDGES = Pattern.compile("(^-|-$)");

    public static String toSlug(String input) {
        if (input == null || input.isEmpty()) {
            return "";
        }

        // Chuyển chữ Đ -> D, đ -> d
        String nowhitespace = input.replace("Đ", "D").replace("đ", "d");
        
        // Loại bỏ dấu tiếng Việt (VD: á -> a, ầ -> a)
        String normalized = Normalizer.normalize(nowhitespace, Normalizer.Form.NFD);
        String nosign = Pattern.compile("\\p{InCombiningDiacriticalMarks}+").matcher(normalized).replaceAll("");

        String noWords = WHITESPACE.matcher(nosign).replaceAll("-");
        String slug = NONLATIN.matcher(noWords).replaceAll("");
        slug = EDGES.matcher(slug).replaceAll("");

        return slug.toLowerCase(Locale.ENGLISH);
    }
}