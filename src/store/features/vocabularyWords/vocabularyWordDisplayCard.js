function vocabularyWordToDisplayCard(word) {
    if (!word) {
        return null;
    }

    const text = word.text || word.main_parameters?.text || "";

    return {
        _id: word.id,
        text,
        englishLevel: word.englishLevel || "B1",
        transcription: word.transcription || "",
        translation: word.translation || "",
        shortDescription: word.shortDescription || "",
        explanation: word.explanation || "",
        notes: word.notes || "",
        examples: Array.isArray(word.examples) ? word.examples : [],
        imageUrls: Array.isArray(word.imageUrls) ? word.imageUrls : [],
    };
}

export { vocabularyWordToDisplayCard };
