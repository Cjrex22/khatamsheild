import { create } from "zustand";
import type { User as FirebaseUser } from "firebase/auth";

export interface UserSettings {
    sosCountdownSeconds?: number; // legacy
    holdCountdown: number;       // new
    autoCallPolice: boolean;
    policeNumber?: string;        // legacy
    emergencyNumber: string;     // new
    sosMessage?: string;
    vaultPin?: string;
    biometricEnabled?: boolean;
    appLockEnabled?: boolean;
    liveLocationEnabled?: boolean;
    theme?: string;
    fontSize?: string;
}

export interface UserProfile {
    uid: string;
    email: string;
    name: string;
    username: string;
    phone: string;       // legacy
    phoneNumber: string; // new
    avatarUrl?: string;
    avatarColor?: string;
    bloodType?: string;
    medicalNotes?: string;
    guardCircle?: string[];
    fcmToken?: string;
    settings?: UserSettings;
}

interface AuthState {
    user: FirebaseUser | null;
    profile: UserProfile | null;
    loading: boolean;
    setUser: (user: FirebaseUser | null) => void;
    setProfile: (profile: UserProfile | null) => void;
    clearUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    profile: null,
    loading: true,
    setUser: (user) => set({ user, loading: false }),
    setProfile: (profile) => set({ profile }),
    clearUser: () => set({ user: null, profile: null, loading: false }),
}));
