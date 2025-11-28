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

  const isMapPage = pathname === '/';

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 bg-dark-lighter border-t border-gray-800 z-40"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}
    >
      <div className="flex items-center justify-around h-16">
        {/* Explore */}
        <button
          onClick={() => handleNavigation('/explore')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            isActive('/explore')
              ? 'text-primary'
              : 'text-gray-400 hover:text-text-primary'
          }`}
        >
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="text-xs">Explore</span>
        </button>

        {/* Center button - New Place (on map) or Places (on other pages) */}
        {isMapPage && showNewButton && onNewPlace ? (
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
        )}

        {/* Profile */}
        <button
          onClick={() => handleNavigation('/profile')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            isActive('/profile')
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
