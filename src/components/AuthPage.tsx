import { useState } from 'react';
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';

const ROLES = [
  { id: 'manager', label: 'Менеджер' },
  { id: 'copywriter', label: 'Копирайтер' },
  { id: 'designer', label: 'Дизайнер' },
  { id: 'client', label: 'Клиент' },
] as const;

export function AuthPage() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<(typeof ROLES)[number]['id']>('manager');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');

    const result = mode === 'sign-in'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { role } } });

    setBusy(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }

    if (mode === 'sign-in' && result.data.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', result.data.user.id)
        .maybeSingle();

      if (profileError || !profile || profile.role !== role) {
        await supabase.auth.signOut();
        setError('Для этого аккаунта выбрана другая роль. Проверьте роль и повторите вход.');
        setBusy(false);
        return;
      }
    }

    if (mode === 'sign-up' && !result.data.session) {
      setMessage('Регистрация создана. Проверьте почту и подтвердите адрес.');
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
        <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-5">
          <LockKeyhole size={22} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">ФЦ БАС</h1>
        <p className="text-sm text-slate-500 mb-7">
          {mode === 'sign-in' ? 'Войдите в рабочее пространство проекта' : 'Создайте аккаунт для доступа к проекту'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="block text-xs font-medium text-slate-600 mb-1">Email</span>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:border-blue-500" />
            </div>
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-slate-600 mb-1">Роль аккаунта</span>
            <select value={role} onChange={(event) => setRole(event.target.value as typeof role)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500">
              {ROLES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-slate-600 mb-1">Пароль</span>
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={6} required className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
          </label>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
          {message && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">{message}</p>}

          <button disabled={busy} className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 text-white py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
            {busy ? 'Подождите...' : mode === 'sign-in' ? 'Войти' : 'Зарегистрироваться'}
            <ArrowRight size={16} />
          </button>
        </form>

        <button type="button" onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setError(''); setMessage(''); }} className="w-full mt-5 text-sm text-blue-600 hover:text-blue-800">
          {mode === 'sign-in' ? 'Создать новый аккаунт' : 'У меня уже есть аккаунт'}
        </button>
      </div>
    </main>
  );
}
