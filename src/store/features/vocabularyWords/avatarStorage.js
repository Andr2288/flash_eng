import { supabase } from "./supabase.js";

const BUCKET = "avatars";

function objectPath(userId) {
    return `${userId}/avatar.jpg`;
}

/**
 * Завантажує data URL у Storage; у metadata зберігається лише public URL.
 */
export async function uploadProfileAvatarFromDataUrl(userId, dataUrl) {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const contentType =
        blob.type && blob.type.startsWith("image/")
            ? blob.type
            : "image/jpeg";
    const path = objectPath(userId);
    // Спочатку прибираємо старий об’єкт — повторний upload з upsert інколи падає під RLS.
    await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
        contentType,
        upsert: false,
    });
    if (error) {
        throw new Error(error.message);
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const base = data.publicUrl;
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}v=${Date.now()}`;
}

export async function deleteProfileAvatarObject(userId) {
    const path = objectPath(userId);
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) {
        const msg = (error.message || "").toLowerCase();
        const notFound =
            msg.includes("not found") ||
            msg.includes("does not exist") ||
            msg.includes("no rows") ||
            error.statusCode === 404 ||
            error.statusCode === "404";
        if (notFound) {
            return;
        }
        throw new Error(error.message);
    }
}
