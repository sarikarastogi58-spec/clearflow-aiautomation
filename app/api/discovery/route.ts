import { resolveSecret } from "../../../lib/secrets";

type DiscoveryRequest = {
  city?: string;
  category?: string;
  maxResults?: number;
  minRating?: number;
  minReviews?: number;
  websiteFilter?: "any" | "missing";
};

type ApifyPlace = Record<string, unknown> & {
  placeId?: string;
  title?: string;
  categoryName?: string;
  address?: string;
  phone?: string;
  phoneUnformatted?: string;
  website?: string;
  url?: string;
  totalScore?: number;
  reviewsCount?: number;
  permanentlyClosed?: boolean;
  temporarilyClosed?: boolean;
};

const bigChains = [
  "mcdonald", "starbucks", "domino", "pizza hut", "subway", "kfc", "burger king",
  "barbeque nation", "haldiram", "bikanervala", "cafe coffee day", "wow momo",
];

function cleanNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function POST(request: Request) {
  const input = await request.json() as DiscoveryRequest;
  const city = input.city?.trim();
  const category = input.category?.trim() || "restaurant";
  if (!city) return Response.json({ error: "city is required" }, { status: 400 });

  const token = await resolveSecret("APIFY_API_TOKEN");
  if (!token) return Response.json({ error: "APIFY_API_TOKEN is not configured", setupRequired: true }, { status: 503 });

  const actorId = ((await resolveSecret("APIFY_ACTOR_ID"))?.trim() || "compass~crawler-google-places").replace("/", "~");
  const maxResults = Math.min(100, Math.max(1, cleanNumber(input.maxResults, 25)));
  const minRating = Math.min(5, Math.max(0, cleanNumber(input.minRating, 4)));
  const minReviews = Math.max(0, cleanNumber(input.minReviews, 100));

  const response = await fetch(`https://api.apify.com/v2/actors/${encodeURIComponent(actorId)}/run-sync-get-dataset-items?timeout=180&memory=1024&clean=true`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      searchStringsArray: [category],
      locationQuery: `${city}, India`,
      maxCrawledPlacesPerSearch: maxResults,
      language: "en",
      scrapePlaceDetailPage: false,
      scrapeReviewsPersonalData: false,
      scrapeImageAuthors: false,
    }),
  });

  if (!response.ok) {
    let detail = `Apify returned ${response.status}`;
    try {
      const data = await response.json() as { error?: { message?: string } };
      detail = data.error?.message ?? detail;
    } catch { /* Apify did not return JSON. */ }
    return Response.json({ error: detail }, { status: 502 });
  }

  const data = await response.json() as ApifyPlace[];
  const sourceRefreshedAt = new Date().toISOString();
  const places = (Array.isArray(data) ? data : [])
    .filter((place) => !place.permanentlyClosed && !place.temporarilyClosed)
    .filter((place) => cleanNumber(place.totalScore, 0) >= minRating)
    .filter((place) => cleanNumber(place.reviewsCount, 0) >= minReviews)
    .filter((place) => input.websiteFilter !== "missing" || !String(place.website ?? "").trim())
    .filter((place) => !bigChains.some((chain) => String(place.title ?? "").toLowerCase().includes(chain)))
    .slice(0, maxResults)
    .map((place) => ({
      placeId: String(place.placeId ?? place.url ?? ""),
      name: String(place.title ?? "Unknown business"),
      category: String(place.categoryName ?? category),
      city,
      address: String(place.address ?? ""),
      rating: cleanNumber(place.totalScore, 0),
      reviewCount: cleanNumber(place.reviewsCount, 0),
      websiteUrl: String(place.website ?? "").trim() || null,
      websiteStatus: place.website ? "weak" : "none",
      phone: String(place.phone ?? place.phoneUnformatted ?? ""),
      mapsUrl: String(place.url ?? ""),
      source: "apify",
      sourceRefreshedAt,
      preferred: cleanNumber(place.reviewsCount, 0) >= 100,
    }));

  return Response.json({
    places,
    source: "apify",
    actorId,
    storageNotice: "Use listing data lawfully, respect source terms, and verify contact details before outreach. Public contact data is not marketing consent.",
  });
}
