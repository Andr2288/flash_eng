const UNSPLASH_ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;

async function fetchUnsplashImageUrls(query, options = {}) {
    const normalizedQuery = String(query || "").trim();
    if (!normalizedQuery || !UNSPLASH_ACCESS_KEY) {
        return [];
    }

    const perPage = Math.min(Math.max(options.count || 5, 1), 10);
    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", normalizedQuery);
    url.searchParams.set("per_page", String(perPage));
    url.searchParams.set("orientation", "landscape");
    url.searchParams.set("content_filter", "high");

    try {
        const response = await fetch(url.toString(), {
            headers: {
                Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
                "Accept-Version": "v1",
            },
        });

        if (!response.ok) {
            return [];
        }

        const payload = await response.json();
        const results = Array.isArray(payload?.results) ? payload.results : [];

        const unique = new Set();
        for (const item of results) {
            const imageUrl = item?.urls?.regular || item?.urls?.small || "";
            if (imageUrl) {
                unique.add(imageUrl);
            }
        }

        return Array.from(unique);
    } catch {
        return [];
    }
}

export { fetchUnsplashImageUrls };
