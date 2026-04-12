import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Zap, 
  ShieldCheck, 
  Users,
  Target,
  Award,
  BrainCircuit,
  TrendingUp,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { cn } from '@/lib/utils';

export const Dashboard = () => {
  const { user, userData } = useAuth();
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecent = async () => {
      if (!user) return;
      try {
        const q = query(
          collection(db, 'interview_sessions'),
          where('userId', '==', user.uid),
          orderBy('timestamp', 'desc'),
          limit(3)
        );
        const querySnapshot = await getDocs(q);
        setRecentSessions(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Error fetching recent sessions:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecent();
  }, [user]);

  const avgScore = recentSessions.length > 0 
    ? Math.round(recentSessions.reduce((acc, s) => acc + s.score, 0) / recentSessions.length)
    : (userData?.readiness_score || 65);

  const streak = userData?.streak || 1;

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Welcome back, <span className="text-indigo-400">{userData?.full_name || user?.displayName || user?.email?.split('@')[0] || 'User'}</span>!
          </h1>
          <p className="text-slate-400 text-lg">Your interview readiness is looking strong today.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Live System Status: Optimal</span>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/40 border border-slate-800/50 rounded-3xl p-8 space-y-6 backdrop-blur-md relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Target size={80} />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Readiness Score</p>
            <p className="text-5xl font-bold text-white">{avgScore}%</p>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-indigo-500"
              initial={{ width: 0 }}
              animate={{ width: `${avgScore}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
          <p className="text-xs text-slate-400">Based on your last {recentSessions.length || 'initial'} performance metrics.</p>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/50 rounded-3xl p-8 space-y-6 backdrop-blur-md relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap size={80} />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Current Streak</p>
            <p className="text-5xl font-bold text-emerald-400">{streak} Days</p>
          </div>
          <div className="flex gap-1.5">
            {[...Array(7)].map((_, i) => (
              <div key={`streak-day-${i}`} className={cn("h-1.5 flex-1 rounded-full", i < streak % 7 ? "bg-emerald-500" : "bg-slate-800")} />
            ))}
          </div>
          <p className="text-xs text-slate-400">Keep it up! You're in the top 15% of active users.</p>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/50 rounded-3xl p-8 space-y-6 backdrop-blur-md relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <BrainCircuit size={80} />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Coding Mastery</p>
            <p className="text-5xl font-bold text-white">Level 4</p>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
              <span className="text-slate-500">Global Rank</span>
              <span className="text-indigo-400">Top 5%</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 w-[92%]" />
            </div>
          </div>
          <p className="text-xs text-slate-400">You've solved 12 problems this week. Keep it up!</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-8 space-y-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles size={24} className="text-indigo-400" />
            Recommended Practice
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { 
                title: "Domain Interview", 
                desc: "Technical screening on your specialization.",
                icon: Target,
                color: "text-indigo-400",
                bg: "bg-indigo-500/10",
                path: "/interview/domain"
              },
              { 
                title: "Resume Analysis", 
                desc: "AI-driven questions based on experience.",
                icon: Award,
                color: "text-emerald-400",
                bg: "bg-emerald-500/10",
                path: "/interview/resume"
              },
              { 
                title: "Coding Practice", 
                desc: "Master algorithms and data structures.",
                icon: BrainCircuit,
                color: "text-amber-400",
                bg: "bg-amber-500/10",
                path: "/coding"
              }
            ].map((action) => (
              <Link 
                key={action.path} 
                to={action.path}
                className="group p-6 bg-slate-900/40 border border-slate-800/50 rounded-3xl hover:bg-slate-800/50 transition-all space-y-4"
              >
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center ring-1 ring-white/5", action.bg)}>
                  <action.icon className={action.color} size={24} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">{action.title}</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">{action.desc}</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-widest pt-2">
                  Start Session
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-4 space-y-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp size={24} className="text-emerald-400" />
            Recent Activity
          </h3>
          <div className="bg-slate-900/40 border border-slate-800/50 rounded-3xl p-6 space-y-6 backdrop-blur-md">
            <div className="space-y-4">
              {recentSessions.map((session, i) => (
                <div key={session.id || `session-${i}`} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-800/30 transition-colors">
                  <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center ring-1 ring-indigo-500/20">
                    <Zap className="text-indigo-400" size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{session.domain}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      {session.timestamp?.toDate().toLocaleDateString() || 'N/A'} • {session.score}%
                    </p>
                  </div>
                </div>
              ))}
              {recentSessions.length === 0 && (
                <div className="text-center py-8 space-y-3">
                  <div className="w-12 h-12 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto">
                    <Target className="text-slate-600" size={24} />
                  </div>
                  <p className="text-xs text-slate-500 font-medium">No recent activity. Time to practice!</p>
                </div>
              )}
            </div>
            <Link 
              to="/progress"
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
            >
              View Full History
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
