import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

export default function SignInPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            try {
                await api.get('/auth/profile');
                navigate('/dashboard');
            } catch (err: any) {
                if (err.message && err.message.includes('404')) {
                    navigate('/auth/profile-setup');
                } else {
                    throw err;
                }
            }
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') toast.error('No account found with this email');
            else if (error.code === 'auth/wrong-password') toast.error('Incorrect password');
            else if (error.code === 'auth/invalid-credential') toast.error('Invalid email or password');
            else if (error.code === 'auth/too-many-requests') toast.error('Account temporarily locked');
            else toast.error('Failed to sign in');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-bg p-6 flex flex-col mx-auto relative md:max-w-md">
            <div className="flex items-center mb-8 h-12">
                <Link to="/auth/welcome" className="p-2 -ml-2 text-text-2 hover:text-white rounded-full">
                    <ArrowLeft size={24} />
                </Link>
                <h1 className="font-display text-2xl font-bold ml-2">Welcome Back</h1>
            </div>

            <form onSubmit={handleSignIn} className="flex flex-col gap-6 flex-1">
                <div>
                    <label className="block text-sm font-medium text-text-2 mb-2">Email Address</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                        className="w-full h-14 bg-surface-2 border border-border rounded-xl px-4 text-white focus:outline-none focus:border-primary transition-colors"
                        placeholder="you@example.com" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-2 mb-2">Password</label>
                    <div className="relative">
                        <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required
                            className="w-full h-14 bg-surface-2 border border-border rounded-xl px-4 text-white focus:outline-none focus:border-primary transition-colors pr-12"
                            placeholder="••••••••" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-text-3 hover:text-white">
                            {showPassword ? <EyeOff size={24} /> : <Eye size={24} />}
                        </button>
                    </div>
                </div>

                <button type="submit" disabled={loading}
                    className="w-full h-14 bg-primary text-white font-semibold rounded-full mt-4 disabled:opacity-50 transition-colors shadow-[0_0_15px_var(--c-primary-glow)]">
                    {loading ? 'Signing In...' : 'Sign In'}
                </button>

                <div className="flex flex-col items-center gap-6 mt-4">
                    <Link to="/auth/forgot-password" className="text-text-2 hover:text-white text-sm">
                        Forgot your password?
                    </Link>
                    <Link to="/auth/signup" className="text-text-2 text-sm">
                        New to SHEild? <span className="text-primary hover:text-primary-light font-medium text-base ml-1">Create an account</span>
                    </Link>
                </div>
            </form>
        </div>
    );
}
