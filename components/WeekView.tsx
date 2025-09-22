
import React, { useState } from 'react';
import type { Week, Day, Task, Template } from '../types';
import { TaskStatus, TaskType } from '../types';
import { Check, Circle, SkipForward, Clock, BookOpen, Wrench, RefreshCw, PlusCircle, CheckCircle } from 'lucide-react';
import Modal from './Modal';

interface WeekViewProps {
  week?: Week;
  onTaskStatusChange: (weekNumber: number, dayIndex: number, taskIndex: number, status: TaskStatus) => void;
  onApplyTemplate: (weekNumber: number, templateId: string) => void;
  templates: Template[];
}

const TaskTypeIcon = ({ type }: { type: TaskType }) => {
    switch(type) {
        case TaskType.Study: return <BookOpen className="h-4 w-4 text-blue-400" />;
        case TaskType.Practice: return <Wrench className="h-4 w-4 text-green-400" />;
        case TaskType.Review: return <RefreshCw className="h-4 w-4 text-yellow-400" />;
        default: return null;
    }
};

const TaskItem: React.FC<{ task: Task, onStatusChange: (status: TaskStatus) => void }> = ({ task, onStatusChange }) => {
    const isDone = task.status === TaskStatus.Done;
    return (
        <div className={`flex items-center justify-between p-3 rounded-md transition-colors ${isDone ? 'bg-gray-700/50 text-gray-500' : 'bg-gray-700 hover:bg-gray-600'}`}>
            <div className="flex items-center space-x-3">
                <TaskTypeIcon type={task.type} />
                <span className={`flex-grow ${isDone ? 'line-through' : ''}`}>{task.title}</span>
                <div className="flex items-center text-xs text-gray-400 space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{task.estimated_minutes}m</span>
                </div>
            </div>
            <div className="flex items-center space-x-2">
                 <button onClick={() => onStatusChange(TaskStatus.Skipped)} className="p-1 rounded-full hover:bg-yellow-500/20 text-yellow-500 transition-colors">
                    <SkipForward size={16} />
                </button>
                <button onClick={() => onStatusChange(TaskStatus.Done)} className="p-1 rounded-full hover:bg-green-500/20 text-green-500 transition-colors">
                    <Check size={16} />
                </button>
            </div>
        </div>
    );
};


const DayCard: React.FC<{ day: Day, onTaskStatusChange: (taskIndex: number, status: TaskStatus) => void }> = ({ day, onTaskStatusChange }) => {
    const dayName = new Date(day.date).toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'UTC' });
    const tasksDone = day.tasks.filter(t => t.status === TaskStatus.Done).length;
    const allTasksDone = day.tasks.length > 0 && tasksDone === day.tasks.length;

    return (
        <div className="bg-gray-800 p-4 rounded-lg shadow-md flex-grow">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg capitalize">{dayName} <span className="text-gray-400 text-sm font-normal">{day.date}</span></h3>
                {allTasksDone && <CheckCircle className="text-green-500"/>}
            </div>
            <div className="space-y-2">
                {day.tasks.length > 0 ? (
                    day.tasks.map((task, index) => (
                        <TaskItem key={task.id} task={task} onStatusChange={(status) => onTaskStatusChange(index, status)} />
                    ))
                ) : (
                    <div className="text-center py-4 text-gray-500">
                        <p>Nenhuma tarefa planejada para hoje.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const WeekView: React.FC<WeekViewProps> = ({ week, onTaskStatusChange, onApplyTemplate, templates }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');

    if (!week) {
        return <div className="text-center text-gray-400">Selecione uma semana para ver seus detalhes.</div>;
    }
    
    const handleConfirmApply = () => {
        if(selectedTemplate) {
            onApplyTemplate(week.number, selectedTemplate);
        }
        setIsModalOpen(false);
        setSelectedTemplate('');
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Semana {week.number}: {week.title}</h1>
                    <p className="mt-1 text-gray-400">{week.goal}</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                    <PlusCircle size={20} />
                    <span>Aplicar Template</span>
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {week.days.map((day, dayIndex) => (
                    <DayCard
                        key={day.id}
                        day={day}
                        onTaskStatusChange={(taskIndex, status) => onTaskStatusChange(week.number, dayIndex, taskIndex, status)}
                    />
                ))}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Aplicar um Template">
                <div className="space-y-4">
                    <p className="text-gray-300">Selecione um template para aplicar à Semana {week.number}. Isso substituirá todas as tarefas existentes para esta semana.</p>
                    <select
                        value={selectedTemplate}
                        onChange={(e) => setSelectedTemplate(e.target.value)}
                        className="w-full bg-gray-700 border-gray-600 text-white rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="" disabled>Selecione um template</option>
                        {templates.map(t => (
                            <option key={t.id} value={t.id}>{t.title}</option>
                        ))}
                    </select>
                    <div className="flex justify-end space-x-3 pt-4">
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md text-white font-semibold">Cancelar</button>
                        <button onClick={handleConfirmApply} disabled={!selectedTemplate} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white font-semibold disabled:bg-gray-500 disabled:cursor-not-allowed">Aplicar</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default WeekView;