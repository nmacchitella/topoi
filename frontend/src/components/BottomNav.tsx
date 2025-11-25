'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useStore } from '@/store/useStore';

interface BottomNavProps {
  onNewPlace?: () => void;
  showNewButton?: boolean;
}

export default function BottomNav({ onNewPlace, showNewButton = true }: BottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { setSidebarOpen } = useStore();

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  const handleNavigation = (path: string) => {
    setSidebarOpen(false);
    router.push(path);
  };

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-dark-lighter border-t border-gray-800 z-40" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}>
      <div className="flex items-center justify-around h-16 pt-2">
        {/* Places */}
        <button
          onClick={() => handleNavigation('/')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            isActive('/') && pathname === '/'
              ? 'text-primary'
              : 'text-gray-400 hover:text-text-primary'
          }`}
        >
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-xs">Places</span>
        </button>

        {/* Collections */}
        <button
          onClick={() => handleNavigation('/collections')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            isActive('/collections')
              ? 'text-primary'
              : 'text-gray-400 hover:text-text-primary'
          }`}
        >
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span className="text-xs">Collections</span>
        </button>

        {/* New Place - Bigger (only on Places page) */}
        {showNewButton && onNewPlace ? (
          <button
            onClick={onNewPlace}
            className="flex flex-col items-center justify-center flex-1 h-full transition-colors text-primary hover:text-primary-hover"
          >
            <div className="bg-primary hover:bg-primary-hover rounded-full p-3 mb-1 shadow-lg transition-all">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-xs font-semibold">New</span>
          </button>
        ) : (
          <div className="flex-1 h-full" />
        )}

        {/* Tags */}
        <button
          onClick={() => handleNavigation('/tags')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            isActive('/tags')
              ? 'text-primary'
              : 'text-gray-400 hover:text-text-primary'
          }`}
        >
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <span className="text-xs">Tags</span>
        </button>

        {/* Profile */}
        <button
          onClick={() => handleNavigation('/settings')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            isActive('/settings')
              ? 'text-primary'
              : 'text-gray-400 hover:text-text-primary'
          }`}
        >
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-xs">Profile</span>
        </button>
      </div>
    </nav>
  );
}
