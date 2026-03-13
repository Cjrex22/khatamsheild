import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Check, X } from 'lucide-react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import toast from 'react-hot-toast';

export default function SignUpPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const rules = useMemo(() => ({
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[^A-Za-z0-9]/.test(password)
    }), [password]);

    const strength = Object.values(rules).filter(Boolean).length;

    const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
    const isValid = strength === 4 && passwordsMatch && email.includes('@');

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) return;
        setLoading(true);
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            navigate('/auth/profile-setup');
        } catch (error: any) {
            if (error.code === 'auth/email-already-in-use') toast.error('Account exists. Sign in instead?');
            else if (error.code === 'auth/weak-password') toast.error('Please choose a stronger password');
            else if (error.code === 'auth/invalid-email') toast.error('Invalid email address');
            else if (error.code === 'auth/network-request-failed') toast.error('No internet connection');
            else toast.error('Failed to create account');
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
                <h1 className="font-display text-2xl font-bold ml-2">Create Account</h1>
            </div>

            <form onSubmit={handleSignUp} className="flex flex-col gap-6 flex-1">
                <div>
                    <label className="block text-sm font-medium text-text-2 mb-2">Email Address</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                        className="w-full h-14 bg-surface-2 border border-border rounded-xl px-4 text-white focus:outline-none focus:border-primary transition-colors"
                        placeholder="you@example.com" />
                </div>

                <div>
                    <label className="block text-sm font-medium text-text-2 mb-2">Password</label>
                    <div className="relative mb-3">
                        <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required
                            className="w-full h-14 bg-surface-2 border border-border rounded-xl px-4 text-white focus:outline-none focus:border-primary transition-colors pr-12"
                            placeholder="••••••••" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-text-3 hover:text-white">
                            {showPassword ? <EyeOff size={24} /> : <Eye size={24} />}
                        </button>
                    </div>

                    <div className="flex gap-1 mb-3">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className={`h-1 flex-1 rounded-full ${i <= strength ? (strength < 3 ? 'bg-warning' : strength === 4 ? 'bg-safe' : 'bg-primary') : 'bg-surface-3'}`} />
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-text-3">
                        <div className={`flex items-center gap-1 ${rules.length ? 'text-safe' : ''}`}>
                            {rules.length ? <Check size={14} /> : <X size={14} className="text-danger" />} 8+ characters
                        </div>
                        <div className={`flex items-center gap-1 ${rules.uppercase ? 'text-safe' : ''}`}>
                            {rules.uppercase ? <Check size={14} /> : <X size={14} className="text-danger" />} Uppercase letter
                        </div>
                        <div className={`flex items-center gap-1 ${rules.number ? 'text-safe' : ''}`}>
                            {rules.number ? <Check size={14} /> : <X size={14} className="text-danger" />} Number
                        </div>
                        <div className={`flex items-center gap-1 ${rules.special ? 'text-safe' : ''}`}>
                            {rules.special ? <Check size={14} /> : <X size={14} className="text-danger" />} Special character
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-text-2 mb-2 flex justify-between">
                        Confirm Password
                        {confirmPassword.length > 0 && (
                            <span className={passwordsMatch ? 'text-safe' : 'text-danger'}>
                                {passwordsMatch ? 'Match ✓' : 'No match ✗'}
                            </span>
                        )}
                    </label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
                        className="w-full h-14 bg-surface-2 border border-border rounded-xl px-4 text-white focus:outline-none focus:border-primary transition-colors"
                        placeholder="••••••••" />
                </div>

                <button type="submit" disabled={!isValid || loading}
                    className="w-full h-14 bg-primary text-white font-semibold rounded-full mt-4 disabled:opacity-50 disabled:bg-surface-3 transition-colors shadow-sos">
                    {loading ? 'Creating...' : 'Create Account'}
                </button>

                <div className="text-center mt-4 pb-8">
                    <Link to="/auth/signin" className="text-text-2 text-sm">
                        Already have an account? <span className="text-primary hover:text-primary-light font-medium text-base ml-1">Sign In</span>
                    </Link>
                </div>
            </form>
        </div>
    );
}
