import { useState } from 'react';
import { X, Phone, Save } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onAdded: () => void;
}

export default function QuickDialModal({ isOpen, onClose, onAdded }: Props) {
    const [name, setName] = useState('');
    const [number, setNumber] = useState('');
    const [emoji, setEmoji] = useState('📞');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const emojis = ['📞', '👨‍👩‍👧', '🏥', '🚨', '🛡️', '🚕', '👩‍🔧', '🔑'];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !number) return;
        setLoading(true);
        try {
            await api.post('/quick-dials', { name, phone: number, emoji });
            toast.success(`${emoji} ${name} added to Quick Dials`);
            onAdded();
            onClose();
        } catch (error) {
            toast.error('Failed to add quick dial');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm bg-surface rounded-3xl border border-border shadow-card overflow-hidden animate-slide-up">
                <header className="flex items-center justify-between p-4 border-b border-border bg-surface-2">
                    <h2 className="font-bold text-white flex items-center gap-2">
                        <Phone size={18} className="text-primary" />
                        Add Quick Dial
                    </h2>
                    <button onClick={onClose} className="text-text-2 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-5">
                    <div>
                        <label className="block text-xs font-bold text-text-3 uppercase tracking-wider mb-2">Icon</label>
                        <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                            {emojis.map(e => (
                                <button
                                    key={e}
                                    type="button"
                                    onClick={() => setEmoji(e)}
                                    className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-lg transition-colors border ${emoji === e ? 'bg-primary border-primary-glow' : 'bg-surface-3 border-transparent hover:border-border'}`}
                                >
                                    {e}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-text-3 uppercase tracking-wider mb-2">Name</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Mom"
                            className="w-full h-12 bg-surface-2 border border-border rounded-xl px-4 text-white focus:border-primary outline-none transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-text-3 uppercase tracking-wider mb-2">Phone Number</label>
                        <input
                            type="tel"
                            required
                            value={number}
                            onChange={(e) => setNumber(e.target.value.replace(/\D/g, ''))}
                            placeholder="e.g. 9876543210"
                            className="w-full h-12 bg-surface-2 border border-border rounded-xl px-4 text-white focus:border-primary outline-none transition-colors"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !name || !number}
                        className="w-full h-14 bg-primary text-white font-bold rounded-xl mt-2 flex items-center justify-center gap-2 hover:bg-primary-hover disabled:opacity-50 transition-all shadow-sos"
                    >
                        {loading ? 'Adding...' : <><Save size={20} /> Save Quick Dial</>}
                    </button>
                </form>
            </div>
        </div>
    );
}
