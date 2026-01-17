import { defaultDocument } from "@/app/default-document";
import { MusicDiagramDocument } from "@/app/music-diagram-document/music-diagram-document";
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export interface StoreValue {
  title: string;
  document: MusicDiagramDocument;
  selection: {
    start: number | null;
    end: number | null;
    section: string | null;
  };
  displayPreferences: {
    notateToRealRatio: 1 | 2 | 4;
  };
}

export const initialStoreValue: StoreValue = {
  title: "",
  document: defaultDocument,
  selection: {
    start: null,
    end: null,
    section: null,
  },
  displayPreferences: {
    notateToRealRatio: 1,
  },
};

export const useStore = create<StoreValue>()(
  devtools(
    persist(() => initialStoreValue, {
      name: "music-diagram",
    }),
  ),
);
