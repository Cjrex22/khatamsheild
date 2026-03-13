import { useState, useEffect } from 'react';
import { ArrowLeft, Search, Users as UsersIcon, MoreVertical, ShieldAlert, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { api } from '../lib/api';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function CirclePage() {
    const navigate = useNavigate();
    const { profile } = useAuthStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [circleMembers, setCircleMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

    useEffect(() => {
        if (!profile?.uid) return;
        const q = query(collection(db, 'users', profile.uid, 'guardCircleDetails'), orderBy('addedAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            const members = snap.docs.map(d => d.data());
            setCircleMembers(members);
        });
        return unsub;
    }, [profile?.uid]);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchTerm.length < 1) {
                setSearchResults([]);
                return;
            }
            setLoading(true);
            try {
                const results = await api.get(`/users/search?q=${searchTerm}`);
                setSearchResults(results);
            } catch (e) {
                toast.error('Search failed');
            } finally {
                setLoading(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleAdd = async (targetUid: string, name: string) => {
        try {
            await api.post(`/circle/${targetUid}`);
            toast.success(`${name} added to your Guard Circle`);
            setSearchTerm('');
        } catch (e) {
            toast.error('Failed to add connection');
        }
    };

    const handleRemove = async (targetUid: string, name: string) => {
        if (!window.confirm(`Remove ${name}? They will no longer receive your emergency alerts.`)) return;
        try {
            await api.delete(`/circle/${targetUid}`);
            toast.success(`${name} removed from your Guard Circle`);
            setActiveDropdown(null);
        } catch (e) {
            toast.error('Failed to remove connection');
        }
    };

    return (
        <div className="min-h-screen bg-bg pb-24 relative">
            <header className="sticky top-0 z-50 bg-nav-bg backdrop-blur-md border-b border-border px-4 h-16 flex items-center">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-text-2 hover:text-white rounded-full">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="font-display text-xl font-bold ml-2">Guardian Circle</h1>
                <div className="ml-auto bg-surface-2 px-3 py-1 rounded-full text-xs font-semibold text-primary border border-border">
                    {circleMembers.length} people
                </div>
            </header>

            <main className="p-4 max-w-md mx-auto">
                <div className="sticky top-[64px] z-40 bg-bg pt-2 pb-4">
                    <div className="relative">
                        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-3" />
                        <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by @username..."
                            className="w-full h-12 bg-surface-2 border border-border rounded-xl pl-12 pr-4 text-white focus:outline-none focus:border-primary transition-colors placeholder:text-text-3" />
                    </div>

                    {searchTerm.length > 0 && (
                        <div className="absolute left-0 right-0 mt-2 bg-surface border border-border rounded-xl shadow-card overflow-hidden max-h-80 overflow-y-auto z-50">
                            {loading ? (
                                <div className="p-4 text-center text-text-3 text-sm">Searching...</div>
                            ) : searchResults.length === 0 ? (
                                <div className="p-4 text-center text-text-3 text-sm flex flex-col items-center gap-2">
                                    <ShieldAlert size={24} className="opacity-50" />
                                    No users found
                                </div>
                            ) : (
                                searchResults.map(user => {
                                    const isAdded = circleMembers.some(m => m.uid === user.uid);
                                    return (
                                        <div key={user.uid} className="flex items-center justify-between p-3 border-b border-border last:border-0 hover:bg-surface-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-surface-3 flex items-center justify-center overflow-hidden shrink-0" style={{ backgroundColor: user.avatarColor }}>
                                                    {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-white font-bold">{user.name.charAt(0)}</span>}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white text-sm">{user.name}</p>
                                                    <p className="text-xs text-text-3">@{user.username}</p>
                                                </div>
                                            </div>
                                            {isAdded ? (
                                                <button disabled className="px-3 h-8 rounded-full bg-surface-3 text-safe text-xs font-bold flex items-center gap-1 border border-safe-glow">
                                                    <Check size={14} /> Added
                                                </button>
                                            ) : (
                                                <button onClick={() => handleAdd(user.uid, user.name)} className="px-3 h-8 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary-hover active:scale-95 transition-all">
                                                    + Add
                                                </button>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>

                <section className="mt-2">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-text-3 mb-4">My Guard Circle ({circleMembers.length})</h2>

                    {circleMembers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-border rounded-[20px] bg-surface-2 text-center">
                            <div className="w-16 h-16 rounded-full bg-surface-3 flex items-center justify-center text-primary-subtle mb-4 shadow-sm">
                                <UsersIcon size={32} />
                            </div>
                            <h3 className="text-white font-bold text-lg mb-2">Build Your Circle</h3>
                            <p className="text-sm text-text-2 max-w-[240px]">
                                Add completely trusted contacts who will receive your SOS alerts and live location.
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {circleMembers.map(member => (
                                <div key={member.uid} className="bg-surface border border-border rounded-xl p-3 flex items-center justify-between shadow-sm hover:border-border-strong transition-colors relative">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-surface-3 flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-border" style={{ backgroundColor: member.avatarColor }}>
                                            {member.avatarUrl ? <img src={member.avatarUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-white font-bold text-lg">{member.name.charAt(0)}</span>}
                                        </div>
                                        <div>
                                            <p className="font-bold text-white leading-tight">{member.name}</p>
                                            <p className="text-xs text-text-3 mt-0.5">@{member.username}</p>
                                        </div>
                                    </div>

                                    <div className="relative static-dropdown">
                                        <button onClick={() => setActiveDropdown(activeDropdown === member.uid ? null : member.uid)} className="w-8 h-8 rounded-full hover:bg-surface-2 flex items-center justify-center text-text-3 transition-colors outline-none focus:outline-none">
                                            <MoreVertical size={20} />
                                        </button>

                                        {activeDropdown === member.uid && (
                                            <>
                                                <div className="fixed inset-0 z-30" onClick={() => setActiveDropdown(null)} />
                                                <div className="absolute right-0 top-10 w-48 bg-surface-2 border border-border shadow-card rounded-lg py-1 z-40">
                                                    <button onClick={() => handleRemove(member.uid, member.name)} className="w-full text-left px-4 py-3 text-sm text-danger hover:bg-surface-3 transition-colors flex items-center gap-2 font-medium">
                                                        Remove from Circle
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
