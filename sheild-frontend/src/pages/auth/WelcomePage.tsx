import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function WelcomePage() {
    const [pulse, setPulse] = useState(false);

    useEffect(() => {
        setPulse(true);
    }, []);

    return (
        <div
            className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-bg relative overflow-hidden transition-all duration-[3000ms] ease-in-out"
            style={{ background: pulse ? 'radial-gradient(circle at center, var(--c-surface-3) 0%, var(--c-bg) 70%)' : 'var(--c-bg)' }}
        >
            <div className="flex-1 flex flex-col justify-center items-center z-10 w-full max-w-sm">
                <Shield size={80} className="text-primary mb-6 animate-pulse" style={{ fill: 'var(--c-primary-subtle)' }} />
                <h1 className="font-display text-5xl font-bold text-white mb-2 tracking-tight">SHEild</h1>
                <p className="text-[18px] text-text-2 mb-16 text-center">Your Digital Bodyguard</p>
            </div>

            <div className="w-full max-w-sm flex flex-col gap-4 pb-12 z-10">
                <Link to="/auth/signup" className="w-full h-14 bg-primary hover:bg-primary-hover active:bg-primary-light text-white font-semibold rounded-full flex items-center justify-center text-lg transition-colors shadow-sos">
                    Get Started
                </Link>
                <Link to="/auth/signin" className="w-full h-14 border border-border-strong text-white font-semibold rounded-full flex items-center justify-center text-lg transition-colors hover:bg-surface-2 active:bg-surface-3">
                    Sign In
                </Link>
            </div>
        </div>
    );
}
