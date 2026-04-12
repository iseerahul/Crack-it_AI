import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Interview } from './pages/Interview';
import { Coding } from './pages/Coding';
import { SkillGap } from './pages/SkillGap';
import { Progress } from './pages/Progress';
import { Profile } from './pages/Profile';
import { Landing } from './pages/Landing';
import { ResumeInterview } from './pages/ResumeInterview';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { AuthUI } from './components/auth/AuthUI';
import { useAuth } from './hooks/useAuth';

export default function App() {
  const { user, loading } = useAuth();
  const [showAuth, setShowAuth] = React.useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    if (showAuth) {
      return <AuthUI />;
    }
    return <Landing onLogin={() => setShowAuth(true)} />;
  }

  return (
    <Router>
      <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          <main className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scrollbar">
            <div className="max-w-7xl mx-auto space-y-10">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/interview/:type" element={<Interview />} />
                <Route path="/interview/resume" element={<ResumeInterview />} />
                <Route path="/coding" element={<Coding />} />
                <Route path="/skill-gap" element={<SkillGap />} />
                <Route path="/progress" element={<Progress />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </Router>
  );
}
