'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useStore } from '@/store/useStore';

export default function LoginPage() {
  const router = useRouter();
  const { token, setToken, setUser } = useStore();

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });

  // Redirect if already logged in
  useEffect(() => {
    if (token) {
      router.push('/');
    }
  }, [token, router]);

  // Don't render login form if already logged in
  if (token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <div className="text-white text-xl">Redirecting...</div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const response = await authApi.login({
          email: formData.email,
          password: formData.password,
        });
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('refresh_token', response.refresh_token);
        setToken(response.access_token);
        const user = await authApi.getCurrentUser();
        setUser(user);
        router.push('/');
      } else {
        await authApi.register({
          email: formData.email,
          password: formData.password,
          name: formData.name,
        });
        const response = await authApi.login({
          email: formData.email,
          password: formData.password,
        });
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('refresh_token', response.refresh_token);
        setToken(response.access_token);
        const user = await authApi.getCurrentUser();
        setUser(user);
        router.push('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);

    try {
      const response = await authApi.googleLogin();
      window.location.href = response.authorization_url;
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to initiate Google login');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-dark-bg">
      {/* Left side - Landing content */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-12 flex-col justify-center relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full border-2 border-white"></div>
          <div className="absolute bottom-32 right-20 w-96 h-96 rounded-full border-2 border-white"></div>
          <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full border-2 border-white"></div>
        </div>

        <div className="relative z-10 max-w-lg">
          <h1 className="text-5xl font-bold text-white mb-6">Topoi</h1>
          <p className="text-2xl text-blue-100 mb-8">
            Your personal map for the places that matter.
          </p>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Save Your Favorite Places</h3>
                <p className="text-blue-200">Click anywhere on the map to save restaurants, cafes, parks, and more.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Organize with Tags & Collections</h3>
                <p className="text-blue-200">Create custom tags and collections to keep your places organized.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Share with Friends</h3>
                <p className="text-blue-200">Share individual places or entire collections via public links.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
        <div className="max-w-md w-full space-y-8">
          {/* Mobile header - only shown on small screens */}
          <div className="text-center lg:hidden">
            <h1 className="text-4xl font-bold text-white mb-2">Topoi</h1>
            <p className="text-gray-400">Your personal map for the places that matter</p>
          </div>

          {/* Desktop header */}
          <div className="hidden lg:block text-center">
            <h2 className="text-3xl font-bold text-white mb-2">
              {isLogin ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-gray-400">
              {isLogin ? 'Sign in to access your saved places' : 'Start mapping your favorite spots'}
            </p>
          </div>

          <div className="card">
            <div className="flex justify-center mb-6">
              <div className="bg-dark-hover rounded-lg p-1 flex">
                <button
                  type="button"
                  onClick={() => setIsLogin(true)}
                  className={`px-6 py-2 rounded transition-colors ${
                    isLogin
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => setIsLogin(false)}
                  className={`px-6 py-2 rounded transition-colors ${
                    !isLogin
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Sign Up
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                    Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    required={!isLogin}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                    placeholder="John Doe"
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-field"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input-field"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>

              {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : isLogin ? 'Login' : 'Sign Up'}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-dark-card text-gray-400">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-2 bg-white hover:bg-gray-100 text-gray-900 font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {googleLoading ? 'Loading...' : 'Sign in with Google'}
            </button>
          </div>

          {/* Footer text */}
          <p className="text-center text-gray-500 text-sm">
            By signing up, you agree to save your favorite places and never forget them again.
          </p>
        </div>
      </div>
    </div>
  );
}
