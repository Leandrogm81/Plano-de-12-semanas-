
import React, { useState } from 'react';
import type { Template, TemplateTask } from '../types';
import { TaskType } from '../types';
import Modal from './Modal';
import { PlusCircle, Edit, Trash2, BookOpen, Wrench, RefreshCw, Save } from 'lucide-react';

interface TemplatesViewProps {
    templates: Template[];
    setTemplates: React.Dispatch<React.SetStateAction<Template[]>>;
}

const TaskTypeIcon = ({ type }: { type: TaskType }) => {
    switch(type) {
        case TaskType.Study: return <BookOpen className="h-4 w-4 text-blue-400" />;
        case TaskType.Practice: return <Wrench className="h-4 w-4 text-green-400" />;
        case TaskType.Review: return <RefreshCw className="h-4 w-4 text-yellow-400" />;
        default: return null;
    }
};

const TemplateEditor: React.FC<{ template: Template | null, onSave: (template: Template) => void, onCancel: () => void }> = ({ template, onSave, onCancel }) => {
    const [editedTemplate, setEditedTemplate] = useState<Template>(
        template || { id: `template-${Date.now()}`, week_number: 1, title: '', goal: '', tasks: [] }
    );

    const handleTaskChange = (index: number, field: keyof TemplateTask, value: string | number) => {
        const newTasks = [...editedTemplate.tasks];
        (newTasks[index] as any)[field] = value;
        setEditedTemplate({ ...editedTemplate, tasks: newTasks });
    };

    const addTask = () => {
        const newTask: TemplateTask = { id: `tt-${Date.now()}`, title: '', type: TaskType.Study, estimated_minutes: 30 };
        setEditedTemplate({ ...editedTemplate, tasks: [...editedTemplate.tasks, newTask] });
    };
    
    const removeTask = (index: number) => {
        const newTasks = editedTemplate.tasks.filter((_, i) => i !== index);
        setEditedTemplate({...editedTemplate, tasks: newTasks});
    };

    return (
        <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
            <input type="text" placeholder="Título do Template" value={editedTemplate.title} onChange={e => setEditedTemplate({ ...editedTemplate, title: e.target.value })} className="w-full bg-gray-700 p-2 rounded" />
            <textarea placeholder="Meta do Template" value={editedTemplate.goal} onChange={e => setEditedTemplate({ ...editedTemplate, goal: e.target.value })} className="w-full bg-gray-700 p-2 rounded" />
            <h3 className="text-lg font-semibold">Tarefas</h3>
            {editedTemplate.tasks.map((task, index) => (
                <div key={index} className="flex items-center gap-2 bg-gray-800 p-2 rounded">
                    <input type="text" placeholder="Título da Tarefa" value={task.title} onChange={e => handleTaskChange(index, 'title', e.target.value)} className="flex-grow bg-gray-700 p-2 rounded" />
                    <select value={task.type} onChange={e => handleTaskChange(index, 'type', e.target.value as TaskType)} className="bg-gray-700 p-2 rounded">
                        <option value={TaskType.Study}>Estudo</option>
                        <option value={TaskType.Practice}>Prática</option>
                        <option value={TaskType.Review}>Revisão</option>
                    </select>
                    <input type="number" value={task.estimated_minutes} onChange={e => handleTaskChange(index, 'estimated_minutes', parseInt(e.target.value, 10))} className="w-24 bg-gray-700 p-2 rounded" />
                    <button onClick={() => removeTask(index)} className="p-2 text-red-500 hover:text-red-400"><Trash2 size={18} /></button>
                </div>
            ))}
            <button onClick={addTask} className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300"><PlusCircle size={18} /> Adicionar Tarefa</button>
            <div className="flex justify-end gap-2 pt-4">
                <button onClick={onCancel} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md">Cancelar</button>
                <button onClick={() => onSave(editedTemplate)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md"><Save size={18} /> Salvar</button>
            </div>
        </div>
    );
};

const TemplatesView: React.FC<TemplatesViewProps> = ({ templates, setTemplates }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

    const handleSaveTemplate = (template: Template) => {
        const index = templates.findIndex(t => t.id === template.id);
        if (index > -1) {
            const newTemplates = [...templates];
            newTemplates[index] = template;
            setTemplates(newTemplates);
        } else {
            setTemplates([...templates, template]);
        }
        setIsModalOpen(false);
        setEditingTemplate(null);
    };

    const handleDeleteTemplate = (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este template?')) {
            setTemplates(templates.filter(t => t.id !== id));
        }
    };

    const openEditModal = (template: Template) => {
        setEditingTemplate(template);
        setIsModalOpen(true);
    };

    const openNewModal = () => {
        setEditingTemplate(null);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Gerenciar Templates</h1>
                <button onClick={openNewModal} className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg">
                    <PlusCircle size={20} />
                    <span>Novo Template</span>
                </button>
            </header>
            
            {templates.length === 0 ? (
                <div className="text-center py-16 bg-gray-800 rounded-lg">
                    <p className="text-gray-400">Você ainda não tem nenhum template.</p>
                    <p className="text-gray-500 mt-2">Crie um template para reutilizar seus planos semanais.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map(template => (
                        <div key={template.id} className="bg-gray-800 p-4 rounded-lg shadow-lg flex flex-col justify-between">
                            <div>
                                <h2 className="text-xl font-bold">{template.title}</h2>
                                <p className="text-gray-400 mt-1">{template.goal}</p>
                                <ul className="mt-4 space-y-2 text-sm">
                                    {template.tasks.slice(0, 3).map(task => (
                                        <li key={task.id} className="flex items-center space-x-2 text-gray-300">
                                            <TaskTypeIcon type={task.type} />
                                            <span>{task.title}</span>
                                        </li>
                                    ))}
                                    {template.tasks.length > 3 && <li className="text-gray-500">...e mais {template.tasks.length - 3}</li>}
                                </ul>
                            </div>
                            <div className="flex justify-end space-x-2 mt-4">
                                <button onClick={() => openEditModal(template)} className="p-2 hover:bg-gray-700 rounded-full"><Edit size={18} /></button>
                                <button onClick={() => handleDeleteTemplate(template.id)} className="p-2 text-red-500 hover:bg-gray-700 rounded-full"><Trash2 size={18} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTemplate ? "Editar Template" : "Criar Novo Template"}>
                <TemplateEditor template={editingTemplate} onSave={handleSaveTemplate} onCancel={() => setIsModalOpen(false)} />
            </Modal>
        </div>
    );
};

export default TemplatesView;