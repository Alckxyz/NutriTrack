import { state } from './state.js';
import { t } from './i18n.js';
import * as Logic from './exercise-logic.js';
import Sortable from 'sortablejs';
import { updatePlanSelector, updateRoutineSelector } from './exercise-ui-utils.js';
import { getExerciseItemHTML } from './exercise-ui-components.js';

export function renderRoutines() {
    const list = document.getElementById('routines-list');
    const routineSelect = document.getElementById('routine-select');
    const planSelect = document.getElementById('exercise-plan-select');
    const managePlansBtn = document.getElementById('manage-exercise-plans-btn');
    if (!list) return;

    updatePlanSelector(planSelect, managePlansBtn, renderRoutines);

    const routinesOfPlan = state.routines.filter(r => 
        r.planId === state.currentExercisePlanId || (!r.planId && state.currentExercisePlanId === 'ep1')
    );

    updateRoutineSelector(routineSelect, routinesOfPlan, renderRoutines);

    list.innerHTML = '';
    if (routinesOfPlan.length === 0) {
        list.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-light); border:1px dashed var(--border); border-radius:12px;">${state.language === 'es' ? 'Añade rutinas a este plan para empezar' : 'Add routines to this plan to start'}</div>`;
    }

    routinesOfPlan.forEach(routine => {
        const isSelected = state.selectedRoutineId === routine.id;
        const isLastFinished = state.lastFinishedRoutineId === routine.id;
        const card = document.createElement('div');
        card.className = `routine-card ${isSelected ? 'selected' : ''}`;
        card.style.marginBottom = '2rem';
        card.dataset.id = routine.id;
        card.innerHTML = `
        <div class="routine-header">
            <div class="routine-selector-container">
                <div class="routine-select-box ${isSelected ? 'active' : ''} ${isLastFinished ? 'finished' : ''}"></div>
            </div>
            <div class="routine-title-group" style="flex: 1;">
                <h3 class="routine-name-editable" style="cursor: pointer;" data-placeholder="${t('untitled_routine', state.language)}">${routine.name || t('untitled_routine', state.language)}</h3>
            </div>
            <div class="meal-header-actions">
                <button class="add-mini-btn start-workout-trigger" style="background:var(--primary); color:black; border:none; padding:4px 10px;">${t('start_workout', state.language)}</button>
                <button class="edit-btn-mini reset-routine-series" title="${t('reset_series', state.language)}">🔄</button>
                <button class="delete-btn delete-routine" title="${t('delete_btn', state.language)}">🗑️</button>
                <span class="drag-handle" title="Reordenar rutinas">☰</span>
            </div>
        </div>
        <div class="exercise-items">${routine.exercises.map(ex => getExerciseItemHTML(ex, routine, state)).join('')}</div>
        <div class="meal-footer"><button class="add-btn add-ex-trigger">${t('add_exercise', state.language)}</button></div>`;

        attachRoutineEvents(card, routine);
        list.appendChild(card);

        const exList = card.querySelector('.exercise-items');
        if (exList) {
            new Sortable(exList, {
                animation: 150, handle: '.item-drag-handle',
                onEnd: () => {
                    const orderedIds = Array.from(exList.children).map(item => item.dataset.id);
                    Logic.reorderExercises(routine.id, orderedIds);
                }
            });
        }
    });

    new Sortable(list, {
        animation: 150, handle: '.drag-handle',
        onEnd: () => {
            const orderedIds = Array.from(list.children).map(item => item.dataset.id);
            Logic.reorderRoutines(orderedIds);
        }
    });
}

