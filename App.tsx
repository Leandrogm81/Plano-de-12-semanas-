
import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, CalendarClock, FileText, ChevronRight, Download, Upload, Menu, X } from 'lucide-react';

// Import types and components
import type { Week, Day, Task, KPI, Template, Note, View } from './types';
import { TaskStatus } from './types';
import { SEED_WEEKS, SEED_KPIS, SEED_TEMPLATES } from './data/seed';
import Dashboard from './components/Dashboard';
import WeekView from './components/WeekView';
import { TodayView } from './components/TodayView';
import TemplatesView from './components/TemplatesView';

// AppState structure for localStorage
type AppState = {
  weeks: Week[];
  kpis: KPI[];
  templates: Template[];
  notes: Note[];
};

const KEY = "app12_transformation_plan_v2";

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  const [view, setView] = useState<View>('dashboard');
  const [activeWeek, setActiveWeek] = useState<number>(1);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Load and save state from/to localStorage
  useEffect(() => {
    try {
        const rawState = localStorage.getItem(KEY);
        if (rawState) {
          const state: AppState = JSON.parse(rawState);
          setWeeks(state.weeks || SEED_WEEKS);
          setKpis(state.kpis || SEED_KPIS);
          setTemplates(state.templates || SEED_TEMPLATES);
          setNotes(state.notes || []);
        } else {
          // Initialize with seed data if no saved state
          setWeeks(SEED_WEEKS);
          setKpis(SEED_KPIS);
          setTemplates(SEED_TEMPLATES);
          setNotes([]);
        }
    } catch (error) {
        console.error("Failed to parse state from localStorage", error);
        // Fallback to seed data on error
        setWeeks(SEED_WEEKS);
        setKpis(SEED_KPIS);
        setTemplates(SEED_TEMPLATES);
        setNotes([]);
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
      const state: AppState = { weeks, kpis, templates, notes };
      localStorage.setItem(KEY, JSON.stringify(state));
    }
  }, [weeks, kpis, templates, notes, isInitialized]);
  
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

  const handleApplyTemplate = (weekNumber: number, templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    setWeeks(prevWeeks => {
      const newWeeks = JSON.parse(JSON.stringify(prevWeeks));
      const weekIndex = newWeeks.findIndex(w => w.number === weekNumber);
      if (weekIndex === -1) return prevWeeks;
      
      const newWeek = { ...newWeeks[weekIndex] };
      newWeek.title = template.title;
      newWeek.goal = template.goal;

      // Clear existing tasks
      newWeek.days.forEach(day => day.tasks = []);
      
      // Distribute template tasks across the week
      const tasksToDistribute = [...template.tasks];
      let dayIndex = 0;
      while(tasksToDistribute.length > 0) {
        const taskTemplate = tasksToDistribute.shift();
        if(taskTemplate) {
            const newTask: Task = {
                id: `task-${Date.now()}-${Math.random()}`,
                title: taskTemplate.title,
                type: taskTemplate.type,
                estimated_minutes: taskTemplate.estimated_minutes,
                status: TaskStatus.Todo,
            };
            newWeek.days[dayIndex % 7].tasks.push(newTask);
            dayIndex++;
        }
      }

      newWeeks[weekIndex] = newWeek;
      return newWeeks;
    });
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
    a.download = "app12-backup.json";
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
                    templates={templates}
                    onTaskStatusChange={handleTaskStatusChange}
                    onApplyTemplate={handleApplyTemplate}
                />;
      case 'today':
        return <TodayView
                    day={todayDay}
                    weeks={weeks}
                    notes={todayNotes}
                    onTaskStatusChange={handleTaskStatusChange}
                    onAddNote={handleAddNote}
                />;
      case 'templates':
        return <TemplatesView templates={templates} setTemplates={setTemplates} />;
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
    templates: 'Gerenciar Templates'
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
            {!isSidebarCollapsed && <h1 className="text-xl font-bold text-white whitespace-nowrap hidden lg:block">Plano de 12 Semanas</h1>}
            
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
                <NavItem icon={FileText} label="Templates" isActive={view === 'templates'} onClick={() => { setView('templates'); }} isCollapsed={isSidebarCollapsed}/>
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
