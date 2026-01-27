import { state } from './state.js';
import * as FB from './firebase-config.js';
import { t } from './i18n.js';
import { renderRoutines } from './exercise-ui.js';
import * as Utils from './utils.js';
import { dom } from './dom-elements.js';
import { initWorkoutLogic } from './workout-logic.js';
import { initProgressionUI } from './progression-logic.js';

export function initExerciseLogic(refreshUI) {
    initWorkoutLogic(refreshUI);
    initProgressionUI();
    const addRoutineBtn = document.getElementById('add-routine-btn');
    if (addRoutineBtn) {
        addRoutineBtn.onclick = () => {
            if (dom.routinePromptModal) {
                dom.routinePromptInput.value = '';
                dom.routinePromptModal.style.display = 'block';
                setTimeout(() => dom.routinePromptInput.focus(), 10);
            } else {
                createNewRoutine(refreshUI);
            }
        };
    }

    if (dom.confirmRoutineBtn) {
        dom.confirmRoutineBtn.onclick = () => {
            const name = dom.routinePromptInput.value.trim();
            if (!name) return;
            createNewRoutine(refreshUI, name);
            dom.routinePromptModal.style.display = 'none';
        };

        dom.routinePromptInput.onkeydown = (e) => {
            if (e.key === 'Enter') dom.confirmRoutineBtn.click();
        };
    }

    const exForm = document.getElementById('exercise-form');
    if (exForm) {
        exForm.onsubmit = (e) => handleExerciseSubmit(e, refreshUI);
    }
}

async function createNewRoutine(refreshUI, name) {
    if (!state.user) return alert("Inicia sesión para crear rutinas");
    
    const routineName = name || t('add_routine', state.language).replace('+ ', '');

    try {
        const colRef = FB.collection(FB.db, 'users', state.user.uid, 'routines');
        await FB.addDoc(colRef, {
            name: routineName,
            createdAt: Date.now()
        });
    } catch (e) {
        console.error("Error creating routine:", e);
    }
}

export async function deleteRoutine(routineId) {
    if (!state.user) return;
    if (!(await Utils.confirmAction(
        t('confirm_delete_routine', state.language), 
        t('confirm', state.language), 
        { okText: t('delete_btn', state.language), isDanger: true }
    ))) return;

    try {
        const docRef = FB.doc(FB.db, 'users', state.user.uid, 'routines', routineId);
        await FB.deleteDoc(docRef);
    } catch (e) {
        console.error("Error deleting routine:", e);
    }
}

export async function renameRoutine(routineId, newName) {
    if (!state.user) return;
    
    try {
        const docRef = FB.doc(FB.db, 'users', state.user.uid, 'routines', routineId);
        await FB.updateDoc(docRef, { name: newName });
    } catch (e) {
        console.error("Error renaming routine:", e);
    }
}

export function addExercise(routineId) {
    if (!state.user) return alert("Inicia sesión para añadir ejercicios");
    
    const modal = dom.exerciseModal;
    const routineIdInput = dom.exRoutineId;
    const editIdInput = dom.exEditId;
    const form = dom.exerciseForm;
    
    if (!modal || !routineIdInput || !form) return;

    form.reset();
    routineIdInput.value = routineId;
    editIdInput.value = '';
    
    const titleEl = document.getElementById('ex-modal-title');
    if (titleEl) titleEl.textContent = t('add_exercise', state.language);
    modal.style.display = 'block';
    setTimeout(() => dom.exName.focus(), 10);
}

export function editExercise(routineId, exerciseId) {
    const routine = state.routines.find(r => r.id === routineId);
    if (!routine) return;
    const ex = routine.exercises.find(e => e.id === exerciseId);
    if (!ex) return;

    const modal = dom.exerciseModal;
    const routineIdInput = dom.exRoutineId;
    const editIdInput = dom.exEditId;
    
    dom.exName.value = ex.name;
    dom.exSets.value = ex.sets;
    dom.exReps.value = ex.reps;
    dom.exWeight.value = ex.weight;
    dom.exRestSets.value = ex.restBetweenSets;
    dom.exRestExercises.value = ex.restBetweenExercises;

    const lmSelect = document.getElementById('ex-load-mode');
    if (lmSelect) lmSelect.value = ex.loadMode || 'external_total';
    
    routineIdInput.value = routineId;
    editIdInput.value = exerciseId;
    
    const titleEl = document.getElementById('ex-modal-title');
    if (titleEl) titleEl.textContent = t('edit_btn', state.language);
    modal.style.display = 'block';
    setTimeout(() => dom.exName.focus(), 10);
}

