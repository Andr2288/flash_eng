import { supabase } from "../vocabularyWords/supabase.js";

async function requireUserId() {
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error) {
        throw new Error(error.message);
    }
    if (!user?.id) {
        throw new Error("Потрібно увійти в акаунт");
    }
    return user.id;
}

function mapWordRowToFlashcard(row) {
    return {
        _id: row.id,
        text: row.text || "",
        transcription: row.transcription || "",
        translation: row.translation || "",
        shortDescription: row.short_description || "",
        explanation: row.explanation || "",
        notes: row.notes || "",
        examples: Array.isArray(row.examples) ? row.examples : [],
        isAIGenerated: !!row.is_ai_generated,
        createdAt: row.created_at || new Date().toISOString(),
        categoryId: row.flashcard_categories
            ? {
                  _id: row.flashcard_categories.id,
                  color: row.flashcard_categories.color,
                  name: row.flashcard_categories.name,
              }
            : null,
    };
}

async function fetchFlashcards(categoryId = null) {
    const userId = await requireUserId();
    let query = supabase
        .from("vocabulary_words")
        .select(
            "id, text, transcription, translation, short_description, explanation, notes, examples, is_ai_generated, created_at, category_id, flashcard_categories(id, name, color)"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (categoryId === "uncategorized") {
        query = query.is("category_id", null);
    } else if (categoryId) {
        query = query.eq("category_id", categoryId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data || []).map(mapWordRowToFlashcard);
}

async function createFlashcard(payload) {
    const userId = await requireUserId();
    const insertPayload = {
        user_id: userId,
        text: payload?.text?.trim() || "",
        transcription: payload?.transcription || "",
        translation: payload?.translation || "",
        short_description: payload?.shortDescription || "",
        explanation: payload?.explanation || "",
        notes: payload?.notes || "",
        examples: payload?.examples || [],
        is_ai_generated: !!payload?.isAIGenerated,
        category_id: payload?.categoryId || null,
    };

    const { data, error } = await supabase
        .from("vocabulary_words")
        .insert([insertPayload])
        .select(
            "id, text, transcription, translation, short_description, explanation, notes, examples, is_ai_generated, created_at, category_id, flashcard_categories(id, name, color)"
        )
        .single();

    if (error) throw new Error(error.message);
    return mapWordRowToFlashcard(data);
}

async function updateFlashcard(id, payload) {
    const updatePayload = {
        text: payload?.text,
        transcription: payload?.transcription,
        translation: payload?.translation,
        short_description: payload?.shortDescription,
        explanation: payload?.explanation,
        notes: payload?.notes,
        examples: payload?.examples,
        is_ai_generated: payload?.isAIGenerated,
        category_id: payload?.categoryId ?? null,
        updated_at: new Date().toISOString(),
    };

    Object.keys(updatePayload).forEach((key) => {
        if (updatePayload[key] === undefined) delete updatePayload[key];
    });

    const { data, error } = await supabase
        .from("vocabulary_words")
        .update(updatePayload)
        .eq("id", id)
        .select(
            "id, text, transcription, translation, short_description, explanation, notes, examples, is_ai_generated, created_at, category_id, flashcard_categories(id, name, color)"
        )
        .single();

    if (error) throw new Error(error.message);
    return mapWordRowToFlashcard(data);
}

async function deleteFlashcard(id) {
    const { error } = await supabase.from("vocabulary_words").delete().eq("id", id);
    if (error) throw new Error(error.message);
}

async function fetchCategories() {
    const userId = await requireUserId();
    const { data, error } = await supabase
        .from("flashcard_categories")
        .select("id, name, description, color, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map((row) => ({
        _id: row.id,
        name: row.name,
        description: row.description || "",
        color: row.color || "#3B82F6",
        createdAt: row.created_at,
    }));
}

async function createCategory(payload) {
    const userId = await requireUserId();
    const { data, error } = await supabase
        .from("flashcard_categories")
        .insert([
            {
                user_id: userId,
                name: payload?.name?.trim() || "Нова папка",
                description: payload?.description || "",
                color: payload?.color || "#3B82F6",
            },
        ])
        .select("id, name, description, color, created_at")
        .single();
    if (error) throw new Error(error.message);
    return {
        _id: data.id,
        name: data.name,
        description: data.description || "",
        color: data.color || "#3B82F6",
        createdAt: data.created_at,
    };
}

async function updateCategory(id, payload) {
    const { data, error } = await supabase
        .from("flashcard_categories")
        .update({
            name: payload?.name,
            description: payload?.description,
            color: payload?.color,
        })
        .eq("id", id)
        .select("id, name, description, color, created_at")
        .single();
    if (error) throw new Error(error.message);
    return {
        _id: data.id,
        name: data.name,
        description: data.description || "",
        color: data.color || "#3B82F6",
        createdAt: data.created_at,
    };
}

async function deleteCategory(id) {
    const { error } = await supabase.from("flashcard_categories").delete().eq("id", id);
    if (error) throw new Error(error.message);
}

async function fetchUserSettings(defaultSettings) {
    const userId = await requireUserId();
    const { data, error } = await supabase
        .from("user_settings")
        .select("settings")
        .eq("user_id", userId)
        .maybeSingle();
    if (error) throw new Error(error.message);
    return data?.settings || defaultSettings;
}

async function upsertUserSettings(settings) {
    const userId = await requireUserId();
    const { error } = await supabase.from("user_settings").upsert(
        {
            user_id: userId,
            settings,
            updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
    );
    if (error) throw new Error(error.message);
}

export {
    fetchFlashcards,
    createFlashcard,
    updateFlashcard,
    deleteFlashcard,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    fetchUserSettings,
    upsertUserSettings,
};
