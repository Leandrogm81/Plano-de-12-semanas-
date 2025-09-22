
import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, CalendarClock, FileText, ChevronRight, Download, Upload, Menu, X } from 'lucide-react';

// Import types and components
import type { Week, Day, Task, KPI, Template, Note, View, TemplateTask } from './types';
import { TaskStatus, TaskType } from './types';
import { SEED_KPIS } from './data/seed';
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

const uid = () => `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const iso = (d: Date) => d.toISOString().split('T')[0];

// ===== NOVA distribuição por capacidade diária =====
function distributeTemplateIntoWeekByCapacity(wk: Week, tpl: Template): Week {
  const makeTask = (t: Template["tasks"][number]): Task => ({
    id: uid(),
    title: t.title,
    type: t.type,
    estimated_minutes: t.estimated_minutes,
    status: TaskStatus.Todo,
  });

  // Fila de tarefas do template
  const queue = tpl.tasks.map(makeTask);

  const days = wk.days.map((day) => {
    let remaining = day.planned_minutes;
    const tasks: Task[] = [];

    // Aloca tarefas do template enquanto couber
    while (queue.length > 0 && queue[0].estimated_minutes <= remaining) {
      const next = queue.shift()!;
      tasks.push(next);
      remaining -= next.estimated_minutes;
    }

    // Preenche com blocos de revisão/prática
    const fillerTitle = `Revisão/Prática – ${tpl.title}`;
    const pushFiller = (mins: number) => {
      tasks.push({
        id: uid(),
        title: fillerTitle,
        type: TaskType.Review,
        estimated_minutes: mins,
        status: TaskStatus.Todo,
      });
    };

    while (remaining >= 60) { pushFiller(60); remaining -= 60; }
    if (remaining >= 30) { pushFiller(30); remaining -= 30; }

    // Garante ao menos 1 tarefa no dia
    if (tasks.length === 0) {
      pushFiller(Math.min(60, day.planned_minutes));
    }

    return { ...day, tasks };
  });

  // Se sobrar tarefa do template, reparte 1 por dia em segunda passada
  if (queue.length > 0) {
    let idx = 0;
    while (queue.length > 0) {
      const t = queue.shift()!;
      const di = idx % days.length;
      days[di] = { ...days[di], tasks: [...days[di].tasks, t] };
      idx++;
    }
  }

  return { ...wk, days, status: "in-progress", title: tpl.title, goal: tpl.goal };
}


// ===== NOVA initialState (12 semanas preenchidas) =====
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
    { title: "Semana 1 – Fundamentos JS", goal: "Variáveis, if/else, arrays, loops, funções; mini-CRM em código" },
    { title: "Semana 2 – APIs + Google Sheets", goal: "Consumir APIs (JSON) e gravar dados em planilha" },
    { title: "Semana 3 – Banco (Airtable/Supabase)", goal: "Modelo de dados do CRM (Clientes, Orçamentos, Interações)" },
    { title: "Semana 4 – n8n: Form → CRM → resposta", goal: "Fluxo inicial: formulário, registro no CRM e confirmação automática" },
    { title: "Semana 5 – CRM Básico real", goal: "Cadastro real de clientes e status de vendas (Kanban)" },
    { title: "Semana 6 – Pré-orçamento (rascunho)", goal: "Gerar rascunho de orçamento; envio humano validado" },
    { title: "Semana 7 – Integração CRM + Pré-orçamento", goal: "Vincular rascunhos ao CRM; status automático em negociação" },
    { title: "Semana 8 – App interno (Glide)", goal: "Consulta de clientes/orçamentos pela equipe" },
    { title: "Semana 9 – Dashboard", goal: "Indicadores: clientes, orçamentos enviados, valor fechado" },
    { title: "Semana 10 – Follow-up n8n", goal: "Lembretes automáticos suaves e log de interações" },
    { title: "Semana 11 – Template comercial", goal: "Empacotar solução para reutilizar em outras empresas" },
    { title: "Semana 12 – Pitch + Métricas", goal: "Apresentação e antes/depois dos KPIs" },
  ];

  // Cria as 12 semanas
  let weeks: Week[] = Array.from({ length: 12 }).map((_, i) =>
    makeWeek(
      new Date(monday.getTime() + i * 7 * 24 * 60 * 60 * 1000),
      i + 1,
      weekMeta[i].title,
      weekMeta[i].goal
    )
  );

  // 12 templates (um por semana) — podem ser editados no app depois
  const templates: Template[] = [
    {
      id: uid(), week_number: 1,
      title: "Template Semana 1 – Fundamentos JS",
      goal: "Entender variáveis, if/else, arrays, loops, funções; mini-CRM",
      tasks: [
        { id: uid(), title: "Variáveis + console", type: TaskType.Study, estimated_minutes: 40 },
        { id: uid(), title: "If/Else exercícios", type: TaskType.Practice, estimated_minutes: 40 },
        { id: uid(), title: "Arrays e Loops", type: TaskType.Study, estimated_minutes: 40 },
        { id: uid(), title: "Funções", type: TaskType.Study, estimated_minutes: 40 },
        { id: uid(), title: "Mini-CRM em JS", type: TaskType.Review, estimated_minutes: 60 },
      ]
    },
    {
      id: uid(), week_number: 2,
      title: "Template Semana 2 – APIs + Sheets",
      goal: "Consumir APIs e gravar em Google Sheets",
      tasks: [
        { id: uid(), title: "O que é API + JSON", type: TaskType.Study, estimated_minutes: 40 },
        { id: uid(), title: "Testar API no Hoppscotch", type: TaskType.Practice, estimated_minutes: 30 },
        { id: uid(), title: "Apps Script: gravar linha no Sheets", type: TaskType.Practice, estimated_minutes: 50 },
        { id: uid(), title: "Mini projeto: API → Sheets", type: TaskType.Review, estimated_minutes: 60 },
      ]
    },
    {
      id: uid(), week_number: 3,
      title: "Template Semana 3 – Banco (Airtable/Supabase)",
      goal: "Modelar CRM (Clientes, Orçamentos, Interações)",
      tasks: [
        { id: uid(), title: "Modelo relacional do CRM", type: TaskType.Study, estimated_minutes: 45 },
        { id: uid(), title: "Criar tabelas (Airtable ou Supabase)", type: TaskType.Practice, estimated_minutes: 60 },
        { id: uid(), title: "Visual Kanban (status vendas)", type: TaskType.Practice, estimated_minutes: 30 },
        { id: uid(), title: "Popular dados de teste", type: TaskType.Review, estimated_minutes: 30 },
      ]
    },
    {
      id: uid(), week_number: 4,
      title: "Template Semana 4 – n8n fluxo inicial",
      goal: "Formulário → CRM → resposta",
      tasks: [
        { id: uid(), title: "Instalar/abrir n8n", type: TaskType.Study, estimated_minutes: 30 },
        { id: uid(), title: "Node Webhook + Sheets/Airtable", type: TaskType.Practice, estimated_minutes: 60 },
        { id: uid(), title: "Responder e-mail/whatsapp simples", type: TaskType.Practice, estimated_minutes: 45 },
        { id: uid(), title: "Ramo de erro (fallback)", type: TaskType.Review, estimated_minutes: 30 },
      ]
    },
    {
      id: uid(), week_number: 5,
      title: "Template Semana 5 – CRM Básico real",
      goal: "Cadastro real + status de vendas",
      tasks: [
        { id: uid(), title: "Campos essenciais do cliente", type: TaskType.Study, estimated_minutes: 30 },
        { id: uid(), title: "Inserir contatos reais", type: TaskType.Practice, estimated_minutes: 60 },
        { id: uid(), title: "Fluxo de atualização de status", type: TaskType.Practice, estimated_minutes: 45 },
        { id: uid(), title: "Checklist de qualidade", type: TaskType.Review, estimated_minutes: 30 },
      ]
    },
    {
      id: uid(), week_number: 6,
      title: "Template Semana 6 – Pré-orçamento",
      goal: "Gerar rascunho; envio humano",
      tasks: [
        { id: uid(), title: "Definir campos do rascunho", type: TaskType.Study, estimated_minutes: 30 },
        { id: uid(), title: "Cálculo aproximado (faixa de preço)", type: TaskType.Practice, estimated_minutes: 50 },
        { id: uid(), title: "Gerar PDF rascunho (não enviar)", type: TaskType.Practice, estimated_minutes: 50 },
        { id: uid(), title: "Revisão manual do envio", type: TaskType.Review, estimated_minutes: 30 },
      ]
    },
    {
      id: uid(), week_number: 7,
      title: "Template Semana 7 – Integração CRM+Rascunho",
      goal: "Vincular orçamentos ao CRM; status automático",
      tasks: [
        { id: uid(), title: "Relacionar rascunhos ao cliente", type: TaskType.Practice, estimated_minutes: 45 },
        { id: uid(), title: "Atualizar status para 'em negociação'", type: TaskType.Practice, estimated_minutes: 30 },
        { id: uid(), title: "Regras de negócio (campos obrigatórios)", type: TaskType.Study, estimated_minutes: 30 },
        { id: uid(), title: "Teste de ponta a ponta", type: TaskType.Review, estimated_minutes: 45 },
      ]
    },
    {
      id: uid(), week_number: 8,
      title: "Template Semana 8 – App interno (Glide)",
      goal: "Consulta de clientes/orçamentos",
      tasks: [
        { id: uid(), title: "Criar app no Glide", type: TaskType.Study, estimated_minutes: 30 },
        { id: uid(), title: "Listagem de clientes", type: TaskType.Practice, estimated_minutes: 45 },
        { id: uid(), title: "Detalhe do orçamento (somente leitura)", type: TaskType.Practice, estimated_minutes: 45 },
        { id: uid(), title: "Testar offline/caching", type: TaskType.Review, estimated_minutes: 30 },
      ]
    },
    {
      id: uid(), week_number: 9,
      title: "Template Semana 9 – Dashboard",
      goal: "Métricas de vendas e progresso",
      tasks: [
        { id: uid(), title: "Escolher ferramenta (Retool/Metabase)", type: TaskType.Study, estimated_minutes: 20 },
        { id: uid(), title: "Total de clientes / em negociação", type: TaskType.Practice, estimated_minutes: 50 },
        { id: uid(), title: "Valor fechado / período", type: TaskType.Practice, estimated_minutes: 50 },
        { id: uid(), title: "Validação de dados", type: TaskType.Review, estimated_minutes: 30 },
      ]
    },
    {
      id: uid(), week_number: 10,
      title: "Template Semana 10 – Follow-up n8n",
      goal: "Lembretes + log de interações",
      tasks: [
        { id: uid(), title: "Regra 3 dias pós-envio", type: TaskType.Study, estimated_minutes: 30 },
        { id: uid(), title: "Mensagem suave de follow-up", type: TaskType.Practice, estimated_minutes: 45 },
        { id: uid(), title: "Evitar spam (throttle 72h)", type: TaskType.Practice, estimated_minutes: 45 },
        { id: uid(), title: "Log no CRM", type: TaskType.Review, estimated_minutes: 30 },
      ]
    },
    {
      id: uid(), week_number: 11,
      title: "Template Semana 11 – Template comercial",
      goal: "Empacotar solução reutilizável",
      tasks: [
        { id: uid(), title: "Variáveis de ambiente (tokens/URLs)", type: TaskType.Study, estimated_minutes: 30 },
        { id: uid(), title: "Documentação passo a passo", type: TaskType.Practice, estimated_minutes: 60 },
        { id: uid(), title: "Checklist de implantação", type: TaskType.Review, estimated_minutes: 30 },
        { id: uid(), title: "Teste com empresa amiga", type: TaskType.Practice, estimated_minutes: 45 },
      ]
    },
    {
      id: uid(), week_number: 12,
      title: "Template Semana 12 – Pitch + KPIs",
      goal: "Apresentar resultado e fechar 1º cliente",
      tasks: [
        { id: uid(), title: "Antes/Depois dos KPIs (TTEO, follow-up, fechamento)", type: TaskType.Review, estimated_minutes: 45 },
        { id: uid(), title: "Slides de 1 página (problema → solução → benefícios)", type: TaskType.Practice, estimated_minutes: 60 },
        { id: uid(), title: "Pitch com consultor/parceiro", type: TaskType.Practice, estimated_minutes: 45 },
        { id: uid(), title: "Plano dos próximos 90 dias", type: TaskType.Study, estimated_minutes: 30 },
      ]
    },
  ];

  // Aplica automaticamente o template correspondente em CADA semana
  weeks = weeks.map((wk) => {
    const tpl = templates.find(t => t.week_number === wk.number);
    return tpl ? distributeTemplateIntoWeekByCapacity(wk, tpl) : wk;
  });

  // Semana 1 já fica "in_progress" (definido dentro da distribuição)
  return { weeks, kpis: SEED_KPIS, templates, notes: [] };
}


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
    const loadInitialState = () => {
      const state = initialState();
      setWeeks(state.weeks);
      setKpis(state.kpis);
      setTemplates(state.templates);
      setNotes(state.notes);
    };

    try {
        const rawState = localStorage.getItem(KEY);
        if (rawState) {
          const state: AppState = JSON.parse(rawState);
          // Check for essential data, if not present, reload initial state
          // This handles cases where the app structure changed.
          if (!state.weeks || state.weeks.length < 12 || !state.kpis || !state.templates) {
            loadInitialState();
          } else {
            setWeeks(state.weeks);
            setKpis(state.kpis);
            setTemplates(state.templates);
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
      
      const pristineWeeks = initialState().weeks;
      const originalWeekStructure = pristineWeeks.find(w => w.number === weekNumber);

      if (originalWeekStructure) {
        const weekWithTemplate = distributeTemplateIntoWeekByCapacity(originalWeekStructure, template);
        newWeeks[weekIndex] = weekWithTemplate;
      }

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
