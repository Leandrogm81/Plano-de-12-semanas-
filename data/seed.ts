
import type { Week, KPI, Task } from '../types';
import { TaskStatus, TaskType } from '../types';

export const SEED_WEEKS: Week[] = Array.from({ length: 12 }, (_, i) => {
    const weekNumber = i + 1;
    
    const now = new Date();
    const spTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const dayOfWeekInSP = spTime.getDay(); // Sunday = 0, ...
    const startDate = spTime;
    startDate.setDate(startDate.getDate() - (dayOfWeekInSP === 0 ? 6 : dayOfWeekInSP - 1) + (i * 7));
    
    return {
        id: `week-${weekNumber}`,
        number: weekNumber,
        title: weekNumber === 1 ? 'Semana 1: Fundamentos e Configuração' : `Semana ${weekNumber}: Em Breve`,
        goal: weekNumber === 1 ? 'Estabelecer um ambiente de desenvolvimento sólido e entender os princípios básicos da web.' : 'Meta para esta semana',
        status: weekNumber === 1 ? 'in-progress' : 'pending',
        days: Array.from({ length: 7 }, (_, dayIndex) => {
            const dayDate = new Date(startDate);
            dayDate.setDate(startDate.getDate() + dayIndex);
            return {
                id: `d-${weekNumber}-${dayIndex}`,
                date: dayDate.toISOString().split('T')[0],
                planned_minutes: dayIndex < 5 ? 120 : 180, // Weekdays vs Weekends
                tasks: [],
            };
        }),
    };
});

export const SEED_KPIS: KPI[] = [
  { id: 'kpi1', name: 'Total de Horas Estudadas', baseline: 0, target: 184, current: 0, unit: 'horas' },
  { id: 'kpi2', name: 'Tarefas Concluídas', baseline: 0, target: 250, current: 0, unit: 'tarefas' },
  { id: 'kpi3', name: 'Taxa de Follow-up', baseline: 0, target: 80, current: 0, unit: '%' },
  { id: 'kpi4', name: 'Taxa de Fechamento de Projetos', baseline: 0, target: 25, current: 0, unit: '%' },
];
