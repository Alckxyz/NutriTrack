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
    initExerciseSettings(refreshUI);
    initProgressionUI();
    
    const addRoutineBtn = document.getElementById('add-routine-btn');
    if (addRoutineBtn) {
        addRoutineBtn.onclick = () => {
            openManageRoutinesModal(refreshUI);
        };
    }

    const manageRoutinesBtn = document.getElementById('manage-routines-btn');
    if (manageRoutinesBtn) {
        manageRoutinesBtn.onclick = () => {
            openManageRoutinesModal(refreshUI);
        };
    }

    const exForm = document.getElementById('exercise-form');
    if (exForm) {
        exForm.onsubmit = (e) => handleExerciseSubmit(e, refreshUI);
    }
}

export function openManageRoutinesModal(refreshUI) {
    const modal = document.getElementById('manage-routines-modal');
    if (!modal) return;
    modal.style.display = 'block';
    renderRoutinesManagementList(refreshUI);

    const addBtn = document.getElementById('add-routine-modal-btn');
    addBtn.onclick = () => createNewRoutine(refreshUI);
}

export function renderRoutinesManagementList(refreshUI) {
    const list = document.getElementById('manage-routines-list');
    if (!list) return;

    list.innerHTML = '';
    state.routines.forEach(routine => {
        const item = document.createElement('div');
        item.className = 'library-item';
        item.innerHTML = `
            <div style="flex: 1;">
                <input type="text" class="routine-name-input" value="${routine.name || ''}" style="background: transparent; border: none; color: white; width: 100%;">
            </div>
            <div class="library-item-actions">
                <button class="delete-btn" style="padding: 4px 8px;">×</button>
            </div>
        `;

        const nameInput = item.querySelector('.routine-name-input');
        nameInput.onblur = () => {
            const newName = nameInput.value.trim();
            if (newName && newName !== routine.name) {
                renameRoutine(routine.id, newName).then(() => {
                    if (refreshUI) refreshUI();
                });
            }
        };

        item.querySelector('.delete-btn').onclick = () => {
            deleteRoutine(routine.id).then(() => {
                renderRoutinesManagementList(refreshUI);
                if (refreshUI) refreshUI();
            });
        };

        list.appendChild(item);
    });
}

async function createNewRoutine(refreshUI, name) {
    if (!state.user) return alert("Inicia sesión para crear rutinas");
    
    const routineName = name || (state.language === 'es' ? 'Nueva Rutina' : 'New Routine');

    try {
        const colRef = FB.collection(FB.db, 'users', state.user.uid, 'routines');
        const newDoc = await FB.addDoc(colRef, {
            name: routineName,
            createdAt: FB.serverTimestamp()
        });
        // Select the new routine immediately
        state.selectedRoutineId = newDoc.id;
        await import('./state.js').then(m => m.saveState(() => {
            renderRoutinesManagementList(refreshUI);
            if (refreshUI) refreshUI();
        }));
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
            updatedAt: FB.serverTimestamp()
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
                createdAt: FB.serverTimestamp()
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
            createdAt: FB.serverTimestamp()
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

function initExerciseSettings(refreshUI) {
    const settingsBtn = document.getElementById('exercise-settings-btn');
    const modal = document.getElementById('exercise-settings-modal');
    const timerCheck = document.getElementById('timer-enabled-checkbox');
    const exportBtn = document.getElementById('export-routines-btn');
    const importBtn = document.getElementById('import-routines-btn');

    if (settingsBtn) {
        settingsBtn.onclick = () => {
            if (timerCheck) timerCheck.checked = state.timerEnabled;
            modal.style.display = 'block';
        };
    }

    if (timerCheck) {
        timerCheck.onchange = (e) => {
            state.timerEnabled = e.target.checked;
            import('./state.js').then(m => m.saveState());
        };
    }

    if (exportBtn) {
        exportBtn.onclick = () => {
            if (!state.user) return alert("Inicia sesión para exportar.");
            // We export the simplified routines structure
            const exportData = state.routines.map(r => ({
                name: r.name,
                exercises: (r.exercises || []).map(ex => ({
                    name: ex.name,
                    sets: ex.sets,
                    reps: ex.reps,
                    weight: ex.weight,
                    loadMode: ex.loadMode,
                    loadMultiplier: ex.loadMultiplier,
                    restBetweenSets: ex.restBetweenSets,
                    restBetweenExercises: ex.restBetweenExercises
                }))
            }));
            Utils.downloadJSON(exportData, 'nutritrack-rutinas.json');
        };
    }

    if (importBtn) {
        importBtn.onclick = () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                try {
                    const text = await file.text();
                    const data = JSON.parse(text);
                    if (Array.isArray(data)) {
                        for (const routineData of data) {
                            await importRoutineWithExercises(routineData);
                        }
                        Utils.showToast("✅ Importación completada");
                        modal.style.display = 'none';
                    }
                } catch (err) {
                    console.error("Import failed", err);
                    alert("Error al importar el archivo.");
                }
            };
            input.click();
        };
    }
}

async function importRoutineWithExercises(routineData) {
    if (!state.user) return;
    const colRef = FB.collection(FB.db, 'users', state.user.uid, 'routines');
    const newRoutineDoc = await FB.addDoc(colRef, {
        name: routineData.name || "Rutina Importada",
        createdAt: FB.serverTimestamp()
    });

    if (routineData.exercises && Array.isArray(routineData.exercises)) {
        const exCol = FB.collection(FB.db, 'users', state.user.uid, 'routines', newRoutineDoc.id, 'exercises');
        for (const ex of routineData.exercises) {
            await FB.addDoc(exCol, {
                ...ex,
                exerciseGroupId: Utils.uuidv4(),
                doneSeries: [],
                createdAt: FB.serverTimestamp()
            });
        }
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