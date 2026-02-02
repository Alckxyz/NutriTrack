import * as FB from './firebase-config.js';
import { state } from './state.js';
import { t } from './i18n.js';
import * as Utils from './utils.js';
import { dom } from './dom-elements.js';

export function updateExerciseNamesDatalist() {
    const datalist = document.getElementById('exercise-names-list');
    if (!datalist) return;
    const names = new Set();
    state.routines.forEach(r => {
        (r.exercises || []).forEach(ex => {
            if (ex.name) names.add(ex.name);
        });
    });
    datalist.innerHTML = '';
    Array.from(names).sort().forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        datalist.appendChild(opt);
    });
}

export function addExercise(routineId) {
    if (!state.user) return alert("Inicia sesión para añadir ejercicios");
    const modal = dom.exerciseModal;
    if (!modal) return;
    dom.exerciseForm.reset();
    updateExerciseNamesDatalist();
    
    const trackingModeSelect = document.getElementById('ex-tracking-mode');
    const loadModeSelect = document.getElementById('ex-load-mode');
    const timeModeGroup = document.getElementById('time-mode-group');
    const repsLabel = document.getElementById('ex-reps-label');
    const weightGroup = dom.exWeight.closest('.form-group');

    if (trackingModeSelect && repsLabel) {
        trackingModeSelect.onchange = () => {
            const isTime = trackingModeSelect.value === 'time';
            repsLabel.textContent = isTime ? t('duration_label', state.language) : t('reps', state.language);
            repsLabel.setAttribute('data-t', isTime ? 'duration_label' : 'reps');
            if (timeModeGroup) timeModeGroup.classList.toggle('hidden', !isTime);
        };
        trackingModeSelect.value = 'reps';
        if (timeModeGroup) timeModeGroup.classList.add('hidden');
        repsLabel.textContent = t('reps', state.language);
    }

    if (loadModeSelect && weightGroup) {
        loadModeSelect.onchange = () => {
            weightGroup.classList.toggle('hidden', loadModeSelect.value === 'bodyweight');
        };
        loadModeSelect.value = 'external_total';
        weightGroup.classList.remove('hidden');
    }

    dom.exRoutineId.value = routineId;
    dom.exEditId.value = '';
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
    updateExerciseNamesDatalist();
    dom.exName.value = ex.name;
    dom.exSets.value = ex.sets;
    dom.exReps.value = ex.reps;
    dom.exWeight.value = ex.weight;
    dom.exRestSets.value = ex.restBetweenSets;
    dom.exRestExercises.value = ex.restBetweenExercises;
    const loadModeSelect = document.getElementById('ex-load-mode');
    const trackingModeSelect = document.getElementById('ex-tracking-mode');
    const timeModeGroup = document.getElementById('time-mode-group');
    const repsLabel = document.getElementById('ex-reps-label');
    const weightGroup = dom.exWeight.closest('.form-group');

    if (loadModeSelect && weightGroup) {
        loadModeSelect.value = ex.loadMode || 'external_total';
        const updateWeightVisibility = () => {
            weightGroup.classList.toggle('hidden', loadModeSelect.value === 'bodyweight');
        };
        loadModeSelect.onchange = updateWeightVisibility;
        updateWeightVisibility();
    }
    
    if (trackingModeSelect && repsLabel) {
        const isTime = ex.trackingMode === 'time';
        trackingModeSelect.value = ex.trackingMode || 'reps';
        repsLabel.textContent = isTime ? t('duration_label', state.language) : t('reps', state.language);
        repsLabel.setAttribute('data-t', isTime ? 'duration_label' : 'reps');
        if (timeModeGroup) {
            timeModeGroup.classList.toggle('hidden', !isTime);
            const tmSelect = document.getElementById('ex-time-mode');
            if (tmSelect) tmSelect.value = ex.timeMode || 'single';
        }
        
        trackingModeSelect.onchange = () => {
            const isNowTime = trackingModeSelect.value === 'time';
            repsLabel.textContent = isNowTime ? t('duration_label', state.language) : t('reps', state.language);
            repsLabel.setAttribute('data-t', isNowTime ? 'duration_label' : 'reps');
            if (timeModeGroup) timeModeGroup.classList.toggle('hidden', !isNowTime);
        };
    }

    dom.exRoutineId.value = routineId;
    dom.exEditId.value = exerciseId;
    const titleEl = document.getElementById('ex-modal-title');
    if (titleEl) titleEl.textContent = t('edit_btn', state.language);
    dom.exerciseModal.style.display = 'block';
    setTimeout(() => dom.exName.focus(), 10);
}

