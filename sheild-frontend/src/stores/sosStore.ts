import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SosState {
    sosActive: boolean;
    bodyguardActive: boolean;
    recordingActive: boolean;
    sessionId: string | null;
    autoCallPolice: boolean;
    policeNumber: string;
    setSosActive: (v: boolean) => void;
    setBodyguardActive: (v: boolean) => void;
    setSessionId: (id: string | null) => void;
    setRecordingActive: (v: boolean) => void;
    setAutoCallPolice: (v: boolean) => void;
    setPoliceNumber: (v: string) => void;
}

export const useSosStore = create<SosState>()(
    persist(
        (set) => ({
    sosActive: false,
    bodyguardActive: false,
    recordingActive: false,
    sessionId: null,
    autoCallPolice: true,
    policeNumber: "100",
    setSosActive: (sosActive) => set({ sosActive }),
    setBodyguardActive: (bodyguardActive) => set({ bodyguardActive }),
    setSessionId: (sessionId) => set({ sessionId }),
    setRecordingActive: (recordingActive) => set({ recordingActive }),
    setAutoCallPolice: (autoCallPolice) => set({ autoCallPolice }),
    setPoliceNumber: (policeNumber) => set({ policeNumber: policeNumber || "100" }),
        }),
        {
            name: "sheild-sos-storage",
            partialize: (state) => ({
                bodyguardActive: state.bodyguardActive,
                sosActive: state.sosActive,
                sessionId: state.sessionId,
                autoCallPolice: state.autoCallPolice,
                policeNumber: state.policeNumber
            }),
        }
    )
);
