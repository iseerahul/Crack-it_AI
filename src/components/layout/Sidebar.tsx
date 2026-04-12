import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Mic2, 
  Code2, 
  Target, 
  BarChart3, 
  User,
  Settings, 
  LogOut,
  BrainCircuit
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Mic2, label: 'Domain Interview', path: '/interview/domain' },
  { icon: BrainCircuit, label: 'Resume Interview', path: '/interview/resume' },
  { icon: Code2, label: 'Coding Practice', path: '/coding' },
  { icon: Target, label: 'Skill Gap', path: '/skill-gap' },
  { icon: BarChart3, label: 'Progress', path: '/progress' },
  { icon: User, label: 'Profile', path: '/profile' },
];

export const Sidebar = () => {
  return (
    <aside className="w-72 hidden lg:flex flex-col bg-slate-900/50 backdrop-blur-xl border-r border-slate-800/50 p-6">
      <div className="flex items-center gap-3 px-2 mb-12">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-400/30">
          <BrainCircuit className="text-white" size={24} />
        </div>
        <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
          InterviewAI
        </span>
      </div>

      <nav className="flex-1 space-y-1.5">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
              isActive 
                ? "bg-indigo-500/10 text-indigo-400 font-medium ring-1 ring-indigo-500/20" 
                : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
            )}
          >
            <item.icon size={20} className={cn("transition-transform group-hover:scale-110")} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="pt-6 mt-6 border-t border-slate-800/50 space-y-1.5">
        <NavLink 
          to="/profile"
          className={({ isActive }) => cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
            isActive 
              ? "bg-indigo-500/10 text-indigo-400 font-medium ring-1 ring-indigo-500/20" 
              : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
          )}
        >
          <Settings size={20} />
          <span>Settings</span>
        </NavLink>
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-all">
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};
