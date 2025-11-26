'use client';

import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { useRouter, usePathname } from 'next/navigation';
import type { Place, NominatimResult } from '@/types';
import SearchBar from './SearchBar';
import NotificationBell from './NotificationBell';

interface NavbarProps {
  onPlaceClick?: (place: Place) => void;
  onNominatimSelect?: (result: NominatimResult) => void;
  onAddNew?: (name: string) => void;
}

export default function Navbar({ onPlaceClick, onNominatimSelect, onAddNew }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    user,
    logout,
    sidebarOpen,
    setSidebarOpen,
  } = useStore();

  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Only show search on the home page
  const isHomePage = pathname === '/';

  return (
    <nav className="bg-dark-lighter border-b border-gray-800/50 px-4 py-3.5 relative z-50 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Hamburger + Logo */}
        <div className="flex items-center gap-4">
          {/* Hamburger menu button - mobile only */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="sm:hidden text-gray-400 hover:text-primary p-2 -ml-2 transition-colors rounded-lg hover:bg-dark-hover"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {sidebarOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary cursor-pointer tracking-tight" onClick={() => router.push('/')}>
            Topoi
          </h1>
        </div>

        {/* Center: Search bar (home page only) */}
        {isHomePage && onPlaceClick && onNominatimSelect && (
          <div className="flex-1 max-w-2xl">
            <SearchBar
              onPlaceClick={onPlaceClick}
              onNominatimSelect={onNominatimSelect}
              onAddNew={onAddNew || (() => {})}
            />
          </div>
        )}

        {/* Right: Notification Bell + User dropdown (desktop only) */}
        <div className="hidden sm:flex items-center gap-2">
          {/* Notification Bell */}
          <NotificationBell />

          {/* User Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2.5 text-text-primary px-4 py-2 hover:bg-dark-hover rounded-lg transition-all"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="font-medium">{user?.name || 'User'}</span>
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showUserDropdown && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserDropdown(false)}
                />
                {/* Dropdown menu */}
                <div className="absolute right-0 mt-2 w-52 bg-dark-lighter border border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                <button
                  onClick={() => {
                    router.push('/');
                    setShowUserDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-dark-hover transition-all text-gray-400 hover:text-text-primary flex items-center gap-3 font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Places
                </button>
                <button
                  onClick={() => {
                    router.push('/collections');
                    setShowUserDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-dark-hover transition-all text-gray-400 hover:text-text-primary flex items-center gap-3 font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Collections
                </button>
                <button
                  onClick={() => {
                    router.push('/tags');
                    setShowUserDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-dark-hover transition-all text-gray-400 hover:text-text-primary flex items-center gap-3 font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Tags
                </button>
                <button
                  onClick={() => {
                    router.push('/discover');
                    setShowUserDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-dark-hover transition-all text-gray-400 hover:text-text-primary flex items-center gap-3 font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Discover
                </button>
                <div className="border-t border-gray-800/50 my-1"></div>
                <button
                  onClick={() => {
                    router.push('/settings');
                    setShowUserDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-dark-hover transition-all text-gray-400 hover:text-text-primary flex items-center gap-3 font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </button>
                <button
                  onClick={() => {
                    handleLogout();
                    setShowUserDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-red-500/10 transition-all text-red-400 hover:text-red-300 flex items-center gap-3 font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Log Out
                </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
