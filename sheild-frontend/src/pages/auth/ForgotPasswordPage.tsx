import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            setSuccess(true);
        } catch (error: any) {
            if (error.code === 'auth/invalid-email') toast.error('Invalid email address');
            else toast.error('Failed to send reset email');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-bg p-6 flex flex-col items-center justify-center max-w-md mx-auto relative">
                <CheckCircle2 size={80} className="text-safe mb-6 animate-pulse" />
                <h1 className="font-display text-3xl font-bold mb-4 text-center">Check Your Email</h1>
                <p className="text-text-2 text-center mb-8 px-4">
                    Reset link sent! Check your inbox. Link expires in 1 hour.
                </p>
                <Link to="/auth/signin" className="w-full h-14 bg-primary text-white font-semibold rounded-full flex items-center justify-center transition-colors shadow-[0_0_15px_var(--c-primary-glow)]">
                    Back to Sign In
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg p-6 flex flex-col mx-auto relative md:max-w-md">
            <div className="flex items-center mb-6 h-12">
                <Link to="/auth/signin" className="p-2 -ml-2 text-text-2 hover:text-white rounded-full">
                    <ArrowLeft size={24} />
                </Link>
                <h1 className="font-display text-2xl font-bold ml-2">Reset Password</h1>
            </div>

            <p className="text-text-2 mb-8">
                Enter your email and we'll send you a secure reset link.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div>
                    <label className="block text-sm font-medium text-text-2 mb-2">Email Address</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                        className="w-full h-14 bg-surface-2 border border-border rounded-xl px-4 text-white focus:outline-none focus:border-primary transition-colors"
                        placeholder="you@example.com" />
                </div>

                <button type="submit" disabled={loading || !email}
                    className="w-full h-14 bg-primary text-white font-semibold rounded-full mt-2 disabled:opacity-50 transition-colors shadow-sos">
                    {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
            </form>
        </div>
    );
}
