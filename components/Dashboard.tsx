
import React, { useMemo } from 'react';
import type { Week, KPI } from '../types';
import { TaskStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { CheckCircle2, Target, TrendingUp, Clock } from 'lucide-react';

interface DashboardProps {
  weeks: Week[];
  kpis: KPI[];
}

const KPI_ICONS: { [key: string]: React.ElementType } = {
  'Horas': Clock,
  'Tarefas': CheckCircle2,
  'Taxa': Target,
  'default': TrendingUp
};

const KpiCard: React.FC<{ kpi: KPI }> = ({ kpi }) => {
    const progress = kpi.target > 0 ? (kpi.current / kpi.target) * 100 : 0;
    const Icon = Object.keys(KPI_ICONS).find(key => kpi.name.includes(key)) ? KPI_ICONS[Object.keys(KPI_ICONS).find(key => kpi.name.includes(key))!] : KPI_ICONS.default;

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col justify-between transition-transform transform hover:scale-105 duration-300">
            <div>
                <div className="flex justify-between items-start">
                    <h3 className="text-lg font-semibold text-gray-200">{kpi.name}</h3>
                    <Icon className="h-6 w-6 text-indigo-400"/>
                </div>
                <p className="text-3xl font-bold mt-2 text-white">{kpi.current}<span className="text-xl text-gray-400 ml-1">{kpi.unit}</span></p>
                <p className="text-sm text-gray-400 mt-1">Meta: {kpi.target} {kpi.unit}</p>
            </div>
            <div className="mt-4">
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                    <div className="bg-indigo-500 h-2.5 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                </div>
                <p className="text-right text-sm font-medium text-gray-300 mt-1">{Math.round(progress)}%</p>
            </div>
        </div>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ weeks, kpis }) => {
  const chartData = useMemo(() => {
    return weeks.map(week => {
      const tasks = week.days.flatMap(day => day.tasks);
      const completed = tasks.filter(t => t.status === TaskStatus.Done).length;
      const total = tasks.length;
      return {
        name: `S${week.number}`,
        completed,
        total,
      };
    });
  }, [weeks]);

  const overallProgress = useMemo(() => {
    const allTasks = weeks.flatMap(w => w.days.flatMap(d => d.tasks));
    const completedTasks = allTasks.filter(t => t.status === TaskStatus.Done).length;
    return allTasks.length > 0 ? (completedTasks / allTasks.length) * 100 : 0;
  }, [weeks]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-bold tracking-tight text-white">Painel</h1>
        <p className="mt-2 text-lg text-gray-400">Sua jornada de 12 semanas em um piscar de olhos.</p>
      </header>

      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpis.map(kpi => (
            <KpiCard key={kpi.id} kpi={kpi} />
          ))}
        </div>
      </section>

      <section className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4 text-white">Progresso Semanal</h2>
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <XAxis dataKey="name" stroke="#9ca3af" tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" tickLine={false} axisLine={false} />
                <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563', borderRadius: '0.5rem' }}
                    labelStyle={{ color: '#d1d5db' }}
                />
                <Legend wrapperStyle={{ color: '#d1d5db' }} />
                <Bar dataKey="completed" name="Tarefas Concluídas" stackId="a" fill="#6366f1" radius={[4, 4, 0, 0]}>
                    {
                        chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index + 1 <= Math.floor(overallProgress / (100/12)) ? '#4f46e5' : '#4338ca'}/>
                        ))
                    }
                </Bar>
            </BarChart>
            </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;