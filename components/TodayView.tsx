
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Day, Task, Note, Week } from '../types';
import { TaskStatus } from '../types';
import { Play, Pause, RotateCcw, Plus, Send, Book, SkipForward, Check } from 'lucide-react';
import Modal from './Modal';

interface TodayViewProps {
  day: Day | null;
  weeks: Week[];
  onTaskStatusChange: (weekNumber: number, dayIndex: number, taskIndex: number, status: TaskStatus) => void;
  onAddNote: (dayId: string, content: string) => void;
  notes: Note[];
}

const PomodoroTimer: React.FC<{ activeTask: Task | null }> = ({ activeTask }) => {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isActive) {
      interval = setInterval(() => {
        if (seconds > 0) {
          setSeconds(seconds - 1);
        } else if (minutes > 0) {
          setMinutes(minutes - 1);
          setSeconds(59);
        } else {
          setIsActive(false);
          setIsBreak(prev => !prev);
          alert(`${isBreak ? 'Pausa' : 'Pomodoro'} finalizado!`);
          resetTimer();
        }
      }, 1000);
    } else if (!isActive && seconds !== 0) {
      clearInterval(interval!);
    }
    return () => clearInterval(interval!);
  }, [isActive, seconds, minutes, isBreak]);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setMinutes(isBreak ? 5 : 25);
    setSeconds(0);
  };

  const progress = ((isBreak ? 5 : 25) * 60 - (minutes * 60 + seconds)) / ((isBreak ? 5 : 25) * 60) * 100;

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-center">
        <h2 className="text-xl font-bold mb-2">Cronômetro Pomodoro</h2>
        <p className="text-gray-400 mb-4 h-6">{activeTask ? `Trabalhando em: ${activeTask.title}` : 'Selecione uma tarefa para começar'}</p>
        <div className="relative w-48 h-48 mx-auto mb-4">
            <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle className="text-gray-700" strokeWidth="7" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50" />
                <circle
                className="text-indigo-500"
                strokeWidth="7"
                strokeDasharray="283"
                strokeDashoffset={283 - (progress / 100) * 283}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="45"
                cx="50"
                cy="50"
                style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                />
            </svg>
            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-4xl font-bold">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </div>
        </div>
      <div className="flex justify-center space-x-4">
        <button onClick={toggleTimer} className="p-3 bg-indigo-600 hover:bg-indigo-700 rounded-full text-white transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed" disabled={!activeTask}>
          {isActive ? <Pause size={24} /> : <Play size={24} />}
        </button>
        <button onClick={resetTimer} className="p-3 bg-gray-600 hover:bg-gray-500 rounded-full text-white transition-colors">
          <RotateCcw size={24} />
        </button>
      </div>
    </div>
  );
};


export const TodayView: React.FC<TodayViewProps> = ({ day, weeks, onTaskStatusChange, onAddNote, notes }) => {
    const [activeTask, setActiveTask] = useState<Task | null>(null);
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [noteContent, setNoteContent] = useState('');

    const dayInfo = useMemo(() => {
        if(!day) return null;
        for(let w_idx = 0; w_idx < weeks.length; w_idx++) {
            const week = weeks[w_idx];
            for(let d_idx = 0; d_idx < week.days.length; d_idx++) {
                if(week.days[d_idx].id === day.id) {
                    return { weekNumber: week.number, dayIndex: d_idx};
                }
            }
        }
        return null;
    }, [day, weeks]);

    const handleStatusChange = (taskIndex: number, status: TaskStatus) => {
        if(!dayInfo) return;
        onTaskStatusChange(dayInfo.weekNumber, dayInfo.dayIndex, taskIndex, status);
    };

    const handleAddNoteClick = () => {
        if(day) {
            onAddNote(day.id, noteContent);
            setNoteContent('');
            setIsNoteModalOpen(false);
        }
    };

    if (!day || !dayInfo) {
        return (
            <div className="text-center py-16 bg-gray-800 rounded-lg">
                <h1 className="text-2xl font-bold">Nada planejado para hoje.</h1>
                <p className="text-gray-400 mt-2">Aproveite sua pausa ou planeje algumas tarefas!</p>
            </div>
        );
    }
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
                <header>
                    <h1 className="text-3xl font-bold">Foco de Hoje</h1>
                    <p className="text-gray-400 capitalize">{new Date(day.date).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}</p>
                </header>
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">Tarefas</h2>
                        <button onClick={() => setIsNoteModalOpen(true)} className="flex items-center space-x-2 text-sm text-indigo-400 hover:text-indigo-300">
                            <Plus size={16} /><span>Adicionar Nota</span>
                        </button>
                    </div>
                    <div className="space-y-3">
                        {day.tasks.map((task, index) => (
                            <div key={task.id} 
                                className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${activeTask?.id === task.id ? 'bg-indigo-900/50 ring-2 ring-indigo-500' : 'bg-gray-700 hover:bg-gray-600'} ${task.status === TaskStatus.Done ? 'opacity-50' : ''}`}
                                onClick={() => task.status !== TaskStatus.Done && setActiveTask(task)}>
                                <div className="flex justify-between items-center">
                                    <p className={task.status === TaskStatus.Done ? 'line-through text-gray-400' : ''}>{task.title}</p>
                                    {task.status !== TaskStatus.Done && (
                                        <div className="flex items-center space-x-2">
                                            <button onClick={(e) => { e.stopPropagation(); handleStatusChange(index, TaskStatus.Skipped)}} className="p-1 text-yellow-400 hover:text-yellow-300"><SkipForward size={18} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); handleStatusChange(index, TaskStatus.Done)}} className="p-1 text-green-400 hover:text-green-300"><Check size={18} /></button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                 <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h2 className="text-xl font-bold mb-4">Notas Diárias</h2>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                        {notes.length > 0 ? notes.map(note => (
                            <div key={note.id} className="bg-gray-700 p-3 rounded-md">
                                <p className="text-gray-300">{note.content}</p>
                                <p className="text-xs text-gray-500 text-right mt-1">{new Date(note.createdAt).toLocaleString('pt-BR')}</p>
                            </div>
                        )) : <p className="text-gray-500">Nenhuma nota para hoje.</p>}
                    </div>
                </div>
            </div>
            <div className="lg:col-span-1">
                <PomodoroTimer activeTask={activeTask} />
            </div>
            <Modal isOpen={isNoteModalOpen} onClose={() => setIsNoteModalOpen(false)} title="Adicionar uma Nota para Hoje">
                <div className="space-y-4">
                    <textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} placeholder="Escreva seus pensamentos, reflexões ou lembretes aqui..." rows={5} className="w-full bg-gray-700 text-white p-2 rounded-md focus:ring-indigo-500 focus:border-indigo-500"></textarea>
                    <div className="flex justify-end">
                        <button onClick={handleAddNoteClick} disabled={!noteContent.trim()} className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-500">
                            <Send size={16} /><span>Salvar Nota</span>
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};