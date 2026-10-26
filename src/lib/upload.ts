import { supabase } from "@/integrations/supabase/client";

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

async function compress(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((res) => canvas.toBlob((b) => res(b ?? file), "image/jpeg", 0.85));
  } catch {
    return file;
  }
}

/** Uploads a photo and returns a long-lived link to it. */
export async function uploadImage(file: File): Promise<string> {
  const blob = await compress(file);
  const path = `${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from("product-images").upload(path, blob, { contentType: "image/jpeg" });
  if (error) throw error;
  const { data, error: e2 } = await supabase.storage.from("product-images").createSignedUrl(path, TEN_YEARS);
  if (e2 || !data) throw e2 ?? new Error("Could not get image link");
  return data.signedUrl;
}

export const nameFromFile = (f: File) =>
  f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/\b(img|dsc|image|photo)\s*\d*/gi, "").trim() || "New piece";
