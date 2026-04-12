import React, { useEffect, useState } from 'react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { 
  TrendingUp, 
  Award, 
  Target, 
  Zap, 
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Download,
  History as HistoryIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const Progress = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      if (!user) return;
      try {
        const q = query(
          collection(db, 'interview_sessions'),
          where('userId', '==', user.uid),
          orderBy('timestamp', 'desc'),
          limit(10)
        );
        const querySnapshot = await getDocs(q);
        const sessionData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSessions(sessionData);
      } catch (err) {
        console.error("Error fetching sessions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [user]);

  const downloadSessionPDF = (session: any) => {
    const report = session.report;
    if (!report) return;
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.text("Interview Performance Report", 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Domain: ${session.domain}`, 20, 30);
    doc.text(`Overall Score: ${report.overall_score}%`, 20, 35);
    doc.text(`Date: ${session.timestamp?.toDate().toLocaleDateString() || 'N/A'}`, 20, 40);
    
    doc.setFontSize(16);
    doc.text("Summary", 20, 55);
    doc.setFontSize(10);
    const splitSummary = doc.splitTextToSize(report.summary, 170);
    doc.text(splitSummary, 20, 65);
    
    doc.setFontSize(16);
    doc.text("Strengths", 20, 90);
    doc.setFontSize(10);
    report.strengths.forEach((s: string, i: number) => {
      doc.text(`• ${s}`, 25, 100 + (i * 7));
    });
    
    doc.setFontSize(16);
    doc.text("Areas for Improvement", 20, 130);
    doc.setFontSize(10);
    report.improvements.forEach((im: string, i: number) => {
      doc.text(`• ${im}`, 25, 140 + (i * 7));
    });

    const tableData = session.history.map((item: any, idx: number) => [
      `Q${idx + 1}`,
      item.question,
      `${item.score}/10`
    ]);

    autoTable(doc, {
      startY: 170,
      head: [['#', 'Question', 'Score']],
      body: tableData,
    });
    
    doc.save(`Interview_Report_${session.domain.replace(/\s+/g, '_')}.pdf`);
  };

  const chartData = sessions.slice().reverse().map(s => ({
    name: s.timestamp?.toDate().toLocaleDateString('en-US', { weekday: 'short' }) || 'N/A',
    score: s.score
  }));

  const avgScore = sessions.length > 0 
    ? Math.round(sessions.reduce((acc, s) => acc + s.score, 0) / sessions.length)
    : 0;

  const readinessScore = avgScore > 0 ? Math.min(100, avgScore + 5) : 65;

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-white">Performance Analytics</h1>
          <p className="text-slate-400 text-lg">Track your growth across technical and behavioral dimensions.</p>
        </div>
      </header>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Overall Score", value: `${avgScore}/100`, trend: "+12%", icon: Award, color: "text-indigo-400", bg: "bg-indigo-500/10" },
          { label: "Readiness Score", value: `${readinessScore}%`, trend: "+5%", icon: Target, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Avg. Confidence", value: sessions.length > 0 ? "High" : "N/A", trend: "Stable", icon: Zap, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Sessions", value: sessions.length, trend: `+${sessions.length}`, icon: Clock, color: "text-blue-400", bg: "bg-blue-500/10" },
        ].map((stat, idx) => (
          <div key={idx} className="bg-slate-900/40 border border-slate-800/50 rounded-3xl p-6 space-y-4 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center ring-1 ring-white/5", stat.bg)}>
                <stat.icon className={stat.color} size={20} />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Progress Trend */}
        <div className="lg:col-span-8 bg-slate-900/40 border border-slate-800/50 rounded-3xl p-8 backdrop-blur-md">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Score Progression</h3>
              <p className="text-xs text-slate-500 font-medium">Your interview performance over recent sessions</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            {sessions.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }} />
                  <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={4} dot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#0f172a' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 font-medium">No session data available yet.</div>
            )}
          </div>
        </div>

        {/* Skill Radar */}
        <div className="lg:col-span-4 bg-slate-900/40 border border-slate-800/50 rounded-3xl p-8 backdrop-blur-md">
          <h3 className="text-lg font-bold text-white mb-8">Domain Mastery</h3>
          <div className="space-y-6">
            {sessions.length > 0 ? sessions[0].report.domain_mastery.map((dm: any, i: number) => (
              <div key={`mastery-${dm.topic}-${i}`} className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                  <span className="text-slate-500">{dm.topic}</span>
                  <span className="text-indigo-400">{dm.score}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500" style={{ width: `${dm.score}%` }} />
                </div>
              </div>
            )) : (
              <p className="text-slate-500 text-sm">Complete an interview to see your mastery breakdown.</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent History */}
      <div className="bg-slate-900/40 border border-slate-800/50 rounded-3xl p-8 backdrop-blur-md space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <HistoryIcon size={20} className="text-indigo-400" />
            Interview History
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map((session) => (
            <div key={session.id} className="flex flex-col p-6 bg-slate-950/50 border border-slate-800/50 rounded-3xl hover:bg-slate-800/50 transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center ring-1 ring-indigo-500/20">
                    <Zap className="text-indigo-400" size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{session.domain}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      {session.timestamp?.toDate().toLocaleDateString() || 'N/A'}
                    </p>
                  </div>
                </div>
                <span className="text-xl font-bold text-white">{session.score}%</span>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => downloadSessionPDF(session)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Download size={14} />
                  Download Report
                </button>
              </div>
            </div>
          ))}
          {sessions.length === 0 && !loading && (
            <div className="col-span-full py-12 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto">
                <HistoryIcon className="text-slate-600" size={32} />
              </div>
              <p className="text-slate-500 font-medium">No interview history found. Start your first session!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