export async function handleExerciseSubmit(e, refreshUI) {
    e.preventDefault();
    if (!state.user) return;
    const routineId = dom.exRoutineId.value;
    const editId = dom.exEditId.value;
    
    const name = dom.exName.value.trim();
    const data = {
        name: name,
        sets: parseInt(dom.exSets.value) || 0,
        reps: parseInt(dom.exReps.value) || 0,
        weight: document.getElementById('ex-load-mode').value === 'bodyweight' ? 0 : (parseFloat(dom.exWeight.value) || 0),
        trackingMode: document.getElementById('ex-tracking-mode').value,
        timeMode: document.getElementById('ex-time-mode').value,
        loadMode: document.getElementById('ex-load-mode').value,
        loadMultiplier: document.getElementById('ex-load-mode').value === 'external_single' ? 2 : 1,
        restBetweenSets: parseInt(dom.exRestSets.value) || 60,
        restBetweenExercises: parseInt(dom.exRestExercises.value) || 120,
        updatedAt: FB.serverTimestamp()
    };

    if (dom.exerciseModal) dom.exerciseModal.style.display = 'none';

    // Find existing group for synchronization
    const allExercises = state.routines.flatMap(r => r.exercises || []);
    const existingSameName = allExercises.find(ex => ex.name.toLowerCase() === name.toLowerCase());

    if (editId) {
        // When editing an existing instance, propagate to all others in the group
        await updateExercise(routineId, editId, data);
    } else {
        const routine = state.routines.find(r => r.id === routineId);
        const maxOrder = (routine && routine.exercises && routine.exercises.length > 0)
            ? Math.max(0, ...routine.exercises.map(ex => ex.order || 0))
            : -1;

        const exerciseGroupId = existingSameName ? existingSameName.exerciseGroupId : Utils.uuidv4();
        
        // If we found an existing exercise with the same name, use its most recent data
        let finalData = { ...data };
        if (existingSameName) {
            finalData = {
                ...finalData,
                sets: existingSameName.sets,
                reps: existingSameName.reps,
                weight: existingSameName.weight,
                trackingMode: existingSameName.trackingMode,
                loadMode: existingSameName.loadMode,
                loadMultiplier: existingSameName.loadMultiplier,
                restBetweenSets: existingSameName.restBetweenSets,
                restBetweenExercises: existingSameName.restBetweenExercises
            };
        }

        const colRef = FB.collection(FB.db, 'users', state.user.uid, 'routines', routineId, 'exercises');
        await FB.addDoc(colRef, { 
            ...finalData, 
            order: maxOrder + 1,
            exerciseGroupId: exerciseGroupId, 
            doneSeries: [], // New instances always start with zero progress
            createdAt: FB.serverTimestamp() 
        });
    }
    if (dom.exerciseForm) dom.exerciseForm.reset();
}

export async function updateExercise(routineId, exerciseId, data) {
    if (!state.user) return;
    try {
        const routine = state.routines.find(r => r.id === routineId);
        const ex = routine?.exercises?.find(e => e.id === exerciseId);
        if (!ex) return;

        const groupId = ex.exerciseGroupId;
        const updates = [];

        // 1. Update the specific target exercise with all provided data (including doneSeries)
        const targetRef = FB.doc(FB.db, 'users', state.user.uid, 'routines', routineId, 'exercises', exerciseId);
        updates.push(FB.updateDoc(targetRef, data));

        // 2. Separate progress tracking from configuration
        // We do NOT want to propagate 'doneSeries' to other routines
        const { doneSeries, ...configData } = data;

        // If there are configuration changes (weight, reps, sets, etc.), sync them to the group
        if (Object.keys(configData).length > 0) {
            state.routines.forEach(r => {
                (r.exercises || []).forEach(e => {
                    // Sync to all other exercises in the same group, but skip the one we already updated
                    if (e.exerciseGroupId === groupId && e.id !== exerciseId) {
                        const docRef = FB.doc(FB.db, 'users', state.user.uid, 'routines', r.id, 'exercises', e.id);
                        updates.push(FB.updateDoc(docRef, configData));
                    }
                });
            });
        }

        await Promise.all(updates);
    } catch (e) { console.error("Error updating exercise:", e); }
}

export async function deleteExercise(routineId, exerciseId) {
    if (!state.user) return;
    if (!(await Utils.confirmAction(t('delete_btn', state.language), t('confirm', state.language), { okText: t('delete_btn', state.language), isDanger: true }))) return;
    try {
        const docRef = FB.doc(FB.db, 'users', state.user.uid, 'routines', routineId, 'exercises', exerciseId);
        await FB.deleteDoc(docRef);
    } catch (e) { console.error("Error deleting exercise:", e); }
}

export async function replaceExercise(routineId, oldExId, newName, keepProgression, refreshUI) {
    if (!state.user) return;
    const routine = state.routines.find(r => r.id === routineId);
    const oldEx = routine?.exercises.find(e => e.id === oldExId);
    if (!oldEx) return;
    try {
        const colRef = FB.collection(FB.db, 'users', state.user.uid, 'routines', routineId, 'exercises');
        await FB.addDoc(colRef, {
            name: newName, sets: oldEx.sets, reps: oldEx.reps, weight: oldEx.weight,
            loadMode: oldEx.loadMode || 'external_total', loadMultiplier: oldEx.loadMultiplier || 1,
            restBetweenSets: oldEx.restBetweenSets, restBetweenExercises: oldEx.restBetweenExercises,
            exerciseGroupId: keepProgression ? (oldEx.exerciseGroupId || oldEx.id) : Utils.uuidv4(),
            isVariantChange: keepProgression, doneSeries: [], createdAt: FB.serverTimestamp()
        });
        const oldRef = FB.doc(FB.db, 'users', state.user.uid, 'routines', routineId, 'exercises', oldExId);
        await FB.deleteDoc(oldRef);
        if (refreshUI) refreshUI();
    } catch (e) { console.error("Error replacing exercise:", e); }
}

export async function reorderExercises(routineId, orderedIds) {
    if (!state.user) return;
    try {
        const batch = orderedIds.map((id, index) => {
            const docRef = FB.doc(FB.db, 'users', state.user.uid, 'routines', routineId, 'exercises', id);
            return FB.updateDoc(docRef, { order: index });
        });
        await Promise.all(batch);
    } catch (e) { console.error("Error reordering exercises:", e); }
}