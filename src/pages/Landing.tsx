import React from 'react';
import { motion } from 'motion/react';
import { 
  BrainCircuit, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  Users, 
  BarChart3,
  CheckCircle2
} from 'lucide-react';

export const Landing = ({ onLogin }: { onLogin: () => void }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 overflow-x-hidden">
      {/* Hero Section */}
      <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-600/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-10 relative z-10 text-center space-y-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-400 rounded-full text-sm font-bold ring-1 ring-indigo-500/20 backdrop-blur-md"
          >
            <Sparkles size={16} />
            The Future of Interview Prep is Here
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl lg:text-8xl font-bold tracking-tight text-white leading-[1.1]"
          >
            Master Your Next <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
              Technical Interview
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-2xl mx-auto text-slate-400 text-xl leading-relaxed"
          >
            AI-powered adaptive interviews, coding practice, and behavioral analytics. 
            Get real-time feedback and a structured roadmap to your dream role.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6"
          >
            <button 
              onClick={onLogin}
              className="w-full sm:w-auto px-10 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-lg shadow-2xl shadow-indigo-500/30 transition-all flex items-center justify-center gap-3 group"
            >
              Get Started for Free
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-32 border-t border-slate-900">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {[
            {
              icon: Zap,
              title: "Adaptive Learning",
              desc: "Our ML engine adjusts interview difficulty in real-time based on your performance."
            },
            {
              icon: ShieldCheck,
              title: "Behavioral Insights",
              desc: "Track confidence, fluency, and fumbling scores using our advanced camera system."
            },
            {
              icon: BarChart3,
              title: "Deep Analytics",
              desc: "Get industry-level reports with technical strengths, weaknesses, and roadmaps."
            }
          ].map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="space-y-6"
            >
              <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center ring-1 ring-indigo-500/20">
                <feature.icon className="text-indigo-400" size={28} />
              </div>
              <h3 className="text-2xl font-bold text-white">{feature.title}</h3>
              <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

import { Sparkles } from 'lucide-react';
