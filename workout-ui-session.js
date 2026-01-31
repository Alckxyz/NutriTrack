import { state } from './state.js';
import { t } from './i18n.js';
import * as FB from './firebase-config.js';

/**
 * Renders the review list of exercises and sets within the workout session modal.
 */
export function renderWorkoutSession() {
    const list = document.getElementById('workout-exercises-list');
    const finishBtn = document.getElementById('finish-workout-btn');
    if (!list || !state.activeWorkout) return;

    // Handle button state based on auth
    if (finishBtn) {
        if (!state.user || !state.user.uid) {
            finishBtn.disabled = true;
            finishBtn.textContent = state.language === 'es' ? "Cargando sesión..." : "Loading session...";
            finishBtn.style.opacity = '0.5';
        } else {
            finishBtn.disabled = false;
            finishBtn.textContent = t('finish_workout', state.language);
            finishBtn.style.opacity = '1';
        }
    }

    list.innerHTML = '';
    state.activeWorkout.exercises.forEach((ex, exIdx) => {
        const div = document.createElement('div');
        div.className = 'meal-card';
        div.style.marginBottom = '15px';
        
        div.innerHTML = `
            <div class="meal-header">
                <h3 style="font-size:0.9rem;">${ex.exerciseName}</h3>
                <button class="add-mini-btn add-set-btn" style="border-color:var(--primary); color:var(--primary);">${t('add_set', state.language)}</button>
            </div>
            <div class="sets-list" style="padding:10px;">
                ${ex.notes ? `<div style="font-size: 0.75rem; background: rgba(100, 181, 246, 0.05); padding: 6px; border-radius: 4px; margin-bottom: 8px; border-left: 2px solid var(--secondary); color: var(--text-light);">📝 ${ex.notes}</div>` : ''}
                ${ex.sets.sort((a,b) => (a.setIndex??999) - (b.setIndex??999)).map((set, setIdx) => `
                    <div style="display:flex; gap:10px; align-items:center; margin-bottom:8px;">
                        <span style="font-size:0.7rem; color:var(--text-light); width:20px;">${(set.setIndex !== undefined ? set.setIndex + 1 : 'S')}</span>
                        <input type="number" class="set-weight" data-ex="${exIdx}" data-set="${setIdx}" value="${set.weightKg}" style="width:70px; padding:4px;">
                        <span style="font-size:0.8rem;">kg x</span>
                        <input type="number" class="set-reps" data-ex="${exIdx}" data-set="${setIdx}" value="${set.reps}" style="width:60px; padding:4px;">
                        <span style="font-size:0.8rem;">reps</span>
                        <button class="delete-btn delete-set-btn" data-ex="${exIdx}" data-set="${setIdx}" style="padding:2px 6px;">×</button>
                    </div>
                `).join('')}
                ${ex.sets.length === 0 ? `<p style="font-size:0.7rem; color:var(--text-light); text-align:center; padding:10px;">Sin series registradas</p>` : ''}
            </div>
        `;

        div.querySelector('.add-set-btn').onclick = () => {
            const lastSet = ex.sets[ex.sets.length - 1] || { weightKg: 0, reps: 10 };
            ex.sets.push({ 
                weightKg: lastSet.weightKg, 
                reps: lastSet.reps,
                createdAt: FB.Timestamp.now(),
                setIndex: ex.sets.length
            });
            renderWorkoutSession();
        };

        div.querySelectorAll('.delete-set-btn').forEach(btn => {
            btn.onclick = () => {
                const sIdx = parseInt(btn.dataset.set);
                ex.sets.splice(sIdx, 1);
                renderWorkoutSession();
            };
        });

        div.querySelectorAll('.set-weight').forEach(input => {
            input.onchange = () => ex.sets[parseInt(input.dataset.set)].weightKg = parseFloat(input.value) || 0;
        });
        div.querySelectorAll('.set-reps').forEach(input => {
            input.onchange = () => ex.sets[parseInt(input.dataset.set)].reps = parseInt(input.value) || 0;
        });

        list.appendChild(div);
    });
}

/**
 * Opens the finish workout review modal.
 */
export function openFinishWorkoutModal() {
    if (!state.activeWorkout) return;
    renderWorkoutSession();
    document.getElementById('workout-session-modal').style.display = 'block';
}

/**
 * Prepares and displays the set editor popup.
 */
export function setupSetEditorUI(routineId, exerciseId, setIndex, exIndex, onSetInfoAssigned) {
    const routine = state.routines.find(r => r.id === routineId);
    if (!routine || !routine.exercises) return;
    const exercise = routine.exercises.find(e => e.id === exerciseId);
    if (!exercise) return;

    const popup = document.getElementById('set-log-popup');
    const title = document.getElementById('set-log-title');
    const exName = document.getElementById('set-log-ex-name');
    const weightIn = document.getElementById('set-log-weight');
    const repsIn = document.getElementById('set-log-reps');
    const notesIn = document.getElementById('set-log-notes');
    const notesCont = document.getElementById('set-log-notes-container');
    const saveBtn = document.getElementById('set-log-save-btn');

    onSetInfoAssigned({ routineId, exerciseId, setIndex, exIndex });

    title.textContent = t('set_x_of_y', state.language)
        .replace('{x}', setIndex + 1)
        .replace('{y}', exercise.sets);
    exName.textContent = exercise.name;
    
    const currentExSession = state.activeWorkout.exercises[exIndex];
    const lastLoggedSet = currentExSession.sets[currentExSession.sets.length - 1];
    
    weightIn.value = lastLoggedSet ? lastLoggedSet.weightKg : exercise.weight;
    repsIn.value = lastLoggedSet ? lastLoggedSet.reps : exercise.reps;

    const isLastSetOfEx = setIndex === exercise.sets - 1;
    if (notesIn) {
        notesIn.value = currentExSession.notes || '';
        if (isLastSetOfEx && notesCont) {
            notesCont.classList.remove('hidden');
        } else if (notesCont) {
            notesCont.classList.add('hidden');
        }
    }

    const isLastEx = exIndex === state.activeWorkout.exercises.length - 1;
    const isLastSet = isLastSetOfEx;
    
    if (isLastEx && isLastSet) {
        saveBtn.textContent = t('finish_workout_now', state.language);
        saveBtn.style.background = 'var(--secondary)';
    } else {
        saveBtn.textContent = t('save_and_continue', state.language);
        saveBtn.style.background = 'var(--primary)';
    }

    popup.style.display = 'block';
    setTimeout(() => { repsIn.focus(); repsIn.select(); }, 10);
}