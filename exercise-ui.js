import { state } from './state.js';
import { t } from './i18n.js';
import * as Logic from './exercise-logic.js';
import { startTimer } from './exercise-timer.js';
import Sortable from 'sortablejs';

export function renderRoutines() {
    const list = document.getElementById('routines-list');
    if (!list) return;

    list.innerHTML = '';
    state.routines.forEach(routine => {
        const isSelected = state.selectedRoutineId === routine.id;
        const card = document.createElement('div');
        card.className = `routine-card ${isSelected ? 'selected' : ''}`;
        card.dataset.id = routine.id;
        card.innerHTML = `
            <div class="routine-header">
                <div class="routine-selector-container">
                    <div class="routine-select-box ${isSelected ? 'active' : ''}" title="Seleccionar rutina"></div>
                </div>
                <div class="routine-title-group" style="flex: 1;">
                    <h3 class="routine-name-editable" contenteditable="true" data-placeholder="${t('untitled_routine', state.language)}">${routine.name || ''}</h3>
                </div>
                <div class="meal-header-actions">
                    <button class="add-mini-btn start-workout-trigger" style="background:var(--primary); color:black; border:none; padding:4px 10px;">${t('start_workout', state.language)}</button>
                    <button class="edit-btn-mini reset-routine-series" title="${t('reset_series', state.language)}">🔄</button>
                    <button class="edit-btn-mini rename-routine" title="${t('rename_btn', state.language)}">✏️</button>
                    <button class="delete-btn delete-routine" title="${t('delete_btn', state.language)}">🗑️</button>
                    <span class="drag-handle" title="Arrastrar para reordenar rutinas">☰</span>
                </div>
            </div>
            <div class="exercise-items">
                ${routine.exercises.map(ex => {
                    const isCompleted = ex.doneSeries && ex.doneSeries.length >= ex.sets;
                    // Logic for trend and last top set
                    const groupId = ex.exerciseGroupId || ex.id;
                    const groupLogs = state.workoutLogs.filter(l => l.exercises.some(le => le.exerciseGroupId === groupId));
                    let trendHtml = '';
                    let lastTopSetHtml = '';
                    if (groupLogs.length > 0) {
                        const lastLog = groupLogs[0];
                        const lastEx = lastLog.exercises.find(le => le.exerciseGroupId === groupId);
                        if (lastEx && lastEx.sets.length > 0) {
                            const topSet = lastEx.sets.reduce((prev, curr) => (curr.weightKg * curr.reps > prev.weightKg * prev.reps) ? curr : prev);
                            lastTopSetHtml = `<div style="font-size:0.65rem; color:var(--primary); margin-top:2px;">${t('last_top_set', state.language)}: ${topSet.weightKg}kg x ${topSet.reps}</div>`;
                        }

                        if (groupLogs.length >= 3) {
                            // Simple volume comparison
                            const vol1 = lastEx ? lastEx.sets.reduce((s, c) => s + (c.weightKg * c.reps), 0) : 0;
                            const prevEx = groupLogs[1].exercises.find(le => le.exerciseGroupId === groupId);
                            const vol2 = prevEx ? prevEx.sets.reduce((s, c) => s + (c.weightKg * c.reps), 0) : 0;
                            const prevEx2 = groupLogs[2].exercises.find(le => le.exerciseGroupId === groupId);
                            const vol3 = prevEx2 ? prevEx2.sets.reduce((s, c) => s + (c.weightKg * c.reps), 0) : 0;
                            
                            if (vol1 > vol2) trendHtml = `<span title="${t('trend_desc_improving', state.language)}">${t('trend_improving', state.language)}</span>`;
                            else if (vol1 <= vol2 && vol1 <= vol3) trendHtml = `<span title="${t('trend_desc_stalled', state.language)}" style="color:#ff8a80">${t('trend_stalled', state.language)}</span>`;
                        }
                    }

                    return `
                    <div class="exercise-item ${isCompleted ? 'completed' : ''}" data-id="${ex.id}">
                        <div class="exercise-info">
                            <div style="display:flex; justify-content:space-between; align-items:start;">
                                <h4 class="exercise-name-trigger" style="cursor:pointer; display:inline-block; margin:0;">${ex.name}</h4>
                                <div style="font-size:0.6rem; color:var(--text-light);">${trendHtml}</div>
                            </div>
                            <div class="exercise-config">
                                <span><strong class="editable" data-field="sets" style="cursor:pointer; border-bottom:1px dashed var(--secondary); padding:0 2px;">${ex.sets}</strong> ${t('sets', state.language)}</span>
                                <span><strong class="editable" data-field="reps" style="cursor:pointer; border-bottom:1px dashed var(--secondary); padding:0 2px;">${ex.reps}</strong> ${t('reps', state.language)}</span>
                                <span><strong class="editable" data-field="weight" style="cursor:pointer; border-bottom:1px dashed var(--secondary); padding:0 2px;">${ex.weight}</strong> kg</span>
                            </div>
                            ${lastTopSetHtml}
                            <div class="exercise-config" style="margin-top:4px; font-size:0.7rem; opacity:0.8;">
                                <span>⏲️ <strong class="editable" data-field="restBetweenSets" style="cursor:pointer; border-bottom:1px dashed var(--secondary); padding:0 2px;">${ex.restBetweenSets}</strong>s (set)</span>
                                <span>⏲️ <strong class="editable" data-field="restBetweenExercises" style="cursor:pointer; border-bottom:1px dashed var(--secondary); padding:0 2px;">${ex.restBetweenExercises}</strong>s (ex)</span>
                            </div>
                        </div>
                        <div class="series-tracker">
                            ${Array.from({length: ex.sets}).map((_, i) => `
                                <div class="series-dot ${ex.doneSeries?.includes(i) ? 'done' : ''}" data-index="${i}">${i+1}</div>
                            `).join('')}
                            <div style="display:flex; flex-direction:column; gap:4px; margin-left:10px;">
                                <button class="delete-btn delete-ex" style="padding:2px 6px; font-size:0.6rem;">×</button>
                                <button class="add-mini-btn replace-ex" style="padding:2px 6px; font-size:0.5rem; border-color:var(--secondary); color:var(--secondary);" title="${t('replace_exercise', state.language)}">⇄</button>
                                <button class="add-mini-btn view-prog" style="padding:2px 6px; font-size:0.5rem; border-color:var(--primary); color:var(--primary);" title="${t('view_progress', state.language)}">📈</button>
                            </div>
                            <span class="item-drag-handle" style="margin-left:5px;">☰</span>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
            <div class="meal-footer">
                <button class="add-btn add-ex-trigger">${t('add_exercise', state.language)}</button>
            </div>
        `;

        const nameEl = card.querySelector('.routine-name-editable');
        
        nameEl.onblur = () => {
            const newName = nameEl.textContent.trim();
            if (newName !== routine.name) {
                Logic.renameRoutine(routine.id, newName);
            }
        };

        nameEl.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                nameEl.blur();
            }
        };

        card.querySelector('.rename-routine').onclick = () => {
            nameEl.focus();
            // Move cursor to end
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(nameEl);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
        };
        card.querySelector('.delete-routine').onclick = (e) => {
            e.stopPropagation();
            Logic.deleteRoutine(routine.id);
        };
        card.querySelector('.add-ex-trigger').onclick = () => Logic.addExercise(routine.id);
        card.querySelector('.start-workout-trigger').onclick = () => {
            import('./workout-logic.js').then(m => {
                const isActive = state.activeWorkout && state.activeWorkout.routineId === routine.id;
                if (isActive) {
                    m.openFinishWorkoutModal();
                } else {
                    m.startWorkout(routine.id, () => renderRoutines());
                }
            });
        };

        const workoutBtn = card.querySelector('.start-workout-trigger');
        if (state.activeWorkout && state.activeWorkout.routineId === routine.id) {
            workoutBtn.textContent = t('finish_workout', state.language);
            workoutBtn.style.background = 'var(--secondary)';
            
            // Highlight current active set if training
            const activeEx = state.activeWorkout.exercises[state.activeWorkout.currentExerciseIndex];
            if (activeEx) {
                const exItem = card.querySelector(`.exercise-item[data-id="${activeEx.exerciseId}"]`);
                if (exItem) {
                    const dot = exItem.querySelector(`.series-dot[data-index="${state.activeWorkout.currentSetIndex}"]`);
                    if (dot && !dot.classList.contains('done')) {
                        dot.style.borderColor = 'var(--secondary)';
                        dot.style.boxShadow = '0 0 10px rgba(100, 181, 246, 0.5)';
                    }
                }
            }
        } else {
            workoutBtn.textContent = t('start_workout', state.language);
            workoutBtn.style.background = 'var(--primary)';
        }

        card.querySelector('.routine-select-box').onclick = (e) => {
            e.stopPropagation();
            const rid = isSelected ? null : routine.id;
            Logic.selectRoutine(rid, () => renderRoutines());
        };

        card.querySelector('.reset-routine-series').onclick = (e) => {
            e.stopPropagation();
            Logic.resetRoutineSeries(routine.id, () => renderRoutines());
        };

        card.querySelectorAll('.exercise-item').forEach(item => {
            const exId = item.dataset.id;
            const ex = routine.exercises.find(e => e.id === exId);

            item.querySelectorAll('.series-dot').forEach(dot => {
                dot.onclick = () => {
                    const idx = parseInt(dot.dataset.index);
                    const isLive = state.activeWorkout && state.activeWorkout.routineId === routine.id;
                    
                    if (isLive) {
                        import('./workout-logic.js').then(m => {
                            m.openSetEditor(routine.id, exId, idx);
                        });
                    } else {
                        // Manual toggle if not in a live workout
                        let done = [...(ex.doneSeries || [])];
                        const isNowDone = !done.includes(idx);
                        if (!isNowDone) {
                            done = done.filter(i => i !== idx);
                        } else {
                            done.push(idx);
                        }
                        Logic.updateExercise(routine.id, exId, { doneSeries: done });
                    }
                };
            });

            item.querySelectorAll('.editable').forEach(el => {
                el.onclick = (e) => {
                    if (el.querySelector('input')) return;
                    
                    const field = el.dataset.field;
                    const currentVal = el.textContent;
                    const input = document.createElement('input');
                    input.type = 'number';
                    input.step = field === 'weight' ? '0.1' : '1';
                    input.value = currentVal;
                    input.className = 'inline-amount-input';
                    input.style.width = '45px';
                    input.style.fontSize = '0.85rem';
                    
                    const save = () => {
                        const newVal = parseFloat(input.value);
                        if (!isNaN(newVal)) {
                            Logic.updateExercise(routine.id, exId, { [field]: newVal });
                        }
                    };

                    input.onblur = save;
                    input.onkeydown = (ev) => {
                        if (ev.key === 'Enter') input.blur();
                        if (ev.key === 'Escape') {
                            input.onblur = null;
                            el.textContent = currentVal;
                        }
                    };

                    el.textContent = '';
                    el.appendChild(input);
                    input.focus();
                    input.select();
                };
            });

            item.querySelector('.exercise-name-trigger').onclick = () => Logic.editExercise(routine.id, exId);
            item.querySelector('.delete-ex').onclick = () => Logic.deleteExercise(routine.id, exId);
            item.querySelector('.view-prog').onclick = () => {
                 import('./progression-logic.js').then(m => m.showProgression(ex.exerciseGroupId || ex.id));
            };
            item.querySelector('.replace-ex').onclick = () => {
                const modal = document.getElementById('replace-exercise-modal');
                const nameInput = document.getElementById('replace-ex-name');
                const keepCheck = document.getElementById('replace-ex-keep-prog');
                const confirmBtn = document.getElementById('confirm-replace-btn');
                
                nameInput.value = ex.name;
                modal.style.display = 'block';
                confirmBtn.onclick = () => {
                    Logic.replaceExercise(routine.id, exId, nameInput.value.trim(), keepCheck.checked, () => {
                        modal.style.display = 'none';
                        renderRoutines();
                    });
                };
            };
        });

        list.appendChild(card);

        // Initialize Sortable for Exercises within this routine
        const exList = card.querySelector('.exercise-items');
        if (exList) {
            new Sortable(exList, {
                animation: 150,
                handle: '.item-drag-handle',
                onEnd: (evt) => {
                    const routineId = routine.id;
                    const items = Array.from(exList.children);
                    const orderedIds = items.map(item => item.dataset.id);
                    Logic.reorderExercises(routineId, orderedIds);
                }
            });
        }
    });

    // Initialize Sortable for Routines list
    new Sortable(list, {
        animation: 150,
        handle: '.drag-handle',
        onEnd: (evt) => {
            const cards = Array.from(list.children);
            const orderedIds = cards.map(c => c.dataset.id);
            Logic.reorderRoutines(orderedIds);
        }
    });
}