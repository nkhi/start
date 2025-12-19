import { useRef, useState } from 'react';
import { Calendar, Trash, X, Ghost, CaretDown, Heart, Briefcase } from '@phosphor-icons/react';
import { DateUtility } from '../../utils';
import type { Task } from '../../types';
import styles from './Graveyard.module.css';

interface GraveyardProps {
    isOpen: boolean;
    tasks: Task[];
    onClose: () => void;
    onResurrect: (taskId: string, targetDate: string) => void;
    onDelete: (taskId: string) => void;
}

/**
 * Graveyard Panel - Compact side panel for graveyarded tasks.
 * Tasks are grouped by category (life/work) with collapsible accordions.
 */
export function Graveyard({ isOpen, tasks, onClose, onResurrect, onDelete }: GraveyardProps) {
    const [lifeExpanded, setLifeExpanded] = useState(true);
    const [workExpanded, setWorkExpanded] = useState(true);

    const lifeTasks = tasks.filter(t => t.category !== 'work');
    const workTasks = tasks.filter(t => t.category === 'work');

    return (
        <div className={`${styles.graveyardPanel} ${isOpen ? styles.open : ''}`}>
            {/* Close button in top left */}
            <button className={styles.closeBtn} onClick={onClose} title="Close">
                <X size={14} />
            </button>

            <div className={styles.graveyardList}>
                {tasks.length === 0 ? (
                    <div className={styles.graveyardEmpty}>
                        <Ghost size={32} weight="duotone" className={styles.graveyardEmptyIcon} />
                        <span className={styles.graveyardEmptyText}>No tasks</span>
                    </div>
                ) : (
                    <>
                        {/* Life Accordion */}
                        {lifeTasks.length > 0 && (
                            <div className={styles.categorySection}>
                                <button
                                    className={styles.categoryHeader}
                                    onClick={() => setLifeExpanded(!lifeExpanded)}
                                >
                                    <CaretDown
                                        size={12}
                                        className={`${styles.caretIcon} ${lifeExpanded ? styles.expanded : ''}`}
                                    />
                                    {/* <Heart size={12} weight="fill" className={styles.lifeIcon} /> */}
                                    <span>Life</span>
                                    <span className={styles.categoryCount}>{lifeTasks.length}</span>
                                </button>
                                {lifeExpanded && (
                                    <div className={styles.categoryTasks}>
                                        {lifeTasks.map(task => (
                                            <GraveyardTask
                                                key={task.id}
                                                task={task}
                                                onResurrect={onResurrect}
                                                onDelete={onDelete}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Divider */}
                        {lifeTasks.length > 0 && workTasks.length > 0 && (
                            <div className={styles.divider} />
                        )}

                        {/* Work Accordion */}
                        {workTasks.length > 0 && (
                            <div className={styles.categorySection}>
                                <button
                                    className={styles.categoryHeader}
                                    onClick={() => setWorkExpanded(!workExpanded)}
                                >
                                    <CaretDown
                                        size={12}
                                        className={`${styles.caretIcon} ${workExpanded ? styles.expanded : ''}`}
                                    />
                                    {/* <Briefcase size={12} weight="fill" className={styles.workIcon} /> */}
                                    <span>Work</span>
                                    <span className={styles.categoryCount}>{workTasks.length}</span>
                                </button>
                                {workExpanded && (
                                    <div className={styles.categoryTasks}>
                                        {workTasks.map(task => (
                                            <GraveyardTask
                                                key={task.id}
                                                task={task}
                                                onResurrect={onResurrect}
                                                onDelete={onDelete}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

interface GraveyardTaskProps {
    task: Task;
    onResurrect: (taskId: string, targetDate: string) => void;
    onDelete: (taskId: string) => void;
}

function GraveyardTask({ task, onResurrect, onDelete }: GraveyardTaskProps) {
    const dateInputRef = useRef<HTMLInputElement>(null);
    const todayStr = DateUtility.formatDate(new Date());

    const handleCalendarClick = () => {
        dateInputRef.current?.showPicker?.();
        dateInputRef.current?.focus();
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedDate = e.target.value;
        if (selectedDate) {
            onResurrect(task.id, selectedDate);
        }
    };

    return (
        <div className={styles.graveyardTask}>
            <span className={styles.taskText}>{task.text}</span>
            <div className={styles.taskActions}>
                <input
                    ref={dateInputRef}
                    type="date"
                    defaultValue={todayStr}
                    onChange={handleDateChange}
                    className={styles.hiddenDateInput}
                />
                <button
                    className={styles.actionBtn}
                    onClick={handleCalendarClick}
                    title="Pick date to resurrect"
                >
                    <Calendar size={14} />
                </button>
                <button
                    className={`${styles.actionBtn} ${styles.deleteBtn}`}
                    onClick={() => onDelete(task.id)}
                    title="Delete permanently"
                >
                    <Trash size={14} />
                </button>
            </div>
        </div>
    );
}
