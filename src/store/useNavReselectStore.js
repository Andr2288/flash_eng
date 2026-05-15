import { create } from "zustand";

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
