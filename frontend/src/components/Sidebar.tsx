'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useStore } from '@/store/useStore';

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, sidebarOpen, setSidebarOpen } = useStore();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const menuItems = [
    { label: 'Places', path: '/', icon: '📍' },
    { label: 'Collections', path: '/collections', icon: '📚' },
    { label: 'Tags', path: '/tags', icon: '🏷️' },
  ];

  const bottomItems = [
    { label: 'Settings', path: '/settings', icon: '⚙️' },
  ];

  const isActive = (path: string) => pathname === path;

  const handleNavClick = (path: string) => {
    router.push(path);
    setSidebarOpen(false);
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div
        className={`bg-dark-card border-r border-gray-700 flex flex-col transition-all duration-300
          fixed sm:relative z-50 h-full
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} sm:translate-x-0
          ${isCollapsed ? 'w-16' : 'w-64'}
        `}
      >
      {/* Header with collapse button */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-end">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-gray-400 hover:text-white transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? '→' : '←'}
        </button>
      </div>

      {/* Main menu items */}
      <nav className="flex-1 py-4">
        {menuItems.map((item) => (
          <button
            key={item.path}
            onClick={() => handleNavClick(item.path)}
            className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
              isActive(item.path)
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-dark-hover hover:text-white'
            }`}
            title={isCollapsed ? item.label : undefined}
          >
            <span className="text-xl">{item.icon}</span>
            {!isCollapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Bottom items */}
      <div className="border-t border-gray-700">
        {bottomItems.map((item) => (
          <button
            key={item.path}
            onClick={() => handleNavClick(item.path)}
            className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
              isActive(item.path)
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-dark-hover hover:text-white'
            }`}
            title={isCollapsed ? item.label : undefined}
          >
            <span className="text-xl">{item.icon}</span>
            {!isCollapsed && <span>{item.label}</span>}
          </button>
        ))}
        <button
          onClick={() => {
            handleLogout();
            setSidebarOpen(false);
          }}
          className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-dark-hover transition-colors"
          title={isCollapsed ? 'Log Out' : undefined}
        >
          <span className="text-xl">🚪</span>
          {!isCollapsed && <span>Log Out</span>}
        </button>
      </div>
      </div>
    </>
  );
}
