import { create } from "zustand";

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PwaState {
    deferredPrompt: BeforeInstallPromptEvent | null;
    isInstalled: boolean;
    setDeferredPrompt: (event: BeforeInstallPromptEvent) => void;
    setInstalled: (val: boolean) => void;
    clearPrompt: () => void;
}

export const usePwaStore = create<PwaState>((set) => ({
    deferredPrompt: null,
    isInstalled: false,
    setDeferredPrompt: (event) => set({ deferredPrompt: event }),
    setInstalled: (val) => set({ isInstalled: val }),
    clearPrompt: () => set({ deferredPrompt: null }),
}));

export type { BeforeInstallPromptEvent };
