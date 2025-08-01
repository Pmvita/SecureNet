import React, { useState } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LockClosedIcon,
  ShieldCheckIcon,
  StarIcon,
  Cog6ToothIcon,
  UserIcon,
  EyeIcon,
  EyeSlashIcon,
  RocketLaunchIcon,
  CpuChipIcon,
  MagnifyingGlassIcon,
  BoltIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, isAuthenticated } = useAuth();
  const location = useLocation();
  
  // Get the intended destination or default to dashboard
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  // If already authenticated, redirect
  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    setIsSubmitting(true);
    setError('');
    
    try {
      await login(username, password);
    } catch (error) {
      setError('Invalid username or password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (user: { username: string; password: string }) => {
    setIsSubmitting(true);
    setError('');
    
    try {
      await login(user.username, user.password);
    } catch (error) {
      setError('Quick login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 text-gray-900 dark:from-dark-200 dark:via-dark-100 dark:to-dark-200 dark:text-gray-100">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header with Back Navigation */}
        <header className="flex-shrink-0 py-6 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <Link 
              to="/" 
              className="inline-flex items-center text-gray-400 hover:text-white transition-colors group"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2 group-hover:translate-x-1 transition-transform" />
              Back to Home
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-md mx-auto">
            {/* Logo and Header */}
            <div className="text-center mb-8">
              <Link 
                to="/" 
                className="inline-flex items-center text-primary-500 hover:text-primary-400 transition-colors group mb-4"
              >
                <ShieldCheckIcon className="h-10 w-10 mr-3 group-hover:scale-110 transition-transform" />
                <span className="text-3xl font-bold">SecureNet</span>
              </Link>
              <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
              <p className="text-gray-300">Sign in to your SecureNet account</p>
            </div>

            {/* Login Form */}
            <div className="glass-card p-8 shadow-2xl">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Error Message */}
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <div className="flex items-center">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
                      <p className="text-red-400 text-sm">{error}</p>
                    </div>
                  </div>
                )}

                {/* Username Field */}
                <div>
                  <label htmlFor="username" className="block text-sm font-semibold text-gray-300 mb-2">
                    Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={isSubmitting}
                      required
                      autoComplete="username"
                      className="input-field w-full pl-10 transition-all duration-200 focus:border-primary-500"
                      placeholder="Enter your username"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LockClosedIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting}
                      required
                      autoComplete="current-password"
                      className="input-field w-full pl-10 pr-10 transition-all duration-200 focus:border-primary-500"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300 transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isSubmitting}
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full btn-primary flex items-center justify-center py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting || !username || !password}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Signing In...
                    </>
                  ) : (
                    <>
                      <RocketLaunchIcon className="h-5 w-5 mr-2" />
                      Sign In
                    </>
                  )}
                </button>
              </form>

              {/* Quick Login Options (Development) */}
              <div className="mt-8 pt-6 border-t border-gray-700">
                <p className="text-sm text-gray-400 mb-4 text-center">Quick Login (Development)</p>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => handleQuickLogin({ username: 'admin', password: 'platform123' })}
                    disabled={isSubmitting}
                    className="flex items-center justify-between p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center">
                      <Cog6ToothIcon className="h-4 w-4 text-blue-400 mr-2" />
                      <span className="text-sm">Admin (Security Admin)</span>
                    </div>
                    <span className="text-xs text-gray-400">admin/platform123</span>
                  </button>
                  <button
                    onClick={() => handleQuickLogin({ username: 'user', password: 'enduser123' })}
                    disabled={isSubmitting}
                    className="flex items-center justify-between p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center">
                      <UserIcon className="h-4 w-4 text-green-400 mr-2" />
                      <span className="text-sm">User (SOC Analyst)</span>
                    </div>
                    <span className="text-xs text-gray-400">user/enduser123</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Sign Up Link */}
            <div className="text-center mt-6">
              <p className="text-gray-400">
                Don't have an account?{' '}
                <Link 
                  to="/signup" 
                  className="text-primary-400 hover:text-primary-300 font-medium transition-colors hover:underline"
                >
                  Sign up for SecureNet
                </Link>
              </p>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="flex-shrink-0 py-6 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Security Features */}
            <div className="flex justify-center space-x-8 mb-4">
              <div className="flex items-center text-gray-400 text-sm">
                <CpuChipIcon className="h-4 w-4 mr-2 text-primary-400" />
                AI-Powered
              </div>
              <div className="flex items-center text-gray-400 text-sm">
                <MagnifyingGlassIcon className="h-4 w-4 mr-2 text-green-400" />
                Real-time Monitoring
              </div>
              <div className="flex items-center text-gray-400 text-sm">
                <BoltIcon className="h-4 w-4 mr-2 text-purple-400" />
                Enterprise Grade
              </div>
            </div>
            
            {/* Copyright */}
            <div className="text-center">
              <p className="text-gray-500 text-xs">
                © 2025 Pierre Mvita. All Rights Reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}; 