async function handleExerciseSubmit(e, refreshUI) {
    e.preventDefault();
    if (!state.user) return;

    const routineId = dom.exRoutineId.value;
    const editId = dom.exEditId.value;
    const name = dom.exName.value;
    const sets = parseInt(dom.exSets.value) || 0;
    const reps = parseInt(dom.exReps.value) || 0;
    const weight = parseFloat(dom.exWeight.value) || 0;
    const restSets = parseInt(dom.exRestSets.value) || 60;
    const restEx = parseInt(dom.exRestExercises.value) || 120;
    
    const loadMode = document.getElementById('ex-load-mode').value;
    let loadMultiplier = 1;
    if (loadMode === 'external_single') loadMultiplier = 2;

    const btn = document.getElementById('ex-save-btn');
    btn.disabled = true;
    btn.style.opacity = '0.7';

    try {
        const data = {
            name,
            sets,
            reps,
            weight,
            loadMode,
            loadMultiplier,
            restBetweenSets: restSets,
            restBetweenExercises: restEx,
            updatedAt: Date.now()
        };

        // Immediate UI feedback: close modal and reset form before awaiting the network promise
        if (dom.exerciseModal) dom.exerciseModal.style.display = 'none';
        const formToReset = dom.exerciseForm;

        if (editId) {
            const docRef = FB.doc(FB.db, 'users', state.user.uid, 'routines', routineId, 'exercises', editId);
            await FB.updateDoc(docRef, data);
        } else {
            const colRef = FB.collection(FB.db, 'users', state.user.uid, 'routines', routineId, 'exercises');
            const newDoc = await FB.addDoc(colRef, {
                ...data,
                exerciseGroupId: Utils.uuidv4(),
                doneSeries: [],
                createdAt: Date.now()
            });
            // Legacy/Fix: immediately ensure groupId is set if somehow skipped
        }

        if (formToReset) formToReset.reset();
    } catch (err) {
        console.error("Error saving exercise:", err);
    } finally {
        btn.disabled = false;
        btn.style.opacity = '1';
    }
}

export async function updateExercise(routineId, exerciseId, data) {
    if (!state.user) return;
    try {
        const docRef = FB.doc(FB.db, 'users', state.user.uid, 'routines', routineId, 'exercises', exerciseId);
        await FB.updateDoc(docRef, data);
    } catch (e) {
        console.error("Error updating exercise:", e);
    }
}

export async function deleteExercise(routineId, exerciseId) {
    if (!state.user) return;
    if (!(await Utils.confirmAction(
        t('delete_btn', state.language), 
        t('confirm', state.language), 
        { okText: t('delete_btn', state.language), isDanger: true }
    ))) return;
    try {
        const docRef = FB.doc(FB.db, 'users', state.user.uid, 'routines', routineId, 'exercises', exerciseId);
        await FB.deleteDoc(docRef);
    } catch (e) {
        console.error("Error deleting exercise:", e);
    }
}

export async function selectRoutine(routineId, refreshUI) {
    if (!state.user) return;
    // If clicking the same, maybe unselect? User said "solo se puede marcar una rutina a la vez" 
    // implying selection is the main goal.
    state.selectedRoutineId = routineId;
    import('./state.js').then(m => m.saveState(refreshUI));
}

export async function replaceExercise(routineId, oldExId, newName, keepProgression, refreshUI) {
    if (!state.user) return;
    const routine = state.routines.find(r => r.id === routineId);
    if (!routine) return;
    const oldEx = routine.exercises.find(e => e.id === oldExId);
    if (!oldEx) return;

    try {
        const colRef = FB.collection(FB.db, 'users', state.user.uid, 'routines', routineId, 'exercises');
        const newGroupId = keepProgression ? (oldEx.exerciseGroupId || oldEx.id) : Utils.uuidv4();
        
        // Mark as variant change if keeping progression
        const isVariantChange = keepProgression;

        await FB.addDoc(colRef, {
            name: newName,
            sets: oldEx.sets,
            reps: oldEx.reps,
            weight: oldEx.weight,
            loadMode: oldEx.loadMode || 'external_total',
            loadMultiplier: oldEx.loadMultiplier || 1,
            restBetweenSets: oldEx.restBetweenSets,
            restBetweenExercises: oldEx.restBetweenExercises,
            exerciseGroupId: newGroupId,
            isVariantChange: isVariantChange,
            doneSeries: [],
            createdAt: Date.now()
        });

        const oldRef = FB.doc(FB.db, 'users', state.user.uid, 'routines', routineId, 'exercises', oldExId);
        await FB.deleteDoc(oldRef);
        
        if (refreshUI) refreshUI();
    } catch (e) {
        console.error("Error replacing exercise:", e);
    }
}

export async function reorderRoutines(orderedIds) {
    if (!state.user) return;
    try {
        const batch = orderedIds.map((id, index) => {
            const docRef = FB.doc(FB.db, 'users', state.user.uid, 'routines', id);
            return FB.updateDoc(docRef, { order: index });
        });
        await Promise.all(batch);
    } catch (e) {
        console.error("Error reordering routines:", e);
    }
}

export async function reorderExercises(routineId, orderedIds) {
    if (!state.user) return;
    try {
        const batch = orderedIds.map((id, index) => {
            const docRef = FB.doc(FB.db, 'users', state.user.uid, 'routines', routineId, 'exercises', id);
            return FB.updateDoc(docRef, { order: index });
        });
        await Promise.all(batch);
    } catch (e) {
        console.error("Error reordering exercises:", e);
    }
}

export async function resetRoutineSeries(routineId, refreshUI) {
    if (!state.user) return;
    const routine = state.routines.find(r => r.id === routineId);
    if (!routine || !routine.exercises) return;

    if (!(await Utils.confirmAction(
        t('confirm_reset_series', state.language), 
        t('confirm', state.language), 
        { okText: t('reset_series', state.language), isDanger: true }
    ))) return;

    try {
        const promises = routine.exercises.map(ex => {
            const docRef = FB.doc(FB.db, 'users', state.user.uid, 'routines', routineId, 'exercises', ex.id);
            return FB.updateDoc(docRef, { doneSeries: [] });
        });
        await Promise.all(promises);
        if (refreshUI) refreshUI();
    } catch (e) {
        console.error("Error resetting series:", e);
    }
}