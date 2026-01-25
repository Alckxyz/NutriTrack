import { state } from './state.js';
import * as FB from './firebase-config.js';
import { t } from './i18n.js';
import * as Utils from './utils.js';

export function initWorkoutLogic(refreshUI) {
    const cancelBtn = document.getElementById('cancel-workout-btn');
    const finishBtn = document.getElementById('finish-workout-btn');
    const closeBtn = document.querySelector('#workout-session-modal .close-btn');

    if (cancelBtn) {
        cancelBtn.onclick = () => {
            if (confirm("¿Descartar entrenamiento por completo? Se perderá el progreso de esta sesión.")) {
                state.activeWorkout = null;
                document.getElementById('workout-session-modal').style.display = 'none';
                if (refreshUI) refreshUI();
            }
        };
    }

    if (closeBtn) {
        closeBtn.onclick = () => {
            document.getElementById('workout-session-modal').style.display = 'none';
        };
    }

    if (finishBtn) {
        finishBtn.onclick = async () => {
            if (await Utils.confirmAction(
                t('save_workout_confirm', state.language), 
                t('confirm', state.language),
                { okText: t('save_workout_confirm_btn', state.language), isDanger: false }
            )) {
                await saveWorkout();
                state.activeWorkout = null;
                document.getElementById('workout-session-modal').style.display = 'none';
                if (refreshUI) refreshUI();
            }
        };
    }

    // Set Editor Popup logic
    const saveSetBtn = document.getElementById('set-log-save-btn');
    const cancelSetBtn = document.getElementById('set-log-cancel-btn');
    const weightIn = document.getElementById('set-log-weight');
    const repsIn = document.getElementById('set-log-reps');

    saveSetBtn.onclick = () => saveCurrentSet(refreshUI);
    cancelSetBtn.onclick = () => document.getElementById('set-log-popup').style.display = 'none';

    document.querySelectorAll('#set-log-popup .quick-adj').forEach(btn => {
        btn.onclick = () => {
            const delta = parseFloat(btn.dataset.delta);
            const targetInput = btn.previousElementSibling?.tagName === 'INPUT' ? btn.previousElementSibling : btn.nextElementSibling;
            if (targetInput) {
                let val = (parseFloat(targetInput.value) || 0) + delta;
                targetInput.value = val > 0 ? val : 0;
            }
        };
    });
}

export function startWorkout(routineId, refreshUI) {
    const routine = state.routines.find(r => r.id === routineId);
    if (!routine) return;

    state.activeWorkout = {
        routineId: routine.id,
        routineName: routine.name,
        startedAt: Date.now(),
        currentExerciseIndex: 0,
        currentSetIndex: 0,
        exercises: routine.exercises.map(ex => ({
            exerciseId: ex.id,
            exerciseName: ex.name,
            exerciseGroupId: ex.exerciseGroupId || ex.id,
            type: ex.weight > 0 ? 'weighted' : 'bodyweight',
            bodyweightKg: state.weightEntries[0]?.weightKg || 70,
            sets: [],
            targetSets: ex.sets,
            targetReps: ex.reps,
            targetWeight: ex.weight,
            restBetweenSets: ex.restBetweenSets,
            restBetweenExercises: ex.restBetweenExercises
        }))
    };

    if (refreshUI) refreshUI();
    Utils.showToast("🚀 " + t('workout_in_progress', state.language));
    
    // Automatically open first set if exercises exist
    if (routine.exercises && routine.exercises.length > 0) {
        openSetEditor(routineId, routine.exercises[0].id, 0);
    }
}

let _pendingSetInfo = null;

