
import React, { useState, useEffect } from 'react';
import { translations } from './translations';
import { UserProfile, DailyTask, FoodItem, WeeklyCheckIn, AgeGroup } from './types';
import { getHealthPlan, getCheckInAnalysis } from './geminiService';
import { supabase } from './supabase';
import { 
  Activity, 
  ChevronRight, 
  Moon, 
  Sun, 
  CheckCircle2, 
  Circle, 
  TrendingUp, 
  Utensils, 
  Calendar,
  Award,
  Settings,
  RefreshCw,
  LogIn,
  LogOut,
  UserPlus,
  ArrowRight,
  ShieldAlert,
  Info
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// --- Components ---

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`bg-white dark:bg-slate-800 rounded-3xl soft-shadow border border-slate-100/50 dark:border-slate-700/50 p-6 ${className}`}>
    {children}
  </div>
);

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, className, ...props }) => (
  <button 
    {...props}
    className={`px-6 py-3 rounded-2xl font-semibold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${className}`}
  >
    {children}
  </button>
);

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [lang, setLang] = useState('pt');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [foodGuide, setFoodGuide] = useState<FoodItem[]>([]);
  const [checkIns, setCheckIns] = useState<WeeklyCheckIn[]>([]);
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(false);
  const [motivation, setMotivation] = useState('');
  const [view, setView] = useState<'dashboard' | 'tasks' | 'food' | 'checkin' | 'settings'>('dashboard');
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');

  const t = translations[lang];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserData(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserData(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const fetchUserData = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        setUserProfile(data.profile);
        setTasks(data.tasks || []);
        setFoodGuide(data.food_guide || []);
        setCheckIns(data.checkins || []);
        setPoints(data.points || 0);
        setMotivation(data.motivation || '');
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveUserData = async (updates: any) => {
    if (!session) return;
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: session.user.id, ...updates, updated_at: new Date() });
    if (error) console.error('Error saving profile:', error);
  };

  const determineAgeGroup = (age: number): AgeGroup => {
    if (age < 13) return 'child';
    if (age < 18) return 'teen';
    if (age < 30) return 'young-adult';
    if (age < 60) return 'adult';
    return 'senior';
  };

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = authView === 'login' 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    if (error) alert(error.message);
    setLoading(false);
  };

  const handleOnboarding = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const age = Number(formData.get('age'));
    const weight = Number(formData.get('weight'));
    const goalWeight = Number(formData.get('goalWeight'));
    
    const newUser: UserProfile = {
      name: formData.get('name') as string,
      age: age,
      ageGroup: determineAgeGroup(age),
      height: Number(formData.get('height')),
      weight: weight,
      goalWeight: goalWeight,
      goalType: goalWeight < weight ? 'lose' : 'gain',
      language: lang
    };

    try {
      const plan = await getHealthPlan(newUser);
      const initialTasks = plan.tasks.map((t: any, i: number) => ({ ...t, id: `t-${i}-${Date.now()}`, completed: false }));
      const initialCheckIn = { date: new Date().toLocaleDateString(), weight: newUser.weight, height: newUser.height, feedback: 'Bem-vindo(a)!' };
      
      const updates = {
        profile: newUser,
        tasks: initialTasks,
        food_guide: plan.foodGuide,
        motivation: plan.motivation,
        checkins: [initialCheckIn],
        points: 100
      };

      await saveUserData(updates);
      setUserProfile(newUser);
      setTasks(initialTasks);
      setFoodGuide(plan.foodGuide);
      setMotivation(plan.motivation);
      setCheckIns([initialCheckIn]);
      setPoints(100);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (id: string) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === id) {
        const newCompleted = !t.completed;
        if (newCompleted) setPoints(p => p + 10);
        return { ...t, completed: newCompleted };
      }
      return t;
    });
    setTasks(updatedTasks);
    await saveUserData({ tasks: updatedTasks, points: points + (updatedTasks.find(t=>t.id===id)?.completed ? 10 : 0) });
  };

  const handleWeeklyCheckIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userProfile) return;
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const currentWeight = Number(formData.get('weight'));
    const currentHeight = Number(formData.get('height'));

    try {
      const newCheckIns = [...checkIns, { date: new Date().toLocaleDateString(), weight: currentWeight, height: currentHeight, feedback: '' }];
      const feedback = await getCheckInAnalysis(userProfile, newCheckIns);
      newCheckIns[newCheckIns.length - 1].feedback = feedback;
      
      setCheckIns(newCheckIns);
      setPoints(p => p + 50);
      await saveUserData({ checkins: newCheckIns, points: points + 50 });
      setView('dashboard');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- Render Helpers ---

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-950 dark:to-slate-900">
        <Card className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-3xl mb-4 shadow-lg shadow-indigo-200 dark:shadow-none">
              <Activity className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">HealthJourney AI</h1>
            <p className="text-slate-500 text-sm mt-2">Seu parceiro inteligente para uma vida saudável</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-4">
              <input name="email" type="email" placeholder="E-mail" required className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 outline-none transition-all" />
              <input name="password" type="password" placeholder="Senha" required className="w-full px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 outline-none transition-all" />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100 dark:shadow-none">
              {loading ? <RefreshCw className="animate-spin" /> : (authView === 'login' ? <><LogIn size={20}/> Entrar</> : <><UserPlus size={20}/> Criar Conta</>)}
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-2 text-sm">
            <span className="text-slate-500">{authView === 'login' ? 'Não tem conta?' : 'Já tem conta?'}</span>
            <button onClick={() => setAuthView(authView === 'login' ? 'signup' : 'login')} className="text-indigo-600 font-bold hover:underline">
              {authView === 'login' ? 'Cadastre-se' : 'Faça login'}
            </button>
          </div>
        </Card>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
        <Card className="w-full max-w-lg">
          <h2 className="text-2xl font-bold mb-2">{t.onboardingTitle}</h2>
          <p className="text-slate-500 mb-8 text-sm flex items-center gap-2"><Info size={16}/> Preencha para criarmos seu plano personalizado com IA.</p>
          
          <form onSubmit={handleOnboarding} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.name}</label>
                <input name="name" required className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-700 outline-none focus:border-indigo-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.age}</label>
                <input name="age" type="number" required className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-700 outline-none focus:border-indigo-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.height}</label>
                <input name="height" type="number" required className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-700 outline-none focus:border-indigo-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.weight}</label>
                <input name="weight" type="number" step="0.1" required className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-700 outline-none focus:border-indigo-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.goal}</label>
                <input name="goalWeight" type="number" step="0.1" required className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-700 outline-none focus:border-indigo-500" />
              </div>
            </div>

            <Card className="bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30 p-4">
              <p className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                {t.safetyDisclaimer}
              </p>
            </Card>

            <Button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white">
              {loading ? <RefreshCw className="animate-spin" /> : <>{t.start} <ArrowRight size={20}/></>}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  // --- Views ---

  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">E aí, {userProfile.name}! 👋</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{motivation || t.motivation}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 soft-shadow px-6 py-3 rounded-3xl flex items-center gap-3 border border-slate-100 dark:border-slate-700 self-start">
          <div className="bg-amber-100 dark:bg-amber-900/40 p-2 rounded-xl text-amber-600 dark:text-amber-400">
            <Award size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.points}</p>
            <p className="text-lg font-black">{points}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 overflow-hidden flex flex-col">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <TrendingUp className="text-indigo-500" /> {t.progress}
          </h3>
          <div className="h-64 mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={checkIns}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#f1f5f9'} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" domain={['auto', 'auto']} fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: theme === 'dark' ? '#1e293b' : '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="weight" stroke="#6366f1" strokeWidth={4} dot={{ r: 6, fill: '#6366f1', strokeWidth: 0 }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="flex flex-col">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Activity className="text-emerald-500" /> {t.tasks}
          </h3>
          <div className="space-y-4 flex-1">
            {tasks.slice(0, 3).map(task => (
              <div key={task.id} className="group flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-600">
                <button onClick={() => toggleTask(task.id)} className="shrink-0">
                  {task.completed ? <CheckCircle2 className="text-emerald-500" /> : <Circle className="text-slate-300 group-hover:text-indigo-400" />}
                </button>
                <div className="flex-1 overflow-hidden">
                  <p className={`text-sm font-semibold truncate ${task.completed ? 'line-through text-slate-400' : ''}`}>{task.title}</p>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setView('tasks')} className="w-full mt-6 py-3 text-indigo-600 dark:text-indigo-400 text-sm font-bold flex items-center justify-center gap-1 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-2xl transition-all">
            Ver todas <ChevronRight size={16} />
          </button>
        </Card>
      </div>

      {checkIns.length > 0 && (
        <Card className="bg-indigo-600 text-white border-none shadow-xl shadow-indigo-100 dark:shadow-none">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
              <Info className="text-white" />
            </div>
            <div>
              <h3 className="font-bold mb-1">Feedback da IA:</h3>
              <p className="text-indigo-50 leading-relaxed text-sm">
                {checkIns[checkIns.length - 1].feedback || "Você está no caminho certo! Continue registrando seus dados para análises mais precisas."}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );

  const renderTasks = () => (
    <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-black flex items-center gap-2"><CheckCircle2 className="text-indigo-500" /> {t.tasks}</h2>
        <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-black px-3 py-1 rounded-full">
          {tasks.filter(t => t.completed).length} / {tasks.length} {t.completed}
        </span>
      </div>
      <div className="space-y-4">
        {tasks.map(task => (
          <Card 
            key={task.id} 
            className={`flex items-center gap-4 cursor-pointer hover:border-indigo-300 transition-all ${task.completed ? 'opacity-70 bg-slate-50 dark:bg-slate-900/50' : ''}`} 
            onClick={() => toggleTask(task.id)}
          >
            <div className={`p-4 rounded-2xl ${task.completed ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'} dark:bg-slate-700 transition-colors`}>
              {task.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
            </div>
            <div className="flex-1">
              <h4 className={`font-bold text-lg ${task.completed ? 'line-through text-slate-400' : ''}`}>{task.title}</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">{task.description}</p>
            </div>
            <div className="hidden sm:block">
              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl ${task.type === 'exercise' ? 'bg-blue-50 text-blue-600' : task.type === 'food' ? 'bg-orange-50 text-orange-600' : 'bg-purple-50 text-purple-600'}`}>
                {task.type}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderFood = () => (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black flex items-center justify-center gap-3"><Utensils className="text-orange-500" /> {t.food}</h2>
        <p className="text-slate-500">Sugestões personalizadas para {userProfile.goalType === 'lose' ? 'perda' : 'ganho'} de peso saudável.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle2 className="text-emerald-600" size={18} />
            </div>
            <h3 className="text-lg font-black text-emerald-600">{t.permitted}</h3>
          </div>
          {foodGuide.filter(f => f.category === 'permitted').map((f, i) => (
            <Card key={i} className="border-l-[6px] border-l-emerald-500 group hover:shadow-md transition-shadow">
              <h4 className="font-bold text-lg group-hover:text-emerald-600 transition-colors">{f.name}</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{f.reason}</p>
            </Card>
          ))}
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
              <ShieldAlert className="text-rose-600" size={18} />
            </div>
            <h3 className="text-lg font-black text-rose-600">{t.prohibited}</h3>
          </div>
          {foodGuide.filter(f => f.category === 'prohibited').map((f, i) => (
            <Card key={i} className="border-l-[6px] border-l-rose-500 group hover:shadow-md transition-shadow">
              <h4 className="font-bold text-lg group-hover:text-rose-600 transition-colors">{f.name}</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{f.reason}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );

  const renderCheckIn = () => (
    <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl font-black flex items-center gap-2"><Calendar className="text-indigo-500" /> {t.checkin}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
        <div className="md:col-span-2">
          <Card className="sticky top-24">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Novo Registro</p>
            <form onSubmit={handleWeeklyCheckIn} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">{t.weight} (kg)</label>
                <input name="weight" type="number" step="0.1" defaultValue={checkIns[checkIns.length-1]?.weight} required className="w-full px-4 py-3 rounded-2xl border dark:bg-slate-900 dark:border-slate-700 outline-none focus:ring-4 focus:ring-indigo-100" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">{t.height} (cm)</label>
                <input name="height" type="number" defaultValue={checkIns[checkIns.length-1]?.height} required className="w-full px-4 py-3 rounded-2xl border dark:bg-slate-900 dark:border-slate-700 outline-none focus:ring-4 focus:ring-indigo-100" />
              </div>
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none"
              >
                {loading ? <RefreshCw className="animate-spin" /> : t.save}
              </Button>
            </form>
          </Card>
        </div>

        <div className="md:col-span-3 space-y-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Histórico de Progresso</p>
          <div className="space-y-4">
            {checkIns.slice().reverse().map((entry, i) => (
              <Card key={i} className="hover:border-indigo-100 dark:hover:border-indigo-900/50 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full">{entry.date}</span>
                  <span className="text-lg font-black text-indigo-600">{entry.weight} kg</span>
                </div>
                {entry.feedback && (
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic">"{entry.feedback}"</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="max-w-md mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl font-black flex items-center gap-2"><Settings className="text-slate-500" /> {t.settings}</h2>
      <Card className="space-y-6">
        <div className="flex items-center justify-between">
          <span className="font-bold">{t.language}</span>
          <select value={lang} onChange={(e) => setLang(e.target.value)} className="bg-slate-50 dark:bg-slate-700 px-4 py-2 rounded-xl outline-none border border-slate-100 dark:border-slate-600">
            <option value="pt">Português</option>
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-bold">{t.mode}</span>
          <button 
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} 
            className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 flex items-center gap-3 px-6 hover:bg-white transition-colors"
          >
            {theme === 'light' ? <><Moon size={20} className="text-indigo-600" /> Escuro</> : <><Sun size={20} className="text-amber-500" /> Claro</>}
          </button>
        </div>
        
        <div className="pt-4 border-t dark:border-slate-700">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Perfil Conectado</p>
          <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl">
              {userProfile.name[0]}
            </div>
            <div>
              <p className="font-black">{userProfile.name}</p>
              <p className="text-xs text-slate-500">{session.user.email}</p>
            </div>
          </div>
        </div>

        <button 
          onClick={() => supabase.auth.signOut()} 
          className="w-full flex items-center justify-center gap-2 text-rose-500 text-sm font-black border-2 border-rose-100 dark:border-rose-900/30 py-4 rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-colors"
        >
          <LogOut size={20} /> Sair da Conta
        </button>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-500 pb-20 sm:pb-8">
      <header className="sticky top-0 z-40 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-b border-slate-100 dark:border-slate-900">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 dark:shadow-none">
              <Activity className="text-white" size={24} />
            </div>
            <span className="font-black text-xl tracking-tight hidden sm:inline">HealthJourney</span>
          </div>
          
          <nav className="hidden sm:flex items-center gap-2 bg-slate-100/50 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800">
            {[
              { id: 'dashboard', icon: TrendingUp },
              { id: 'tasks', icon: CheckCircle2 },
              { id: 'food', icon: Utensils },
              { id: 'checkin', icon: Calendar },
              { id: 'settings', icon: Settings }
            ].map(item => (
              <button 
                key={item.id}
                onClick={() => setView(item.id as any)} 
                className={`p-2.5 rounded-xl transition-all ${view === item.id ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <item.icon size={20} />
              </button>
            ))}
          </nav>
          
          <div className="sm:hidden flex items-center gap-2">
             <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center font-black text-xs">
                {points}
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {view === 'dashboard' && renderDashboard()}
        {view === 'tasks' && renderTasks()}
        {view === 'food' && renderFood()}
        {view === 'checkin' && renderCheckIn()}
        {view === 'settings' && renderSettings()}
      </main>

      {/* Navigation Mobile */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between z-50">
        {[
          { id: 'dashboard', icon: TrendingUp },
          { id: 'tasks', icon: CheckCircle2 },
          { id: 'food', icon: Utensils },
          { id: 'checkin', icon: Calendar },
          { id: 'settings', icon: Settings }
        ].map(item => (
          <button 
            key={item.id}
            onClick={() => setView(item.id as any)} 
            className={`p-2 transition-all ${view === item.id ? 'text-indigo-600 scale-125' : 'text-slate-400'}`}
          >
            <item.icon size={24} />
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;
