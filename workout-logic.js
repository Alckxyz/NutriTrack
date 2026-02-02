import { state } from './state.js';
import * as FB from './firebase-config.js';
import { t } from './i18n.js';
import * as Utils from './utils.js';
import { saveWorkout } from './workout-db.js';
import { openFinishWorkoutModal, setupSetEditorUI } from './workout-ui-session.js';

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
            if (!state.user || !state.user.uid) {
                alert(state.language === 'es' ? "Espera a que cargue la sesión o inicia sesión para guardar." : "Please wait for session to load or log in to save.");
                return;
            }

            if (await Utils.confirmAction(
                t('save_workout_confirm', state.language), 
                t('confirm', state.language),
                { okText: t('save_workout_confirm_btn', state.language), isDanger: false }
            )) {
                const success = await saveWorkout();
                if (success !== false) {
                    state.activeWorkout = null;
                    document.getElementById('workout-session-modal').style.display = 'none';
                    if (refreshUI) refreshUI();
                }
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
        startedAt: FB.Timestamp.now(),
        currentExerciseIndex: 0,
        currentSetIndex: 0,
        exercises: (routine.exercises || []).map(ex => ({
            exerciseId: ex.id,
            exerciseName: ex.name,
            exerciseGroupId: ex.exerciseGroupId || ex.id,
            createdAt: FB.Timestamp.now(),
            type: ex.loadMode === 'bodyweight' ? 'bodyweight' : 'weighted',
            loadMode: ex.loadMode || 'external_total',
            loadMultiplier: ex.loadMultiplier || 1,
            bodyweightKg: state.weightEntries[0]?.weightKg || 70,
            sets: [],
            notes: '',
            targetSets: ex.sets,
            targetReps: ex.reps,
            targetWeight: ex.weight,
            restBetweenSets: ex.restBetweenSets,
            restBetweenExercises: ex.restBetweenExercises
        }))
    };

    if (refreshUI) refreshUI();
    Utils.showToast("🚀 " + t('workout_in_progress', state.language));
}

let _pendingSetInfo = null;

export function openSetEditor(routineId, exerciseId, setIndex) {
    if (!state.activeWorkout || !state.activeWorkout.exercises) return;
    const exIndex = state.activeWorkout.exercises.findIndex(e => e.exerciseId === exerciseId);
    
    if (exIndex === -1) {
        console.warn(`Exercise ${exerciseId} not found in active workout session.`);
        return;
    }

    // Set indices for active workout tracking
    state.activeWorkout.currentExerciseIndex = exIndex;
    state.activeWorkout.currentSetIndex = setIndex;

    setupSetEditorUI(routineId, exerciseId, setIndex, exIndex, (info) => {
        _pendingSetInfo = info;
    });
}

async function saveCurrentSet(refreshUI) {
    if (!state.activeWorkout || !_pendingSetInfo) return;

    const { routineId, exerciseId, setIndex, exIndex } = _pendingSetInfo;
    
    if (exIndex === -1 || !state.activeWorkout.exercises[exIndex]) {
        document.getElementById('set-log-popup').style.display = 'none';
        return;
    }

    const weight = parseFloat(document.getElementById('set-log-weight')?.value) || 0;
    const reps = parseInt(document.getElementById('set-log-reps').value) || 0;
    const notesIn = document.getElementById('set-log-notes');

    const currentExSession = state.activeWorkout.exercises[exIndex];

    // Capture notes if it's the last set or if user typed something
    if (notesIn && !document.getElementById('set-log-notes-container').classList.contains('hidden')) {
        currentExSession.notes = notesIn.value.trim();
    }
    
    // 1. Record the set in activeWorkout
    const setRecord = { weightKg: weight, reps: reps, createdAt: FB.Timestamp.now(), setIndex };
    // Update or add
    const existingIdx = currentExSession.sets.findIndex(s => s.setIndex === setIndex);
    if (existingIdx !== -1) currentExSession.sets[existingIdx] = setRecord;
    else currentExSession.sets.push(setRecord);

    // --- Real-time Base Weight & Reps Update ---
    // If the weight or reps used in the majority of completed sets differ from original base,
    // update the exercise definition immediately.
    const currentSets = currentExSession.sets;
    if (currentSets.length > 0) {
        const weightCounts = {};
        const repCounts = {};
        
        currentSets.forEach(s => {
            weightCounts[s.weightKg] = (weightCounts[s.weightKg] || 0) + 1;
            repCounts[s.reps] = (repCounts[s.reps] || 0) + 1;
        });

        const getDominant = (counts) => {
            let dominant = parseFloat(Object.keys(counts)[0]);
            let maxCount = 0;
            for (const [val, count] of Object.entries(counts)) {
                const num = parseFloat(val);
                if (count > maxCount || (count === maxCount && num > dominant)) {
                    dominant = num;
                    maxCount = count;
                }
            }
            return dominant;
        };

        const dominantWeight = getDominant(weightCounts);
        const dominantReps = getDominant(repCounts);

        const updates = {};
        if (dominantWeight !== currentExSession.targetWeight) {
            updates.weight = dominantWeight;
            currentExSession.targetWeight = dominantWeight;
        }
        if (dominantReps !== currentExSession.targetReps) {
            updates.reps = dominantReps;
            currentExSession.targetReps = dominantReps;
        }

        if (Object.keys(updates).length > 0) {
            try {
                const exDocRef = FB.doc(FB.db, 'users', state.user.uid, 'routines', routineId, 'exercises', exerciseId);
                await FB.updateDoc(exDocRef, updates);
            } catch (err) {
                console.warn("Could not update baseline during session:", err);
            }
        }
    }

    // 2. Mark dot as done in routine (for visual sync)
    const routine = state.routines.find(r => r.id === routineId);
    if (!routine || !routine.exercises) return;
    const exercise = routine.exercises.find(e => e.id === exerciseId);
    if (!exercise) return;
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

// removed function openFinishWorkoutModal() {} -> Moved to workout-ui-session.js
// removed function renderWorkoutSession() {} -> Moved to workout-ui-session.js
// removed function saveWorkout() {} -> Moved to workout-db.js

export { openFinishWorkoutModal };