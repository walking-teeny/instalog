import React, { useState } from 'react';
import { Instagram, Loader2 } from 'lucide-react';
import { api, setToken, setUsername as setStoredUsername } from '../api';
import { getExtensionAccountUsername } from '../extensionBridge';

interface LoginViewProps {
  onLoginSuccess: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { token, username: loggedInUsername } = await api.login(username.trim(), password);

      const extensionUsername = await getExtensionAccountUsername();
      if (extensionUsername && extensionUsername.toLowerCase() !== loggedInUsername.toLowerCase()) {
        setError('확장 프로그램과 로그인 계정이 일치하지 않습니다.');
        return;
      }

      setToken(token);
      setStoredUsername(loggedInUsername);
      onLoginSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-[#e2e8f0] shadow-sm p-8 space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#00c73c] flex items-center justify-center">
            <Instagram className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-lg font-black text-[#111827]">InstaLog 로그인</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">아이디</label>
            <input
              type="text"
              required
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#00c73c] focus:bg-white transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">비밀번호</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#00c73c] focus:bg-white transition-all"
            />
          </div>

          {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#00c73c] hover:bg-[#00b035] disabled:opacity-60 text-white text-sm font-bold shadow-sm shadow-[#00c73c]/30 transition-all cursor-pointer"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            로그인
          </button>
        </form>
      </div>
    </div>
  );
};
