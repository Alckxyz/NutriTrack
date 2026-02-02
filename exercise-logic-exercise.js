import * as FB from './firebase-config.js';
import { state } from './state.js';
import { t } from './i18n.js';
import * as Utils from './utils.js';
import { dom } from './dom-elements.js';

export function addExercise(routineId) {
    if (!state.user) return alert("Inicia sesión para añadir ejercicios");
    const modal = dom.exerciseModal;
    if (!modal) return;
    dom.exerciseForm.reset();
    
    const trackingModeSelect = document.getElementById('ex-tracking-mode');
    const repsLabel = document.getElementById('ex-reps-label');
    if (trackingModeSelect && repsLabel) {
        trackingModeSelect.onchange = () => {
            repsLabel.textContent = trackingModeSelect.value === 'time' ? t('duration_label', state.language) : t('reps', state.language);
            repsLabel.setAttribute('data-t', trackingModeSelect.value === 'time' ? 'duration_label' : 'reps');
        };
        trackingModeSelect.value = 'reps';
        repsLabel.textContent = t('reps', state.language);
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
    dom.exName.value = ex.name;
    dom.exSets.value = ex.sets;
    dom.exReps.value = ex.reps;
    dom.exWeight.value = ex.weight;
    dom.exRestSets.value = ex.restBetweenSets;
    dom.exRestExercises.value = ex.restBetweenExercises;
    const lmSelect = document.getElementById('ex-load-mode');
    if (lmSelect) lmSelect.value = ex.loadMode || 'external_total';
    
    const trackingModeSelect = document.getElementById('ex-tracking-mode');
    const repsLabel = document.getElementById('ex-reps-label');
    if (trackingModeSelect && repsLabel) {
        trackingModeSelect.value = ex.trackingMode || 'reps';
        repsLabel.textContent = trackingModeSelect.value === 'time' ? t('duration_label', state.language) : t('reps', state.language);
        repsLabel.setAttribute('data-t', trackingModeSelect.value === 'time' ? 'duration_label' : 'reps');
        
        trackingModeSelect.onchange = () => {
            repsLabel.textContent = trackingModeSelect.value === 'time' ? t('duration_label', state.language) : t('reps', state.language);
            repsLabel.setAttribute('data-t', trackingModeSelect.value === 'time' ? 'duration_label' : 'reps');
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
    const data = {
        name: dom.exName.value,
        sets: parseInt(dom.exSets.value) || 0,
        reps: parseInt(dom.exReps.value) || 0,
        weight: parseFloat(dom.exWeight.value) || 0,
        trackingMode: document.getElementById('ex-tracking-mode').value,
        loadMode: document.getElementById('ex-load-mode').value,
        loadMultiplier: document.getElementById('ex-load-mode').value === 'external_single' ? 2 : 1,
        restBetweenSets: parseInt(dom.exRestSets.value) || 60,
        restBetweenExercises: parseInt(dom.exRestExercises.value) || 120,
        updatedAt: FB.serverTimestamp()
    };
    if (dom.exerciseModal) dom.exerciseModal.style.display = 'none';
    if (editId) {
        const docRef = FB.doc(FB.db, 'users', state.user.uid, 'routines', routineId, 'exercises', editId);
        await FB.updateDoc(docRef, data);
    } else {
        const routine = state.routines.find(r => r.id === routineId);
        const maxOrder = (routine && routine.exercises && routine.exercises.length > 0)
            ? Math.max(0, ...routine.exercises.map(ex => ex.order || 0))
            : -1;

        const colRef = FB.collection(FB.db, 'users', state.user.uid, 'routines', routineId, 'exercises');
        await FB.addDoc(colRef, { 
            ...data, 
            order: maxOrder + 1,
            exerciseGroupId: Utils.uuidv4(), 
            doneSeries: [], 
            createdAt: FB.serverTimestamp() 
        });
    }
    if (dom.exerciseForm) dom.exerciseForm.reset();
}

export async function updateExercise(routineId, exerciseId, data) {
    if (!state.user) return;
    try {
        const docRef = FB.doc(FB.db, 'users', state.user.uid, 'routines', routineId, 'exercises', exerciseId);
        await FB.updateDoc(docRef, data);
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