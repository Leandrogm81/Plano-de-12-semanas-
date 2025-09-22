
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import type { Week, Day, Task, KPI, Template, Note, View } from './types';
import { TaskStatus, TaskType } from './types';
import { SEED_WEEKS, SEED_KPIS, SEED_TEMPLATES } from './data/seed';
import Dashboard from './components/Dashboard';
import WeekView from './components/WeekView';
import TemplatesView from './components/TemplatesView';
import { TodayView } from './components/TodayView';
import { Check, Flame, GanttChartSquare, LayoutTemplate, BrainCircuit, LoaderCircle, AlertTriangle } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<View>('dashboard');
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [kpis, setKpis] = useState<KPI[]>(SEED_KPIS);
  const [templates, setTemplates] = useState<Template[]>(SEED_TEMPLATES);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load data from local storage on mount, or use seed data.
    try {
      const savedWeeks = localStorage.getItem('weeks');
      const savedKpis = localStorage.getItem('kpis');
      const savedTemplates = localStorage.getItem('templates');
      const savedNotes = localStorage.getItem('notes');

      if (savedWeeks) setWeeks(JSON.parse(savedWeeks));
      else setWeeks(SEED_WEEKS);

      if (savedKpis) setKpis(JSON.parse(savedKpis));
      if (savedTemplates) setTemplates(JSON.parse(savedTemplates));
      if (savedNotes) setNotes(JSON.parse(savedNotes));

    } catch (e) {
      console.error("Failed to load data from localStorage", e);
      setWeeks(SEED_WEEKS);
      setKpis(SEED_KPIS);
      setTemplates(SEED_TEMPLATES);
    }
  }, []);

  useEffect(() => {
    // Save data to local storage whenever it changes.
    try {
        localStorage.setItem('weeks', JSON.stringify(weeks));
        localStorage.setItem('kpis', JSON.stringify(kpis));
        localStorage.setItem('templates', JSON.stringify(templates));
        localStorage.setItem('notes', JSON.stringify(notes));
    } catch(e) {
        console.error("Failed to save data to localStorage", e);
    }
  }, [weeks, kpis, templates, notes]);
  
  const handleTaskStatusChange = useCallback((weekNumber: number, dayIndex: number, taskIndex: number, status: TaskStatus) => {
    setWeeks(prevWeeks => {
      const newWeeks = [...prevWeeks];
      const week = newWeeks.find(w => w.number === weekNumber);
      if (week && week.days[dayIndex] && week.days[dayIndex].tasks[taskIndex]) {
        week.days[dayIndex].tasks[taskIndex].status = status;
      }
      return newWeeks;
    });
  }, []);

  const handleApplyTemplate = useCallback((weekNumber: number, templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    setWeeks(prevWeeks => {
      const newWeeks = [...prevWeeks];
      const weekIndex = newWeeks.findIndex(w => w.number === weekNumber);
      if (weekIndex !== -1) {
        const targetWeek = newWeeks[weekIndex];
        targetWeek.days.forEach(day => {
          day.tasks = [];
        });
        
        if(targetWeek.days.length > 0) {
            targetWeek.days[0].tasks = template.tasks.map(t => ({...t, id: `task-${Date.now()}-${Math.random()}`, status: TaskStatus.Todo}));
        }
        targetWeek.title = template.title;
        targetWeek.goal = template.goal;
      }
      return newWeeks;
    });
  }, [templates]);

  const handleAddNote = useCallback((dayId: string, content: string) => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      dayId,
      content,
      createdAt: new Date().toISOString()
    };
    setNotes(prev => [...prev, newNote]);
  }, []);

  const today = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
    for (const week of weeks) {
        for (const day of week.days) {
            if (day.date === todayStr) {
                return day;
            }
        }
    }
    return null;
  }, [weeks]);

  const generatePlan = async () => {
    if (!process.env.API_KEY) {
        setError("A variável de ambiente API_KEY não está definida.");
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
        const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
        const prompt = `
          Gere um plano de estudos detalhado de 12 semanas em português do Brasil para um usuário chamado Leandro que deseja migrar para uma carreira de tecnologia com foco em NoCode/LowCode e automações.
          Sua rotina é de 2 horas/dia durante a semana (Seg-Sex) e 3 horas/dia nos fins de semana (Sáb-Dom).
          O plano deve ser estruturado de tópicos fundamentais a avançados: fundamentos -> CRM -> dashboards -> automações -> template comercial.
          Para cada uma das 12 semanas, forneça um título e uma meta.
          Para cada semana, gere tarefas para todos os 7 dias (de segunda a domingo).
          Para cada tarefa, forneça um título, um tipo ('study', 'practice', 'review') e os minutos_estimados. O total de minutos estimados para cada dia deve corresponder à rotina do usuário (120 minutos durante a semana, 180 minutos nos fins de semana).
          Garanta que a Semana 1 seja especialmente detalhada e fundamental.
          Retorne a resposta como um objeto JSON que corresponda ao esquema especificado.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        weeks: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    number: { type: Type.INTEGER },
                                    title: { type: Type.STRING },
                                    goal: { type: Type.STRING },
                                    tasks: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                dayOfWeek: { type: Type.INTEGER, description: "1 for Monday, 7 for Sunday"},
                                                title: { type: Type.STRING },
                                                type: { type: Type.STRING, enum: ['study', 'practice', 'review'] },
                                                estimated_minutes: { type: Type.INTEGER }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        
        const jsonResponse = JSON.parse(response.text);

        const now = new Date();
        const spTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
        const dayOfWeekInSP = spTime.getDay();
        const mondayOfThisWeek = spTime;
        mondayOfThisWeek.setDate(mondayOfThisWeek.getDate() - (dayOfWeekInSP === 0 ? 6 : dayOfWeekInSP - 1));

        const generatedWeeks = jsonResponse.weeks.map((w: any) => {
            const startDate = new Date(mondayOfThisWeek);
            startDate.setDate(startDate.getDate() + (w.number - 1) * 7);

            return {
                id: `week-${w.number}-${Date.now()}`,
                number: w.number,
                title: w.title,
                goal: w.goal,
                status: 'pending',
                days: Array.from({ length: 7 }).map((_, dayIndex) => {
                    const dayDate = new Date(startDate);
                    dayDate.setDate(startDate.getDate() + dayIndex);
                    const dayOfWeek = dayDate.getDay() === 0 ? 7 : dayDate.getDay();

                    return {
                        id: `day-${w.number}-${dayIndex}-${Date.now()}`,
                        date: dayDate.toISOString().split('T')[0],
                        planned_minutes: dayIndex < 5 ? 120 : 180,
                        tasks: w.tasks.filter((t: any) => t.dayOfWeek === dayOfWeek).map((task: any, taskIndex: number) => ({
                            id: `task-${w.number}-${dayIndex}-${taskIndex}-${Date.now()}`,
                            title: task.title,
                            type: task.type,
                            estimated_minutes: task.estimated_minutes,
                            status: TaskStatus.Todo
                        }))
                    };
                })
            };
        });
        
        setWeeks(generatedWeeks);

    } catch (e: any) {
        console.error("Error generating plan:", e);
        setError(`Falha ao gerar o plano. ${e.message || 'Verifique sua chave de API e tente novamente.'}`);
    } finally {
        setIsLoading(false);
    }
  };

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return <Dashboard weeks={weeks} kpis={kpis} />;
      case 'weeks':
        return <WeekView week={weeks.find(w => w.number === selectedWeek)} onTaskStatusChange={handleTaskStatusChange} onApplyTemplate={handleApplyTemplate} templates={templates} />;
      case 'today':
        return <TodayView day={today} onTaskStatusChange={handleTaskStatusChange} onAddNote={handleAddNote} notes={notes.filter(n => n.dayId === today?.id)} weeks={weeks} />;
      case 'templates':
        return <TemplatesView templates={templates} setTemplates={setTemplates} />;
      default:
        return <Dashboard weeks={weeks} kpis={kpis} />;
    }
  };
  
  const NavButton: React.FC<{ currentView: View, targetView: View, setView: (v: View) => void, children: React.ReactNode, icon: React.ElementType }> = ({ currentView, targetView, setView, children, icon: Icon }) => (
    <button onClick={() => setView(targetView)} className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${currentView === targetView ? 'bg-indigo-500 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}>
        <Icon className="h-5 w-5" />
        <span>{children}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans flex flex-col md:flex-row">
        <aside className="w-full md:w-64 bg-gray-800 p-4 space-y-4 border-b md:border-b-0 md:border-r border-gray-700 flex flex-col">
            <div className="flex items-center space-x-3 mb-6">
                <BrainCircuit className="h-8 w-8 text-indigo-400" />
                <h1 className="text-xl font-bold text-white">Plano de 12 Semanas</h1>
            </div>
            <nav className="flex-grow space-y-2">
                <NavButton currentView={view} targetView='dashboard' setView={setView} icon={GanttChartSquare}>Painel</NavButton>
                <NavButton currentView={view} targetView='today' setView={setView} icon={Flame}>Hoje</NavButton>
                <NavButton currentView={view} targetView='templates' setView={setView} icon={LayoutTemplate}>Templates</NavButton>
                
                <div className="pt-4">
                    <label htmlFor="week-select" className="block text-sm font-medium text-gray-400 mb-2">Selecionar Semana</label>
                    <select
                        id="week-select"
                        value={selectedWeek}
                        onChange={(e) => {
                            setSelectedWeek(Number(e.target.value));
                            setView('weeks');
                        }}
                        className="w-full bg-gray-700 border-gray-600 text-white rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(weekNum => (
                            <option key={weekNum} value={weekNum}>Semana {weekNum}</option>
                        ))}
                    </select>
                </div>
            </nav>
            <div className="mt-auto">
                <button
                  onClick={generatePlan}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                  {isLoading ? <LoaderCircle className="animate-spin h-5 w-5" /> : <BrainCircuit className="h-5 w-5" />}
                  <span>{isLoading ? 'Gerando...' : 'Gerar Plano com IA'}</span>
                </button>
                {error && <p className="mt-2 text-xs text-red-400 flex items-center"><AlertTriangle className="h-4 w-4 mr-1"/> {error}</p>}
            </div>
        </aside>
      
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto" style={{maxHeight: '100vh'}}>
          {weeks.length > 0 ? renderView() : 
            <div className="flex flex-col items-center justify-center h-full text-center">
                <GanttChartSquare size={64} className="text-gray-600 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Bem-vindo ao seu Plano de 12 Semanas</h2>
                <p className="text-gray-400 mb-6">Seu plano está vazio. Gere um plano personalizado com IA para começar.</p>
                <button
                  onClick={generatePlan}
                  disabled={isLoading}
                  className="flex items-center justify-center space-x-2 px-6 py-3 rounded-md font-medium transition-colors duration-200 bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                  {isLoading ? <LoaderCircle className="animate-spin h-5 w-5" /> : <BrainCircuit className="h-5 w-5" />}
                  <span>{isLoading ? 'Gerando Plano...' : 'Gerar Meu Plano de 12 Semanas'}</span>
                </button>
                {error && <p className="mt-4 text-sm text-red-400 flex items-center"><AlertTriangle className="h-4 w-4 mr-1"/> {error}</p>}
            </div>
          }
        </main>
    </div>
  );
};

export default App;