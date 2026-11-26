import { supabase } from "./supabase";

export interface UploadedFile {
  url: string;
  name: string;
  size: number;
  type: string;
}

// Sube un archivo al bucket 'uploads' y devuelve la metadatos.
export async function uploadFile(file: File, prefix = "attachments"): Promise<UploadedFile | null> {
  const path = `${prefix}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("uploads").upload(path, file);
  if (error) {
    console.error("upload error", error);
    return null;
  }
  const { data } = supabase.storage.from("uploads").getPublicUrl(path);
  return { url: data.publicUrl, name: file.name, size: file.size, type: file.type };
}

// Sube un avatar al bucket 'avatars' (RLS: solo el usuario propio).
export async function uploadAvatar(file: File, userId: string): Promise<string | null> {
  const ext = file.name.split(".").pop() || "png";
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file);
  if (error) {
    console.error("avatar error", error);
    return null;
  }
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

// Formatea bytes a tamaño legible.
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isImage(type: string): boolean {
  return type.startsWith("image/");
}
