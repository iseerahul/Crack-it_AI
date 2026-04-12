import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Target, 
  Search, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  BrainCircuit,
  Zap,
  ShieldCheck,
  Trophy,
  Cpu,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const SkillGap = () => {
  const [role, setRole] = useState("Senior Frontend Engineer");
  const [skills, setSkills] = useState("React, TypeScript, Tailwind CSS, Node.js");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<any | null>(null);

  const analyzeGap = async () => {
    setIsAnalyzing(true);
    
    // AI Analysis
    try {
      const response = await fetch('/api/skill-gap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, skills })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        const errorText = data.error || 'Analysis failed';
        if (errorText.includes('401') || errorText.toLowerCase().includes('invalid api key')) {
          throw new Error('Your API key is invalid. Please update it in the Settings > Secrets menu.');
        }
        throw new Error(errorText);
      }
      
      setReport(data);
    } catch (err: any) {
      console.error(err);
      setReport({ 
        error: `Analysis failed: ${err.message}. Please check your API configuration.` 
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      <header className="text-center space-y-4">
        <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center mx-auto ring-1 ring-blue-500/20 mb-6">
          <Target className="text-blue-500" size={40} />
        </div>
        <h1 className="text-4xl font-bold text-white">Skill Gap Analyzer</h1>
        <p className="text-slate-400 text-lg">Compare your current skill set against industry requirements and get a personalized learning roadmap.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/50 border border-slate-800/50 rounded-3xl p-8 space-y-8 backdrop-blur-md">
            <div className="space-y-4">
              <label className="text-sm font-bold text-slate-400 uppercase tracking-widest block">Target Role</label>
              <input 
                type="text" 
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 px-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all"
                placeholder="e.g. Senior Frontend Engineer"
              />
            </div>

            <div className="space-y-4">
              <label className="text-sm font-bold text-slate-400 uppercase tracking-widest block">Your Skills</label>
              <textarea 
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 px-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all min-h-[120px]"
                placeholder="e.g. React, TypeScript, Node.js..."
              />
            </div>

            <button 
              onClick={analyzeGap}
              disabled={isAnalyzing}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-2xl font-bold shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-3 group"
            >
              {isAnalyzing ? "Analyzing Skills..." : "Generate Gap Analysis"}
              {!isAnalyzing && <Search size={20} className="group-hover:scale-110 transition-transform" />}
            </button>
          </div>
        </div>

        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {!report ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full bg-slate-900/20 border border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center p-12 text-center space-y-4"
              >
                <BrainCircuit size={48} className="text-slate-700" />
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-slate-500">Ready to Analyze</h3>
                  <p className="text-slate-600 max-w-xs">Enter your target role and skills to see how you stack up against the competition.</p>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-8"
              >
                {/* Match Score Card */}
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 text-white shadow-2xl shadow-indigo-500/20 relative overflow-hidden transition-all duration-500">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-blue-100/80 text-xs font-bold uppercase tracking-widest">
                        Match Score
                      </p>
                      <h2 className="text-5xl font-bold">{report.match_score}%</h2>
                      {report.error && (
                        <div className="mt-4 p-3 bg-rose-500/20 backdrop-blur-md rounded-xl border border-rose-500/20 space-y-2">
                          <p className="text-[10px] text-rose-200 font-bold uppercase tracking-widest flex items-center gap-2">
                            <AlertCircle size={10} />
                            Analysis Error
                          </p>
                          <p className="text-xs text-rose-100 leading-relaxed">
                            {report.error}
                          </p>
                          <button 
                            onClick={analyzeGap}
                            className="mt-2 text-[10px] font-bold text-rose-200 uppercase tracking-widest hover:text-white transition-colors flex items-center gap-1"
                          >
                            <Zap size={10} />
                            Try Again
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center ring-1 ring-white/20">
                      <Sparkles size={40} className="text-indigo-100" />
                    </div>
                  </div>
                </div>

                {/* Skills Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-900/50 border border-slate-800/50 rounded-3xl p-6 space-y-4">
                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                      <CheckCircle2 size={14} />
                      Matched Skills
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {report.matched_skills.map((s: string, idx: number) => (
                        <span key={`${s}-${idx}`} className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-bold ring-1 ring-emerald-500/20">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="bg-slate-900/50 border border-slate-800/50 rounded-3xl p-6 space-y-4">
                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
                      <AlertCircle size={14} />
                      Missing Skills
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {report.missing_skills.map((s: string, idx: number) => (
                        <span key={`${s}-${idx}`} className="px-3 py-1 bg-amber-500/10 text-amber-400 rounded-lg text-xs font-bold ring-1 ring-amber-500/20">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Roadmap */}
                <div className="bg-slate-900/50 border border-slate-800/50 rounded-3xl p-8 space-y-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Zap size={20} className="text-blue-400" />
                    Personalized Learning Roadmap
                  </h3>
                  <div className="space-y-6">
                    {report.roadmap.map((step: any, idx: number) => (
                      <div key={idx} className="relative pl-8 border-l-2 border-slate-800 last:border-0 pb-6 last:pb-0">
                        <div className="absolute left-[-9px] top-0 w-4 h-4 bg-blue-500 rounded-full ring-4 ring-slate-950" />
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-white">{step.phase}</h4>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{step.duration}</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {step.focus.map((f: string, fIdx: number) => (
                              <span key={`${f}-${fIdx}`} className="text-xs text-slate-400 flex items-center gap-1.5">
                                <div className="w-1 h-1 bg-blue-500 rounded-full" />
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
