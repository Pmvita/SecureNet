import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppErrorBoundary } from './components/error/AppErrorBoundary';

// Vercel-specific landing page
import LandingPage from './pages/LandingPage';

// Simple Vercel App Routes - Static Landing Page Only
const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* All routes lead to landing page */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/coming-soon" element={<LandingPage />} />
      <Route path="/login" element={<LandingPage />} />
      <Route path="/signup" element={<LandingPage />} />
      <Route path="/dashboard" element={<LandingPage />} />
      <Route path="/admin" element={<LandingPage />} />
      <Route path="*" element={<LandingPage />} />
    </Routes>
  );
};

// Simplified Vercel App - No Authentication or Complex State Management
function App() {
  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppErrorBoundary>
  );
}

export default App;