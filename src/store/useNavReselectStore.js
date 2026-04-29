import { create } from "zustand";

/**
 * Increments when the user clicks a sidebar link for the route they are already on,
 * so pages can refetch without a full remount.
 */
const useNavReselectStore = create((set) => ({
    bumps: {},
    bumpPath: (path) =>
        set((state) => ({
            bumps: {
                ...state.bumps,
                [path]: (state.bumps[path] ?? 0) + 1,
            },
        })),
}));

export { useNavReselectStore };
