import React, { useEffect, useState } from 'react';
import { Activity, DollarSign, MessageSquare, Users, Loader2, TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { StatMetric } from '../types';
import { api } from '../services/api';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { OnboardingWizard } from './OnboardingWizard';
import { OnboardingBanner } from './OnboardingBanner';

type PeriodFilter = 'today' | '7days' | '30days';

const periodLabels: Record<PeriodFilter, string> = {
  today: 'Hoje',
  '7days': '7 Dias',
  '30days': '30 Dias'
};

const periodDays: Record<PeriodFilter, number> = {
  today: 1,
  '7days': 7,
  '30days': 30
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<StatMetric[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodFilter>('today');
  const [wizardOpen, setWizardOpen] = useState(false);

  // Auto-open wizard for first-time admin users only
  useEffect(() => {
    if (!user) return;
    const checkFirstLogin = async () => {
      // Check if user is admin first
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (roleData?.role !== 'admin') return;

      const { data } = await supabase
        .from('profiles')
        .select('has_logged_in')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data && !data.has_logged_in) {
        setWizardOpen(true);
        // Mark as logged in
        await supabase
          .from('profiles')
          .update({ has_logged_in: true })
          .eq('user_id', user.id);
      }
    };
    checkFirstLogin();
  }, [user]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const days = periodDays[period];
        const [metricsData, chartDataResponse] = await Promise.all([
          api.fetchDashboardMetrics(days),
          api.fetchChartData(days)
        ]);
        setMetrics(metricsData);
        setChartData(chartDataResponse);
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [period]);

  const getIcon = (label: string) => {
    if (label.includes('Conversões')) return <DollarSign className="h-5 w-5 text-emerald-600" />;
    if (label.includes('Atendimentos')) return <MessageSquare className="h-5 w-5 text-primary" />;
    if (label.includes('Leads')) return <Users className="h-5 w-5 text-violet-600" />;
    return <Activity className="h-5 w-5 text-orange-600" />;
  };

  const getGradient = (label: string) => {
    if (label.includes('Conversões')) return 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20';
    if (label.includes('Atendimentos')) return 'from-primary/20 to-primary/5 border-primary/20';
    if (label.includes('Leads')) return 'from-violet-500/20 to-violet-500/5 border-violet-500/20';
    return 'from-orange-500/20 to-orange-500/5 border-orange-500/20';
  };

  const getMetricLabel = (baseLabel: string) => {
    if (baseLabel.includes('Atendimentos')) {
      return period === 'today' ? 'Atendimentos Hoje' : `Atendimentos (${periodLabels[period]})`;
    }
    if (baseLabel.includes('Leads')) {
      return period === 'today' ? 'Novos Leads' : `Novos Leads (${periodLabels[period]})`;
    }
    return baseLabel;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
             <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
             <Loader2 className="h-10 w-10 animate-spin text-primary relative z-10" />
          </div>
          <p className="text-sm text-muted-foreground font-medium animate-pulse">Carregando insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 overflow-y-auto h-full bg-background text-foreground custom-scrollbar">
      <OnboardingWizard isOpen={wizardOpen} onClose={() => setWizardOpen(false)} />
      <OnboardingBanner onOpenWizard={() => setWizardOpen(true)} />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h2>
          <p className="text-muted-foreground mt-1">
            Visão geral da performance da sua IA {period === 'today' ? 'hoje' : `nos últimos ${periodLabels[period].toLowerCase()}`}.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-card p-1 rounded-lg border border-border">
          {(['today', '7days', '30days'] as PeriodFilter[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                period === p
                  ? 'bg-primary/10 text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((stat, index) => (
          <div 
            key={index} 
            className={`relative overflow-hidden rounded-2xl border bg-card backdrop-blur-sm p-6 shadow-md transition-all duration-300 hover:translate-y-[-2px] hover:shadow-lg group ${getGradient(stat.label)}`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="text-sm font-medium text-muted-foreground">{getMetricLabel(stat.label)}</div>
              <div className="p-2 rounded-lg bg-secondary border border-border group-hover:border-primary/30 transition-colors">
                 {getIcon(stat.label)}
              </div>
            </div>
            <div className="flex items-end justify-between">
                <div className="text-3xl font-bold text-foreground tracking-tight">{stat.value}</div>
                <div className={`flex items-center text-xs font-medium px-2 py-1 rounded-full ${stat.trendUp ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20'}`}>
                    {stat.trendUp ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                    {stat.trend}
                </div>
            </div>
            {/* Decorative Glow */}
            <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-primary/5 blur-2xl rounded-full group-hover:bg-primary/10 transition-all"></div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-7">
        {/* Main Chart */}
        <div className="col-span-4 rounded-2xl border border-border bg-card backdrop-blur-sm p-6 shadow-md">
          <div className="mb-6 flex items-center justify-between">
            <div>
                <h3 className="text-lg font-semibold text-foreground">Volume de Atendimentos</h3>
                <p className="text-sm text-muted-foreground">
                  Interações da IA {period === 'today' ? 'hoje' : `nos últimos ${periodDays[period]} dias`}
                </p>
            </div>
            <button className="text-primary hover:text-primary/80 transition-colors p-2 hover:bg-primary/10 rounded-lg">
                <ArrowUpRight className="w-5 h-5" />
            </button>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorChats" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#B89C6A" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#B89C6A" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(210, 14%, 93%)" />
                <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tickMargin={10} 
                    fontSize={12} 
                    stroke="hsl(215, 14%, 50%)"
                />
                <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    fontSize={12} 
                    stroke="hsl(215, 14%, 50%)"
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(0, 0%, 100%)', borderRadius: '12px', border: '1px solid hsl(210, 14%, 93%)', color: 'hsl(203, 18%, 27%)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} 
                  itemStyle={{ color: '#B89C6A' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="chats" 
                  stroke="#B89C6A" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorChats)" 
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#B89C6A' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Secondary Chart */}
        <div className="col-span-3 rounded-2xl border border-border bg-card backdrop-blur-sm p-6 shadow-md flex flex-col">
           <div className="mb-6">
            <h3 className="text-lg font-semibold text-foreground">Conversões</h3>
            <p className="text-sm text-muted-foreground">Reuniões, vendas e ações concluídas</p>
          </div>
          
          <div className="flex-1 flex flex-col justify-center space-y-5">
            {chartData.slice(0, 5).map((day, i) => (
              <div key={i} className="group">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">{day.name}</span>
                    <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{day.sales} conv.</span>
                </div>
                <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full shadow-[0_0_10px_hsl(var(--primary)/0.3)] transition-all duration-1000 ease-out group-hover:shadow-[0_0_15px_hsl(var(--primary)/0.6)]" 
                    style={{ width: `${Math.min((day.sales / Math.max(...chartData.map(d => d.sales), 1)) * 100, 100)}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-4 border-t border-border">
             <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total no período</span>
                <span className="text-emerald-600 font-bold">
                  {chartData.reduce((sum, d) => sum + d.sales, 0)} conversões
                </span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;