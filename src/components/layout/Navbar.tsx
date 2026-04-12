import React, { useState, useEffect } from 'react';
import { Search, Bell, User, ChevronDown, LogOut } from 'lucide-react';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';

export const Navbar = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ full_name: string; avatar_url: string } | null>(null);

  useEffect(() => {
    if (user) {
      getProfile();
    }
  }, [user]);

  async function getProfile() {
    try {
      const docRef = doc(db, 'users', user?.uid || '');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile({
          full_name: data.full_name,
          avatar_url: data.avatar_url
        });
      }
    } catch (error) {
      console.error('Error loading profile in navbar:', error);
    }
  }

  const handleLogout = async () => {
    await auth.signOut();
  };

  return (
    <header className="h-20 border-b border-slate-800/50 bg-slate-950/50 backdrop-blur-md px-6 lg:px-10 flex items-center justify-between sticky top-0 z-40">
      <div className="flex-1 max-w-xl relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
        <input 
          type="text" 
          placeholder="Search modules, questions, or analytics..." 
          className="w-full bg-slate-900/50 border border-slate-800 rounded-full py-2.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all placeholder:text-slate-600"
        />
      </div>

      <div className="flex items-center gap-4 lg:gap-6">
        <button className="relative p-2.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-full transition-all">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full border-2 border-slate-950" />
        </button>

        <div className="h-8 w-px bg-slate-800 mx-2" />

        <div className="relative group">
          <button className="flex items-center gap-3 pl-2 pr-3 py-1.5 hover:bg-slate-800/50 rounded-full transition-all group">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20 ring-2 ring-slate-950 overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                profile?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'
              )}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-slate-200 leading-none mb-1">{profile?.full_name || 'User'}</p>
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Pro Member</p>
            </div>
            <ChevronDown size={16} className="text-slate-500 group-hover:text-slate-300 transition-colors" />
          </button>

          <div className="absolute top-full right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 p-2 z-50">
            <Link 
              to="/profile"
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800 transition-all text-sm font-bold"
            >
              <User size={16} />
              Profile Settings
            </Link>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 transition-all text-sm font-bold"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