export function openSetEditor(routineId, exerciseId, setIndex) {
    if (!state.activeWorkout) return;
    const routine = state.routines.find(r => r.id === routineId);
    const exercise = routine.exercises.find(e => e.id === exerciseId);
    if (!exercise) return;

    const exIndex = state.activeWorkout.exercises.findIndex(e => e.exerciseId === exerciseId);
    const popup = document.getElementById('set-log-popup');
    const title = document.getElementById('set-log-title');
    const exName = document.getElementById('set-log-ex-name');
    const weightIn = document.getElementById('set-log-weight');
    const repsIn = document.getElementById('set-log-reps');
    const saveBtn = document.getElementById('set-log-save-btn');

    _pendingSetInfo = { routineId, exerciseId, setIndex, exIndex };

    // Set indices for active workout tracking
    state.activeWorkout.currentExerciseIndex = exIndex;
    state.activeWorkout.currentSetIndex = setIndex;

    title.textContent = t('set_x_of_y', state.language)
        .replace('{x}', setIndex + 1)
        .replace('{y}', exercise.sets);
    exName.textContent = exercise.name;
    
    // Default values from last set or routine config
    const currentExSession = state.activeWorkout.exercises[exIndex];
    const lastLoggedSet = currentExSession.sets[currentExSession.sets.length - 1];
    
    weightIn.value = lastLoggedSet ? lastLoggedSet.weightKg : exercise.weight;
    repsIn.value = lastLoggedSet ? lastLoggedSet.reps : exercise.reps;

    // Check if it's the absolute last set of the last exercise
    const isLastEx = exIndex === state.activeWorkout.exercises.length - 1;
    const isLastSet = setIndex === exercise.sets - 1;
    
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

async function saveCurrentSet(refreshUI) {
    if (!state.activeWorkout || !_pendingSetInfo) return;

    const { routineId, exerciseId, setIndex, exIndex } = _pendingSetInfo;
    const weight = parseFloat(document.getElementById('set-log-weight').value) || 0;
    const reps = parseInt(document.getElementById('set-log-reps').value) || 0;

    const currentExSession = state.activeWorkout.exercises[exIndex];
    
    // 1. Record the set in activeWorkout
    const setRecord = { weightKg: weight, reps: reps, createdAt: Date.now(), setIndex };
    // Update or add
    const existingIdx = currentExSession.sets.findIndex(s => s.setIndex === setIndex);
    if (existingIdx !== -1) currentExSession.sets[existingIdx] = setRecord;
    else currentExSession.sets.push(setRecord);

    // 2. Mark dot as done in routine (for visual sync)
    const routine = state.routines.find(r => r.id === routineId);
    const exercise = routine.exercises.find(e => e.id === exerciseId);
    let done = [...(exercise.doneSeries || [])];
    if (!done.includes(setIndex)) done.push(setIndex);
    
    // Call background update
    import('./exercise-logic.js').then(m => m.updateExercise(routineId, exerciseId, { doneSeries: done }));

    // 3. Start Timer
    const isLastSetOfEx = setIndex === currentExSession.targetSets - 1;
    const timerSeconds = isLastSetOfEx ? currentExSession.restBetweenExercises : currentExSession.restBetweenSets;
    import('./exercise-timer.js').then(m => m.startTimer(timerSeconds, isLastSetOfEx ? 'exercises' : 'sets'));

    // 4. Hide popup
    document.getElementById('set-log-popup').style.display = 'none';

    // 5. Check advancement
    const isLastEx = exIndex === state.activeWorkout.exercises.length - 1;
    
    if (isLastEx && isLastSetOfEx) {
        // Workout Finished!
        if (await Utils.confirmAction(
            t('save_workout_confirm', state.language), 
            t('confirm', state.language),
            { okText: t('save_workout_confirm_btn', state.language), isDanger: false }
        )) {
            await saveWorkout();
            state.activeWorkout = null;
        }
    } else {
        // Advance state
        if (!isLastSetOfEx) {
            state.activeWorkout.currentSetIndex++;
        } else {
            state.activeWorkout.currentExerciseIndex++;
            state.activeWorkout.currentSetIndex = 0;
        }
    }

    _pendingSetInfo = null;
    if (refreshUI) refreshUI();
}

export function toggleSetInWorkout(exerciseId, setIndex, weight, reps, isDone) {
    if (!state.activeWorkout) return;
    const ex = state.activeWorkout.exercises.find(e => e.exerciseId === exerciseId);
    if (!ex) return;

    if (isDone) {
        // Add or update set. Using setIndex to track which dot it corresponds to
        const existingIdx = ex.sets.findIndex(s => s.setIndex === setIndex);
        if (existingIdx === -1) {
            ex.sets.push({ weightKg: weight, reps: reps, setIndex });
        } else {
            ex.sets[existingIdx] = { weightKg: weight, reps: reps, setIndex };
        }
    } else {
        // Remove set
        ex.sets = ex.sets.filter(s => s.setIndex !== setIndex);
    }
}

export function openFinishWorkoutModal() {
    if (!state.activeWorkout) return;
    renderWorkoutSession();
    document.getElementById('workout-session-modal').style.display = 'block';
}

function renderWorkoutSession() {
    const list = document.getElementById('workout-exercises-list');
    if (!list || !state.activeWorkout) return;

    list.innerHTML = '';
    state.activeWorkout.exercises.forEach((ex, exIdx) => {
        const div = document.createElement('div');
        div.className = 'meal-card';
        div.style.marginBottom = '15px';
        
        // Only show exercises that have at least one set, or show all for review? 
        // Showing all allows adding missed sets.
        div.innerHTML = `
            <div class="meal-header">
                <h3 style="font-size:0.9rem;">${ex.exerciseName}</h3>
                <button class="add-mini-btn add-set-btn" style="border-color:var(--primary); color:var(--primary);">${t('add_set', state.language)}</button>
            </div>
            <div class="sets-list" style="padding:10px;">
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
            // Find appropriate default values from routine if possible
            const lastSet = ex.sets[ex.sets.length - 1] || { weightKg: 0, reps: 10 };
            ex.sets.push({ weightKg: lastSet.weightKg, reps: lastSet.reps });
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

async function saveWorkout() {
    if (!state.user || !state.activeWorkout) return;
    try {
        const colRef = FB.collection(FB.db, 'users', state.user.uid, 'workoutLogs');
        // Clean up: remove exercises with 0 sets to keep history clean
        const filteredExercises = state.activeWorkout.exercises.filter(ex => ex.sets.length > 0);
        
        await FB.addDoc(colRef, {
            ...state.activeWorkout,
            exercises: filteredExercises,
            createdAt: Date.now()
        });
        Utils.showToast("✅ " + (state.language === 'es' ? "Entrenamiento guardado" : "Workout saved"));
    } catch (e) {
        console.error("Error saving workout log:", e);
    }
}