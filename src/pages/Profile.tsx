import React, { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'motion/react';
import { 
  User, 
  Mail, 
  Briefcase, 
  Camera, 
  Save, 
  Loader2, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const Profile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [profile, setProfile] = useState({
    full_name: '',
    avatar_url: '',
    professional_summary: ''
  });

  useEffect(() => {
    if (user) {
      getProfile();
    }
  }, [user]);

  async function getProfile() {
    try {
      setLoading(true);
      if (!user) return;

      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile({
          full_name: data.full_name || '',
          avatar_url: data.avatar_url || '',
          professional_summary: data.professional_summary || ''
        });
      }
    } catch (error: any) {
      console.error('Error loading user data!', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage(null);
      if (!user) return;

      const updates = {
        ...profile,
        updated_at: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', user.uid), updates, { merge: true });

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-white">Personal Profile</h1>
        <p className="text-slate-400">Manage your professional identity and interview preferences.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900/50 border border-slate-800/50 rounded-3xl p-8 text-center space-y-6 backdrop-blur-md">
            <div className="relative inline-block">
              <div className="w-32 h-32 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-2xl ring-4 ring-slate-950 overflow-hidden">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  profile.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()
                )}
              </div>
              <button className="absolute bottom-0 right-0 p-2 bg-indigo-600 rounded-full text-white shadow-lg hover:bg-indigo-500 transition-colors ring-4 ring-slate-950">
                <Camera size={18} />
              </button>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{profile.full_name || 'Your Name'}</h2>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>
            <div className="pt-4 border-t border-slate-800/50">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 text-left">
                <span>Profile Completion</span>
                <span className="text-indigo-400">75%</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 w-3/4" />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <form onSubmit={updateProfile} className="bg-slate-900/50 border border-slate-800/50 rounded-3xl p-8 space-y-8 backdrop-blur-md">
            {message && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "p-4 rounded-2xl flex items-center gap-3 text-sm font-medium",
                  message.type === 'success' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                )}
              >
                {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                {message.text}
              </motion.div>
            )}

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <User size={14} className="text-indigo-400" />
                  Full Name
                </label>
                <input 
                  type="text" 
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Mail size={14} className="text-indigo-400" />
                  Email Address
                </label>
                <input 
                  type="email" 
                  value={user?.email}
                  disabled
                  className="w-full bg-slate-950/30 border border-slate-800/50 rounded-xl px-4 py-3 text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Briefcase size={14} className="text-indigo-400" />
                  Professional Summary
                </label>
                <textarea 
                  value={profile.professional_summary}
                  onChange={(e) => setProfile({ ...profile, professional_summary: e.target.value })}
                  placeholder="Briefly describe your professional background and goals..."
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all min-h-[120px] resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Camera size={14} className="text-indigo-400" />
                  Avatar URL
                </label>
                <input 
                  type="text" 
                  value={profile.avatar_url}
                  onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800/50">
              <button 
                type="submit"
                disabled={saving}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl font-bold shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    Save Profile Settings
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
