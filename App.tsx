import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, CalendarClock, ChevronRight, Download, Upload, Menu, X } from 'lucide-react';

// Import types and components
import type { Week, Day, Task, KPI, Note, View } from './types';
import { TaskStatus, TaskType } from './types';
import { SEED_KPIS } from './data/seed';
import Dashboard from './components/Dashboard';
import WeekView from './components/WeekView';
import { TodayView } from './components/TodayView';

// AppState structure for localStorage
type AppState = {
  weeks: Week[];
  kpis: KPI[];
  notes: Note[];
};

const KEY = "app12_transformation_plan_v2";

const uid = () => `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const iso = (d: Date) => d.toISOString().split('T')[0];

function initialState(): AppState {
  // segunda-feira da semana atual
  const now = new Date();
  const monday = new Date(now);
  const dow = monday.getDay(); // 0=domingo
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  monday.setDate(monday.getDate() + diffToMon);

  // helper p/ criar semana com capacidade: Seg–Sex 120min, Sáb–Dom 180min
  const makeWeek = (baseMonday: Date, number: number, title: string, goal: string): Week => {
    const days: Day[] = Array.from({ length: 7 }).map((_, i) => {
      const dt = new Date(baseMonday);
      dt.setDate(dt.getDate() + i);
      const planned = (i === 5 || i === 6) ? 180 : 120;
      return { id: uid(), date: iso(dt), planned_minutes: planned, tasks: [] };
    });
    return { id: uid(), number, title, goal, status: "pending", days };
  };

  // Metas por semana
  const weekMeta: Array<{title:string; goal:string}> = [
    { title: "Semana 1", goal: "Defina um objetivo claro para esta semana." },
    { title: "Semana 2", goal: "Defina um objetivo claro para esta semana." },
    { title: "Semana 3", goal: "Defina um objetivo claro para esta semana." },
    { title: "Semana 4", goal: "Defina um objetivo claro para esta semana." },
    { title: "Semana 5", goal: "Defina um objetivo claro para esta semana." },
    { title: "Semana 6", goal: "Defina um objetivo claro para esta semana." },
    { title: "Semana 7", goal: "Defina um objetivo claro para esta semana." },
    { title: "Semana 8", goal: "Defina um objetivo claro para esta semana." },
    { title: "Semana 9", goal: "Defina um objetivo claro para esta semana." },
    { title: "Semana 10", goal: "Defina um objetivo claro para esta semana." },
    { title: "Semana 11", goal: "Defina um objetivo claro para esta semana." },
    { title: "Semana 12", goal: "Defina um objetivo claro para esta semana." },
  ];

  // Cria as 12 semanas
  const weeks: Week[] = Array.from({ length: 12 }).map((_, i) =>
    makeWeek(
      new Date(monday.getTime() + i * 7 * 24 * 60 * 60 * 1000),
      i + 1,
      weekMeta[i].title,
      weekMeta[i].goal
    )
  );

  // Semana 1 já fica "in_progress"
  if (weeks.length > 0) {
      weeks[0].status = 'in-progress';
  }
  
  return { weeks, kpis: SEED_KPIS, notes: [] };
}

function inferTaskType(title: string): TaskType {
    const lowerTitle = title.toLowerCase();
    if (/\b(revisão|review|simulado|recap|documentar)\b/.test(lowerTitle)) {
        return TaskType.Review;
    }
    if (/\b(prática|practice|exercícios|exercises|construir|build|teste|test|mini-CRM|integrador)\b/.test(lowerTitle)) {
        return TaskType.Practice;
    }
    return TaskType.Study;
}


function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  const [view, setView] = useState<View>('dashboard');
  const [activeWeek, setActiveWeek] = useState<number>(1);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Load and save state from/to localStorage
  useEffect(() => {
    const loadInitialState = () => {
      const state = initialState();
      setWeeks(state.weeks);
      setKpis(state.kpis);
      setNotes(state.notes);
    };

    try {
        const rawState = localStorage.getItem(KEY);
        if (rawState) {
          const state: AppState = JSON.parse(rawState);
          if (!state.weeks || state.weeks.length < 12 || !state.kpis) {
            loadInitialState();
          } else {
            setWeeks(state.weeks);
            setKpis(state.kpis);
            setNotes(state.notes || []);
          }
        } else {
          loadInitialState();
        }
    } catch (error) {
        console.error("Failed to parse state from localStorage", error);
        loadInitialState();
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
      const state: AppState = { weeks, kpis, notes };
      localStorage.setItem(KEY, JSON.stringify(state));
    }
  }, [weeks, kpis, notes, isInitialized]);
  
  // Find today's date and corresponding day object
  const todayISO = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayDay = useMemo(() => {
      for (const week of weeks) {
          const day = week.days.find(d => d.date === todayISO);
          if (day) return day;
      }
      return null;
  }, [weeks, todayISO]);

  const todayNotes = useMemo(() => {
    if (!todayDay) return [];
    return notes.filter(n => n.dayId === todayDay.id);
  }, [notes, todayDay]);

  // Handler functions to modify state
  const handleTaskStatusChange = (weekNumber: number, dayIndex: number, taskIndex: number, status: TaskStatus) => {
    setWeeks(prevWeeks => {
      const newWeeks = JSON.parse(JSON.stringify(prevWeeks));
      const week = newWeeks.find(w => w.number === weekNumber);
      if (week && week.days[dayIndex] && week.days[dayIndex].tasks[taskIndex]) {
        week.days[dayIndex].tasks[taskIndex].status = status;
      }
      return newWeeks;
    });
  };

  const handleImportFromText = (text: string, weekNumber: number) => {
      try {
        const weekIndex = weeks.findIndex(w => w.number === weekNumber);
        if (weekIndex === -1) throw new Error("Semana não encontrada.");

        const targetWeek = JSON.parse(JSON.stringify(weeks[weekIndex]));

        const titleRegex = /📅 Semana \d+ – (.*)/;
        const goalRegex = /Meta: (.*)/;
        
        const titleMatch = text.match(titleRegex);
        if (titleMatch && titleMatch[1]) {
            targetWeek.title = titleMatch[1].trim();
        }
        const goalMatch = text.match(goalRegex);
        if (goalMatch && goalMatch[1]) {
            targetWeek.goal = goalMatch[1].trim();
        }
        
        targetWeek.days.forEach((day: Day) => day.tasks = []);

        const dayNames = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];
        const dayIndices: { [key: string]: number } = { 'segunda-feira': 0, 'terça-feira': 1, 'quarta-feira': 2, 'quinta-feira': 3, 'sexta-feira': 4, 'sábado': 5, 'domingo': 6 };
        const dayRegex = new RegExp(`^(${dayNames.join('|')})`, 'gmi');
        const taskRegex = /-\s*(.+?)\s*\((\d+)min\)/g;

        const dayMatches = Array.from(text.matchAll(dayRegex));

        dayMatches.forEach((match, i) => {
            const dayName = match[1].toLowerCase();
            const dayIndex = dayIndices[dayName];
            if (dayIndex === undefined) return;

            const startIndex = match.index! + match[0].length;
            const endIndex = i + 1 < dayMatches.length ? dayMatches[i + 1].index! : text.length;
            const dayContent = text.substring(startIndex, endIndex);

            const taskMatches = Array.from(dayContent.matchAll(taskRegex));
            const newTasks: Task[] = taskMatches.map(taskMatch => {
                const title = taskMatch[1].trim();
                const minutes = parseInt(taskMatch[2], 10);
                return {
                    id: uid(),
                    title,
                    estimated_minutes: minutes,
                    type: inferTaskType(title),
                    status: TaskStatus.Todo
                };
            });
            
            if (targetWeek.days[dayIndex]) {
                targetWeek.days[dayIndex].tasks = newTasks;
            }
        });
        
        setWeeks(prevWeeks => {
            const newWeeks = [...prevWeeks];
            newWeeks[weekIndex] = targetWeek;
            return newWeeks;
        });

      } catch(e) {
          console.error("Falha ao importar do texto:", e);
          alert("Ocorreu um erro ao importar o plano. Verifique o formato do texto e tente novamente.");
      }
  };

  const handleAddNote = (dayId: string, content: string) => {
    const newNote: Note = {
        id: `note-${Date.now()}`,
        dayId,
        content,
        createdAt: new Date().toISOString(),
    };
    setNotes(prev => [...prev, newNote]);
  };
  
  function exportJSON() {
    const data = localStorage.getItem(KEY) ?? "{}";
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "agenda-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON(ev: React.ChangeEvent<HTMLInputElement>) {
    const f = ev.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result));
        localStorage.setItem(KEY, JSON.stringify(obj));
        alert("Backup importado! A página será recarregada.");
        location.reload();
      } catch (e) {
        alert("Arquivo inválido.");
      }
    };
    reader.readAsText(f);
  }

  const renderView = () => {
    switch(view) {
      case 'dashboard':
        return <Dashboard weeks={weeks} kpis={kpis} />;
      case 'weeks':
        return <WeekView 
                    week={weeks.find(w => w.number === activeWeek)}
                    onTaskStatusChange={handleTaskStatusChange}
                    onImportFromText={handleImportFromText}
                />;
      case 'today':
        return <TodayView
                    day={todayDay}
                    weeks={weeks}
                    notes={todayNotes}
                    onTaskStatusChange={handleTaskStatusChange}
                    onAddNote={handleAddNote}
                />;
      default:
        return <Dashboard weeks={weeks} kpis={kpis} />;
    }
  };
  
  const NavItem = ({ icon: Icon, label, isActive, onClick, isCollapsed }) => (
    <button 
      onClick={() => {
        onClick();
        setIsMobileMenuOpen(false);
      }}
      className={`flex items-center w-full text-left px-4 py-3 rounded-lg transition-colors duration-200 ${isActive ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      {!isCollapsed && <span className="ml-4 font-medium">{label}</span>}
    </button>
  );

  const viewTitles = {
    dashboard: 'Painel',
    weeks: `Semana ${activeWeek}`,
    today: 'Foco de Hoje',
  };

  return (
    <div className="relative min-h-screen bg-gray-900 text-gray-100 font-sans lg:flex">
      {/* Backdrop for mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      <aside className={`fixed inset-y-0 left-0 z-30 flex flex-col bg-gray-800 border-r border-gray-700 w-64 transition-transform duration-300 ease-in-out transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 lg:transition-all ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}`}>
        <div className="flex items-center h-16 px-4 border-b border-gray-700 flex-shrink-0">
            {!isSidebarCollapsed && <h1 className="text-xl font-bold text-white whitespace-nowrap hidden lg:block">Agenda</h1>}
            
            <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className={`p-2 rounded-md hover:bg-gray-700 hidden lg:block ${!isSidebarCollapsed ? 'ml-auto' : 'mx-auto'}`}>
                <ChevronRight className={`h-6 w-6 transform transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-180' : ''}`} />
            </button>

            <h1 className="text-xl font-bold text-white whitespace-nowrap lg:hidden">Menu</h1>
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 rounded-md hover:bg-gray-700 ml-auto lg:hidden">
              <X className="h-6 w-6" />
            </button>
        </div>
        
        <div className="flex-grow flex flex-col overflow-y-hidden">
            <nav className="p-4 space-y-2">
                <NavItem icon={LayoutDashboard} label="Painel" isActive={view === 'dashboard'} onClick={() => { setView('dashboard'); }} isCollapsed={isSidebarCollapsed} />
                <NavItem icon={CalendarClock} label="Hoje" isActive={view === 'today'} onClick={() => { setView('today'); }} isCollapsed={isSidebarCollapsed}/>
            </nav>

            <div className="flex-1 p-4 overflow-y-auto">
                <h2 className={`px-4 mb-2 text-sm font-semibold tracking-wider text-gray-400 uppercase ${isSidebarCollapsed ? 'text-center' : ''}`}>{isSidebarCollapsed ? 'S' : 'Semanas'}</h2>
                <div className="space-y-1">
                    {weeks.map(week => (
                        <button 
                            key={week.id} 
                            onClick={() => { setActiveWeek(week.number); setView('weeks'); setIsMobileMenuOpen(false); }}
                            className={`flex items-center w-full text-left px-4 py-2 text-sm rounded-md transition-colors ${view === 'weeks' && activeWeek === week.number ? 'bg-gray-700 text-white font-semibold' : 'text-gray-400 hover:bg-gray-700'}`}
                        >
                            <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0 ${view === 'weeks' && activeWeek === week.number ? 'bg-indigo-500 text-white' : 'bg-gray-600'}`}>{week.number}</span>
                            {!isSidebarCollapsed && <span className="ml-3 truncate">{week.title}</span>}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-4 border-t border-gray-700">
                <div className="space-y-2">
                    <button onClick={exportJSON} className="flex items-center w-full text-left px-4 py-2 text-sm rounded-md text-gray-300 hover:bg-gray-700">
                        <Download className="h-4 w-4 flex-shrink-0" />
                        {!isSidebarCollapsed && <span className="ml-3">Exportar</span>}
                    </button>
                    <label className="flex items-center w-full text-left px-4 py-2 text-sm rounded-md text-gray-300 hover:bg-gray-700 cursor-pointer">
                        <Upload className="h-4 w-4 flex-shrink-0" />
                        {!isSidebarCollapsed && <span className="ml-3">Importar</span>}
                        <input type="file" accept="application/json" className="hidden" onChange={importJSON} />
                    </label>
                </div>
            </div>
        </div>
      </aside>

      <div className="flex-1 w-full flex flex-col">
        <header className="flex items-center justify-between h-16 bg-gray-800/80 backdrop-blur-sm border-b border-gray-700 px-4 sticky top-0 z-10 lg:hidden">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 rounded-md text-gray-300 hover:bg-gray-700">
                <Menu className="h-6 w-6"/>
            </button>
            <h1 className="text-lg font-semibold">{viewTitles[view]}</h1>
            <div className="w-6"></div> 
        </header>
        
        <main className="flex-1 p-4 sm:p-6 lg:p-10 overflow-y-auto">
          {isInitialized ? renderView() : <div className="text-center text-gray-400">Carregando plano...</div>}
        </main>
      </div>
    </div>
  );
}

export default App;
