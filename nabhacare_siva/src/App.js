/**
 * Main App Integration Example
 * Technology: React Router, Context Integration, Component Composition
 * 
 * Shows how to integrate all offline components into the main app
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import StatusBanner from './components/StatusBanner';
import PatientDashboard from './pages/PatientDashboard';
import MedicalCenters from './pages/MedicalCenters';
import Prescriptions from './pages/Prescriptions';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Consultations from './pages/Consultations';
import VideoCall from './pages/VideoCall';
import Chatbot from './pages/Chatbot';
import Navbar from './components/Navbar';
import FloatingChatbot from './components/FloatingChatbot';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-dots">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <StatusBanner />
      <Navbar />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
      </div>
    </>
  );
};

// Login Page Component
const LoginPage = () => {
  return <Login />;
};

// Main App Component
const App = () => {
  return (
    <AuthProvider>
      <LanguageProvider>
        <ThemeProvider>
          <Router>
            <div className="App">
              <Routes>
            {/* Login Route */}
            <Route path="/login" element={<LoginPage />} />
            
            {/* Protected Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <PatientDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/medical-centers" element={
              <ProtectedRoute>
                <MedicalCenters />
              </ProtectedRoute>
            } />
            
            <Route path="/prescriptions" element={
              <ProtectedRoute>
                <Prescriptions />
              </ProtectedRoute>
            } />
            
            <Route path="/reports" element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            } />
            
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            
            <Route path="/consultations" element={
              <ProtectedRoute>
                <Consultations />
              </ProtectedRoute>
            } />
            
            <Route path="/chatbot" element={
              <ProtectedRoute>
                <Chatbot />
              </ProtectedRoute>
            } />
            
            {/* Public video call route - no authentication required */}
            <Route path="/call/:consultationId" element={<VideoCall />} />
            
            {/* Default Route */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </div>
            
            {/* Floating Chatbot */}
            <FloatingChatbot />
          </Router>
        </ThemeProvider>
      </LanguageProvider>
    </AuthProvider>
  );
};

export default App;