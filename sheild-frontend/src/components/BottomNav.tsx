import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Map as MapIcon, Settings, ShieldCheck } from 'lucide-react';

export default function BottomNav() {
    const location = useLocation();
    const currentPath = location.pathname;

    if (currentPath.startsWith('/auth') || currentPath === '/') return null;

    const tabs = [
        { path: '/dashboard',  label: 'Home',     icon: Home        },
        { path: '/circle',     label: 'Circle',   icon: Users       },
        { path: '/map',        label: 'Map',       icon: MapIcon     },
        { path: '/safe-zones', label: 'Safe',      icon: ShieldCheck },
        { path: '/settings',   label: 'Settings',  icon: Settings    },
    ];

    return (
        <nav className="fixed bottom-0 w-full h-[64px] bg-nav-bg backdrop-blur-[20px] saturate-[180%] border-t border-border shadow-nav z-[1000]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="flex h-full items-center justify-around px-2">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = currentPath === tab.path;
                    return (
                        <Link key={tab.path} to={tab.path} className="flex flex-col items-center justify-center w-14 h-full relative gap-1">
                            <Icon size={24} className={isActive ? 'text-primary' : 'text-text-3'} strokeWidth={isActive ? 2.5 : 2} />
                            <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-primary' : 'text-text-3'}`}>{tab.label}</span>
                            {isActive && <div className="absolute top-1 w-1 h-1 rounded-full bg-primary" />}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
