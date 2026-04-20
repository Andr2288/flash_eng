import { useState, useCallback } from "react";

export function useThunk(asyncFn) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const runThunk = useCallback(
        (arg) => {
            setIsLoading(true);
            return Promise.resolve(asyncFn(arg))
                .catch((err) => {
                    setError(err);
                    throw err;
                })
                .finally(() => setIsLoading(false));
        },
        [asyncFn]
    );

    return [runThunk, isLoading, error];
}
