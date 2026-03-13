import { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, LogOut, User, Shield, Heart, Camera, 
  Lock, CheckCircle2, AlertCircle, 
  Download, Loader2, Save, Phone, Mail
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { useAuthStore } from '../stores/authStore';
import { useSosStore } from '../stores/sosStore';
import { usePwaStore } from '../stores/pwaStore';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

type Tab = 'profile' | 'sos' | 'safety';

export default function SettingsPage() {
    const navigate = useNavigate();
    const { profile, setProfile } = useAuthStore();
    const [activeTab, setActiveTab] = useState<Tab>('profile');
    const [isSaving, setIsSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Profile State
    const [name, setName] = useState(profile?.name || '');
    const [phoneNumber, setPhoneNumber] = useState(profile?.phoneNumber || '');
    
    // SOS Config State
    const [holdCountdown, setHoldCountdown] = useState(profile?.settings?.holdCountdown || 3);
    const [autoCallPolice, setAutoCallPolice] = useState(profile?.settings?.autoCallPolice ?? true);
    const [emergencyNumber, setEmergencyNumber] = useState(profile?.settings?.emergencyNumber || '100');

    // PWA install state from global store
    const { deferredPrompt, isInstalled, setInstalled, clearPrompt } = usePwaStore();
    const [isInstalling, setIsInstalling] = useState(false);
    const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');

    useEffect(() => {
        // isPWA is now managed by usePwaStore (set in App.tsx)
        setNotifPermission(Notification.permission);
        if (profile) {
            setName(profile.name || '');
            setPhoneNumber(profile.phoneNumber || '');
            setHoldCountdown(profile.settings?.holdCountdown || 3);
            setAutoCallPolice(profile.settings?.autoCallPolice ?? true);
            setEmergencyNumber(profile.settings?.emergencyNumber || '100');
        }
    }, [profile]);

    const handleSignOut = async () => {
        await auth.signOut();
        navigate('/auth/welcome');
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const compressImage = (file: File): Promise<Blob> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 400;
                canvas.height = 400;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    const size = Math.min(img.width, img.height);
                    const x = (img.width - size) / 2;
                    const y = (img.height - size) / 2;
                    ctx.drawImage(img, x, y, size, size, 0, 0, 400, 400);
                }
                canvas.toBlob((blob) => {
                    resolve(blob || file);
                }, 'image/jpeg', 0.8);
            };
            img.src = URL.createObjectURL(file);
        });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingAvatar(true);
        try {
            const compressedBlob = await compressImage(file);
            const formData = new FormData();
            formData.append('file', compressedBlob, 'avatar.jpg');

            const res = await api.postFormData('/auth/avatar', formData);
            setProfile({ ...profile!, avatarUrl: res.avatarUrl });
            toast.success("Avatar updated!");
        } catch (err) {
            toast.error("Failed to upload avatar.");
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleSaveProfile = async () => {
        setIsSaving(true);
        try {
            await api.put('/auth/profile', { name, phoneNumber });
            setProfile({ ...profile!, name, phoneNumber });
            toast.success("Profile saved!");
        } catch (err) {
            toast.error("Failed to update profile.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveSos = async () => {
        setIsSaving(true);
        // Never save empty emergencyNumber — fallback to "100"
        const safeNumber = emergencyNumber?.trim() || '100';
        if (!emergencyNumber?.trim()) setEmergencyNumber('100');
        const newSettings = {
            ...profile?.settings,
            holdCountdown,
            autoCallPolice,
            emergencyNumber: safeNumber
        };
        try {
            await api.put('/settings', newSettings);
            setProfile({ ...profile!, settings: newSettings });
            // Update sosStore so Dashboard SOS reads the latest values
            useSosStore.getState().setAutoCallPolice(autoCallPolice);
            useSosStore.getState().setPoliceNumber(safeNumber);
            toast.success("SOS settings saved successfully");
        } catch (err: any) {
            toast.error(err?.message || "Failed to update SOS settings.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleEnableNotifications = async () => {
        const permission = await Notification.requestPermission();
        setNotifPermission(permission);
        if (permission === 'granted') {
            try {
                // Get token using our service worker in the real implementation
                // For now just update UI and show toast
                toast.success("Notifications enabled!");
            } catch (e) {
                toast.error("Failed to register token");
            }
        }
    };

    const isProfileModified = name !== (profile?.name || '') || phoneNumber !== (profile?.phoneNumber || '');
    const isSosModified = 
        holdCountdown !== (profile?.settings?.holdCountdown || 3) || 
        autoCallPolice !== (profile?.settings?.autoCallPolice ?? true) ||
        emergencyNumber !== (profile?.settings?.emergencyNumber || '100');

    return (
        <div className="min-h-screen bg-bg pb-24 relative selection:bg-primary/30">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-nav-bg/80 backdrop-blur-xl border-b border-white/5 px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-3 hover:text-white hover:bg-white/5 rounded-full transition-all">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="font-display text-xl font-bold text-white tracking-tight">Settings</h1>
                </div>
            </header>

            {/* Tab Bar - Sticky */}
            <div className="sticky top-16 z-40 bg-bg/95 backdrop-blur-md border-b border-white/5 flex items-center overflow-x-auto no-scrollbar">
                {(['profile', 'sos', 'safety'] as Tab[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap px-4 border-b-2 ${
                            activeTab === tab 
                            ? 'text-primary border-primary' 
                            : 'text-text-3 border-transparent hover:text-text-2 hover:bg-white/5'
                        }`}
                    >
                        {tab === 'profile' && 'Profile'}
                        {tab === 'sos' && 'SOS Config'}
                        {tab === 'safety' && 'Safety Resources'}
                    </button>
                ))}
            </div>

            <main className="p-4 max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {activeTab === 'profile' && (
                    <div className="space-y-6">
                        {/* Avatar Section */}
                        <div className="flex flex-col items-center gap-4 py-4">
                            <div 
                                onClick={handleAvatarClick}
                                className="relative w-[88px] h-[88px] rounded-full bg-surface-2 border-2 border-white/10 overflow-hidden cursor-pointer group hover:border-primary/50 transition-all"
                            >
                                {profile?.avatarUrl ? (
                                    <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-surface-3">
                                        <User size={32} className="text-text-3" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    {uploadingAvatar ? <Loader2 className="text-white animate-spin" /> : <Camera className="text-white" size={24} />}
                                </div>
                            </div>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                className="hidden" 
                                accept="image/*"
                            />
                            <div className="text-center">
                                <h2 className="text-lg font-bold text-white tracking-tight">{profile?.name}</h2>
                                <p className="text-sm text-text-3">@{profile?.username}</p>
                            </div>
                        </div>

                        {/* Profile Form */}
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-text-3 ml-2">Full Name</label>
                                <div className="relative group">
                                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-3 group-focus-within:text-primary transition-colors" />
                                    <input 
                                        type="text" 
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-surface border border-white/5 rounded-xl py-3.5 pl-12 pr-4 text-white text-sm focus:border-primary/50 outline-none transition-all"
                                        placeholder="Enter full name"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-text-3 ml-2">Phone Number</label>
                                <div className="relative group">
                                    <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-3 group-focus-within:text-primary transition-colors" />
                                    <input 
                                        type="tel" 
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        className="w-full bg-surface border border-white/5 rounded-xl py-3.5 pl-12 pr-4 text-white text-sm focus:border-primary/50 outline-none transition-all"
                                        placeholder="Add phone number"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5 opacity-50">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-text-3 ml-2">Email Address</label>
                                <div className="relative">
                                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-3" />
                                    <input 
                                        type="email" 
                                        value={profile?.email || ''} 
                                        disabled
                                        className="w-full bg-surface/50 border border-white/5 rounded-xl py-3.5 pl-12 pr-12 text-white/50 text-sm cursor-not-allowed"
                                    />
                                    <Lock size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-3" />
                                </div>
                            </div>

                            <button
                                onClick={handleSaveProfile}
                                disabled={!isProfileModified || isSaving}
                                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                                    isProfileModified 
                                    ? 'bg-primary text-white hover:brightness-110 active:scale-95' 
                                    : 'bg-white/5 text-text-3 cursor-not-allowed'
                                }`}
                            >
                                {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                                Save Profile Changes
                            </button>
                        </div>

                        {/* App Health */}
                        <div className="pt-4 space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-text-3 px-2">App Health & Status</h3>
                            
                            <div className="bg-surface border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${isInstalled || !deferredPrompt ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                        {isInstalled || !deferredPrompt ? <CheckCircle2 size={20} /> : <Download size={20} />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">
                                            {isInstalled || !deferredPrompt ? 'App Installed' : 'Install App'}
                                        </p>
                                        <p className="text-[10px] text-text-3">
                                            {isInstalled || !deferredPrompt ? 'SHEild is installed on your device' : 'Install SHEild for the best experience'}
                                        </p>
                                    </div>
                                </div>
                                {isInstalled || !deferredPrompt ? (
                                    <CheckCircle2 className="text-green-500" size={20} />
                                ) : (
                                    <button
                                        onClick={async () => {
                                            if (!deferredPrompt) return;
                                            setIsInstalling(true);
                                            try {
                                                await deferredPrompt.prompt();
                                                const { outcome } = await deferredPrompt.userChoice;
                                                if (outcome === 'accepted') {
                                                    toast.success('SHEild installed successfully');
                                                    setInstalled(true);
                                                    clearPrompt();
                                                } else {
                                                    toast('Installation cancelled', { icon: '⚠️' });
                                                }
                                            } catch (err) {
                                                toast.error('Installation failed');
                                            } finally {
                                                setIsInstalling(false);
                                            }
                                        }}
                                        disabled={isInstalling}
                                        className="text-[10px] font-bold text-white px-4 py-1.5 bg-red-600 rounded-full hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        {isInstalling ? <Loader2 size={14} className="animate-spin" /> : 'INSTALL'}
                                    </button>
                                )}
                            </div>

                            <div className="bg-surface border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${notifPermission === 'granted' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                        <AlertCircle size={20} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">Notifications</p>
                                        <p className="text-[10px] text-text-3">Status: {notifPermission}</p>
                                    </div>
                                </div>
                                {notifPermission === 'granted' ? (
                                    <CheckCircle2 className="text-green-500" size={20} />
                                ) : (
                                    <button 
                                        onClick={handleEnableNotifications}
                                        className="text-[10px] font-bold text-primary px-3 py-1.5 bg-primary/10 rounded-full hover:bg-primary/20 transition-colors"
                                    >
                                        ENABLE
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Log Out */}
                        <button 
                            onClick={handleSignOut}
                            className="w-full py-4 border border-danger/20 text-danger font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-danger/10 transition-colors mt-8"
                        >
                            <LogOut size={20} /> Sign Out
                        </button>
                    </div>
                )}

                {activeTab === 'sos' && (
                    <div className="space-y-6">
                        <div className="bg-primary/5 border border-primary/10 p-5 rounded-2xl space-y-2">
                            <h3 className="text-white font-bold flex items-center gap-2">
                                <Shield size={18} className="text-primary" /> SOS Quick Configuration
                            </h3>
                            <p className="text-xs text-text-3 leading-relaxed">
                                Customize how SHEild responds when you trigger an emergency. These settings are stored locally and synced with your account.
                            </p>
                        </div>

                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-white ml-1">Hold Countdown</label>
                                <p className="text-[10px] text-text-3 ml-1 mb-2">Duration to hold the SOS button before it triggers.</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {[3, 5, 10].map(val => (
                                        <button 
                                            key={val}
                                            onClick={() => setHoldCountdown(val)}
                                            className={`py-3 rounded-xl border font-bold text-sm transition-all ${
                                                holdCountdown === val 
                                                ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                                                : 'bg-surface border-white/5 text-text-3 hover:border-white/20'
                                            }`}
                                        >
                                            {val}s
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-surface border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <p className="text-sm font-bold text-white tracking-tight">Auto-Dial Police</p>
                                    <p className="text-[10px] text-text-3">Wait 2s then call emergency after SOS triggers.</p>
                                </div>
                                <button 
                                    onClick={() => setAutoCallPolice(!autoCallPolice)}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${autoCallPolice ? 'bg-primary' : 'bg-surface-3'}`}
                                >
                                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${autoCallPolice ? 'translate-x-6' : ''}`} />
                                </button>
                            </div>

                            <div className={`space-y-1.5 transition-opacity ${autoCallPolice ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-text-3 ml-2">Emergency Service Number</label>
                                <input 
                                    type="tel" 
                                    value={emergencyNumber}
                                    onChange={(e) => setEmergencyNumber(e.target.value)}
                                    className="w-full bg-surface border border-white/5 rounded-xl py-3.5 px-4 text-white text-sm focus:border-primary/50 outline-none transition-all"
                                    placeholder="e.g. 100 or 112"
                                />
                                <p className="text-[10px] text-text-3 ml-2 mt-1">Default: 100 (Indian Police). You can change this to any number.</p>
                            </div>

                            <button
                                onClick={handleSaveSos}
                                disabled={!isSosModified || isSaving}
                                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all mt-4 ${
                                    isSosModified 
                                    ? 'bg-primary text-white hover:brightness-110 active:scale-95' 
                                    : 'bg-white/5 text-text-3 cursor-not-allowed'
                                }`}
                            >
                                {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                                Save SOS Preferences
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'safety' && (
                    <div className="space-y-6">
                        <div className="space-y-2 px-2">
                            <h2 className="text-lg font-bold text-white">Safety Resources</h2>
                            <p className="text-sm text-text-3">Quick access to essential safety information and legal rights.</p>
                        </div>

                        <div className="grid gap-4">
                            {[
                                { title: 'Legal Rights & Laws', icon: Shield, desc: 'Know your rights regarding harassment and local laws.' },
                                { title: 'First Aid Guidelines', icon: Heart, desc: 'Critical steps to take during medical emergencies.' },
                                { title: 'Emergency Helpline Directory', icon: Phone, desc: 'Comprehensive list of local and national help numbers.' },
                            ].map((item, idx) => (
                                <div key={idx} className="bg-surface border border-white/5 p-5 rounded-2xl flex items-start gap-4 hover:bg-white/5 transition-colors cursor-pointer group">
                                    <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all">
                                        <item.icon size={24} />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="font-bold text-white tracking-tight">{item.title}</h4>
                                        <p className="text-xs text-text-3 leading-relaxed">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-6 bg-surface-2 rounded-3xl border border-white/5 mt-4 text-center space-y-3">
                            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto text-text-3">
                                <Shield size={24} />
                            </div>
                            <h3 className="font-bold text-white">Community Safety Tips</h3>
                            <p className="text-xs text-text-3">Join our community discussions to learn and share safety tips with other SHEild users.</p>
                            <button 
                                onClick={() => toast("Community Safety Tips coming soon!", { icon: "💡" })}
                                className="text-xs font-bold text-primary hover:underline"
                            >
                                View All Tips
                            </button>
                        </div>
                    </div>
                )}

                <p className="text-center text-[10px] text-text-3 mt-12 mb-8 opacity-40">
                    SHEild v1.0.0 (Production Build) • Developed for SHEild Safety
                </p>
            </main>
        </div>
    );
}

