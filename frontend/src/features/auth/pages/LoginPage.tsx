import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setIsSubmitting(true);
    try {
      await login(username, password);
    } catch (error) {
      // Error is handled by the auth context
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      {/* Background with animated gradient */}
      <div className="login-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      <div className="login-container">
        {/* Logo and Header */}
        <div className="login-header">
          <div className="logo-container">
            <img 
              src="/securenet-logo.png" 
              alt="SecureNet Logo" 
              className="logo"
            />
          </div>
          <h1 className="brand-title">SecureNet</h1>
          <p className="brand-subtitle">AI-Powered Network Security Platform</p>
          <div className="security-badge">
            <span className="shield-icon">🛡️</span>
            <span>Enterprise Security</span>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              <span className="label-icon">👤</span>
              Username
            </label>
            <div className="input-wrapper">
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isSubmitting}
                required
                autoComplete="username"
                className="form-input"
                placeholder="Enter your username"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              <span className="label-icon">🔒</span>
              Password
            </label>
            <div className="input-wrapper password-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                required
                autoComplete="current-password"
                className="form-input"
                placeholder="Enter your password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isSubmitting}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={`login-button ${isSubmitting ? 'loading' : ''}`}
            disabled={isSubmitting || !username || !password}
          >
            {isSubmitting ? (
              <>
                <span className="loading-spinner"></span>
                Authenticating...
              </>
            ) : (
              <>
                <span className="button-icon">🚀</span>
                Access SecureNet
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="login-footer">
          <div className="security-features">
            <div className="feature">
              <span className="feature-icon">🤖</span>
              <span>AI-Powered</span>
            </div>
            <div className="feature">
              <span className="feature-icon">🔍</span>
              <span>Real-time Monitoring</span>
            </div>
            <div className="feature">
              <span className="feature-icon">⚡</span>
              <span>Enterprise Grade</span>
            </div>
          </div>
          <p className="copyright">© 2025 Pierre Mvita. All Rights Reserved.</p>
        </div>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
          padding: 1rem;
        }

        .login-background {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          overflow: hidden;
          z-index: 0;
        }

        .gradient-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          opacity: 0.3;
          animation: float 6s ease-in-out infinite;
        }

        .orb-1 {
          width: 300px;
          height: 300px;
          background: linear-gradient(45deg, #3b82f6, #8b5cf6);
          top: -150px;
          left: -150px;
          animation-delay: 0s;
        }

        .orb-2 {
          width: 200px;
          height: 200px;
          background: linear-gradient(45deg, #06b6d4, #3b82f6);
          bottom: -100px;
          right: -100px;
          animation-delay: 2s;
        }

        .orb-3 {
          width: 150px;
          height: 150px;
          background: linear-gradient(45deg, #8b5cf6, #ec4899);
          top: 50%;
          right: -75px;
          animation-delay: 4s;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-20px) rotate(120deg); }
          66% { transform: translateY(10px) rotate(240deg); }
        }

        .login-container {
          width: 100%;
          max-width: 420px;
          padding: 2.5rem;
          background: rgba(36, 36, 36, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 1rem;
          box-shadow: 
            0 20px 25px -5px rgba(0, 0, 0, 0.3),
            0 10px 10px -5px rgba(0, 0, 0, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          position: relative;
          z-index: 1;
          animation: slideUp 0.6s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .login-header {
          text-align: center;
          margin-bottom: 2.5rem;
        }

        .logo-container {
          margin-bottom: 1rem;
          animation: logoGlow 2s ease-in-out infinite alternate;
        }

        .logo {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 3px solid rgba(59, 130, 246, 0.3);
          padding: 8px;
          background: rgba(59, 130, 246, 0.1);
          transition: all 0.3s ease;
        }

        .logo:hover {
          transform: scale(1.05);
          border-color: rgba(59, 130, 246, 0.6);
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
        }

        @keyframes logoGlow {
          from { box-shadow: 0 0 10px rgba(59, 130, 246, 0.2); }
          to { box-shadow: 0 0 20px rgba(59, 130, 246, 0.4); }
        }

        .brand-title {
          font-size: 2.5rem;
          font-weight: 700;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0.5rem 0;
          letter-spacing: -0.02em;
        }

        .brand-subtitle {
          color: rgba(255, 255, 255, 0.7);
          margin: 0.5rem 0 1rem;
          font-size: 0.95rem;
          font-weight: 400;
        }

        .security-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 2rem;
          color: #22c55e;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .shield-icon {
          font-size: 1rem;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
        }

        .label-icon {
          font-size: 1rem;
        }

        .input-wrapper {
          position: relative;
        }

        .password-wrapper {
          display: flex;
          align-items: center;
        }

        .form-input {
          width: 100%;
          padding: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.5rem;
          background: rgba(0, 0, 0, 0.3);
          color: white;
          font-size: 1rem;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }

        .form-input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .form-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 
            0 0 0 3px rgba(59, 130, 246, 0.1),
            0 0 20px rgba(59, 130, 246, 0.2);
          transform: translateY(-1px);
        }

        .form-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .password-toggle {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          font-size: 1.2rem;
          transition: color 0.2s ease;
          z-index: 2;
        }

        .password-toggle:hover {
          color: rgba(255, 255, 255, 0.9);
        }

        .password-toggle:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .login-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 1rem;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .login-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s ease;
        }

        .login-button:hover::before {
          left: 100%;
        }

        .login-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(59, 130, 246, 0.3);
        }

        .login-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .login-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .login-button.loading {
          background: linear-gradient(135deg, #6b7280, #9ca3af);
        }

        .button-icon {
          font-size: 1.1rem;
        }

        .loading-spinner {
          width: 1rem;
          height: 1rem;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .login-footer {
          text-align: center;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding-top: 1.5rem;
        }

        .security-features {
          display: flex;
          justify-content: space-around;
          margin-bottom: 1rem;
          gap: 0.5rem;
        }

        .feature {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.6);
        }

        .feature-icon {
          font-size: 1.2rem;
        }

        .copyright {
          color: rgba(255, 255, 255, 0.4);
          font-size: 0.75rem;
          margin: 0;
        }

        /* Responsive Design */
        @media (max-width: 480px) {
          .login-container {
            padding: 2rem 1.5rem;
            margin: 1rem;
          }

          .brand-title {
            font-size: 2rem;
          }

          .security-features {
            flex-direction: column;
            gap: 0.75rem;
          }

          .feature {
            flex-direction: row;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}; 