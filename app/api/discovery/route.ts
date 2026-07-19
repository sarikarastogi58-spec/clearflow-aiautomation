import { secret } from "../../../lib/secrets";

export async function POST(request: Request) {
  const { city, category = "restaurant", pageToken } = await request.json() as { city?: string; category?: string; pageToken?: string };
  if (!city) return Response.json({ error: "city is required" }, { status: 400 });
  const apiKey = secret("GOOGLE_PLACES_API_KEY");
  if (!apiKey) return Response.json({ error: "GOOGLE_PLACES_API_KEY is not configured", setupRequired: true }, { status: 503 });
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json", "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.primaryType,places.formattedAddress,places.rating,places.userRatingCount,places.websiteUri,places.nationalPhoneNumber,places.googleMapsUri,places.businessStatus,nextPageToken",
    },
    body: JSON.stringify({ textQuery: `${category} in ${city}`, pageToken, maxResultCount: 20, languageCode: "en", regionCode: "IN" }),
  });
  if (!response.ok) return Response.json({ error: `Places API returned ${response.status}`, detail: await response.text() }, { status: 502 });
  const data = await response.json() as { places?: Array<Record<string, unknown>>; nextPageToken?: string };
  const places = (data.places ?? []).filter((place) =>
    place.businessStatus !== "CLOSED_PERMANENTLY" && Number(place.rating ?? 0) >= 4,
  ).map((place) => ({
    placeId: place.id, name: (place.displayName as { text?: string })?.text ?? "Unknown",
    category: place.primaryType, address: place.formattedAddress, rating: place.rating,
    reviewCount: place.userRatingCount, websiteUrl: place.websiteUri ?? null,
    phone: place.nationalPhoneNumber ?? "", mapsUrl: place.googleMapsUri,
    sourceRefreshedAt: new Date().toISOString(), preferred: Number(place.userRatingCount ?? 0) >= 100,
  }));
  return Response.json({ places, nextPageToken: data.nextPageToken, storageNotice: "Refresh Google-sourced fields before reuse and follow Places attribution/storage terms." });
}
