import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const DEFAULT_SORT_BY = "date";
const DEFAULT_SORT_ORDER = "desc";

const useCategorySortStore = create(
    persist(
        (set) => ({
            sortBy: DEFAULT_SORT_BY,
            sortOrder: DEFAULT_SORT_ORDER,
            setSort: (sortBy, sortOrder) => set({ sortBy, sortOrder }),
        }),
        {
            name: "flasheng:category-sort",
            version: 1,
            storage: createJSONStorage(() => localStorage),
        }
    )
);

export { useCategorySortStore };
