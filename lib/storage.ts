import { supabase } from "@/lib/supabase";
import { STORAGE } from "@/lib/constants";

function isStoragePath(url: string | null): url is string {
  return !!url && !url.startsWith("http");
}

export async function resolvePhotoUrl(photoUrl: string | null): Promise<string | null> {
  if (!isStoragePath(photoUrl)) return photoUrl;
  const { data } = await supabase.storage
    .from(STORAGE.BUCKET)
    .createSignedUrl(photoUrl, STORAGE.SIGNED_URL_EXPIRY);
  return data?.signedUrl ?? null;
}

export async function resolvePhotoUrls(
  entries: { date: string; photo_url: string | null }[]
): Promise<Map<string, { photo_url: string | null }>> {
  const map = new Map<string, { photo_url: string | null }>();
  const paths = entries.filter((e) => isStoragePath(e.photo_url)).map((e) => e.photo_url!);

  const signedMap = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed } = await supabase.storage
      .from(STORAGE.BUCKET)
      .createSignedUrls(paths, STORAGE.SIGNED_URL_EXPIRY);
    signed?.forEach((s) => {
      if (s.signedUrl) signedMap.set(s.path!, s.signedUrl);
    });
  }

  entries.forEach((e) => {
    const url = isStoragePath(e.photo_url)
      ? signedMap.get(e.photo_url) ?? null
      : e.photo_url;
    map.set(e.date, { photo_url: url });
  });

  return map;
}