function attachRoutineEvents(card, routine) {
    const nameEl = card.querySelector('.routine-name-editable');
    nameEl.onclick = () => {
        Logic.openRenameRoutineModal(routine.id);
    };

    card.querySelector('.delete-routine').onclick = (e) => { e.stopPropagation(); Logic.deleteRoutine(routine.id); };
    card.addEventListener('click', (e) => {
        if (e.target.closest('button, input, .series-dot, .drag-handle, .item-drag-handle, [contenteditable]')) return;
        if (state.selectedRoutineId !== routine.id) Logic.selectRoutine(routine.id, renderRoutines);
    });

    card.querySelector('.add-ex-trigger').onclick = () => Logic.addExercise(routine.id);
    const workoutBtn = card.querySelector('.start-workout-trigger');
    
    if (state.activeWorkout && state.activeWorkout.routineId === routine.id) {
        if (!state.user || !state.user.uid) {
            workoutBtn.textContent = state.language === 'es' ? "Cargando..." : "Loading...";
            workoutBtn.disabled = true;
        } else {
            workoutBtn.textContent = t('finish_workout', state.language);
            workoutBtn.disabled = false;
        }
        workoutBtn.style.background = 'var(--secondary)';
        highlightActiveSet(card);
    } else {
        workoutBtn.textContent = t('start_workout', state.language);
        workoutBtn.style.background = 'var(--primary)';
    }

    workoutBtn.onclick = () => {
        import('./workout-logic.js').then(m => {
            if (state.activeWorkout && state.activeWorkout.routineId === routine.id) m.openFinishWorkoutModal();
            else m.startWorkout(routine.id, () => renderRoutines());
        });
    };

    card.querySelector('.reset-routine-series').onclick = (e) => {
        e.stopPropagation();
        Logic.resetRoutineSeries(routine.id, () => renderRoutines());
    };

    attachExerciseEvents(card, routine);
}

function highlightActiveSet(card) {
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
}

function attachExerciseEvents(card, routine) {
    card.querySelectorAll('.exercise-item').forEach(item => {
        const exId = item.dataset.id;
        const ex = routine.exercises.find(e => e.id === exId);

        item.querySelectorAll('.series-dot').forEach(dot => {
            dot.onclick = () => {
                const idx = parseInt(dot.dataset.index);
                const isTime = ex.trackingMode === 'time';
                
                if (state.activeWorkout && state.activeWorkout.routineId === routine.id) {
                    if (isTime) {
                        import('./exercise-timer.js').then(m => {
                            m.startTimer({ duration: ex.reps, mode: ex.timeMode || 'single' }, 'exercise', () => {
                                import('./workout-logic.js').then(wl => wl.openSetEditor(routine.id, exId, idx));
                            });
                        });
                    } else {
                        import('./workout-logic.js').then(m => m.openSetEditor(routine.id, exId, idx));
                    }
                } else {
                    if (isTime) {
                        import('./exercise-timer.js').then(m => {
                            m.startTimer({ duration: ex.reps, mode: ex.timeMode || 'single' }, 'exercise', () => {
                                let done = [...(ex.doneSeries || [])];
                                if (!done.includes(idx)) done.push(idx);
                                Logic.updateExercise(routine.id, exId, { doneSeries: done });
                            });
                        });
                    } else {
                        let done = [...(ex.doneSeries || [])];
                        if (!done.includes(idx)) done.push(idx); else done = done.filter(i => i !== idx);
                        Logic.updateExercise(routine.id, exId, { doneSeries: done });
                    }
                }
            };
        });

        item.querySelectorAll('.editable').forEach(el => {
            el.onclick = () => {
                if (el.querySelector('input')) return;
                const field = el.dataset.field;
                const currentVal = el.textContent;
                const input = document.createElement('input');
                input.type = 'number'; input.step = field === 'weight' ? '0.1' : '1';
                input.value = currentVal; input.className = 'inline-amount-input';
                input.style.width = '45px';
                input.onblur = () => { if (!isNaN(parseFloat(input.value))) Logic.updateExercise(routine.id, exId, { [field]: parseFloat(input.value) }); };
                input.onkeydown = (ev) => { if (ev.key === 'Enter') input.blur(); if (ev.key === 'Escape') { input.onblur = null; el.textContent = currentVal; } };
                el.textContent = ''; el.appendChild(input); input.focus(); input.select();
            };
        });

        item.querySelector('.exercise-name-trigger').onclick = () => Logic.editExercise(routine.id, exId);
        item.querySelector('.delete-ex').onclick = () => Logic.deleteExercise(routine.id, exId);
        item.querySelector('.view-prog').onclick = () => import('./progression-logic.js').then(m => m.showProgression(ex.exerciseGroupId || ex.id));
        item.querySelector('.replace-ex').onclick = () => {
            const modal = document.getElementById('replace-exercise-modal');
            const nameIn = document.getElementById('replace-ex-name');
            const keepCheck = document.getElementById('replace-ex-keep-prog');
            const btn = document.getElementById('confirm-replace-btn');
            nameIn.value = ex.name; modal.style.display = 'block';
            btn.onclick = () => Logic.replaceExercise(routine.id, exId, nameIn.value.trim(), keepCheck.checked, () => { modal.style.display = 'none'; renderRoutines(); });
        };
    });
}