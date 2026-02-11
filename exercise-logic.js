import { state } from './state.js';
import * as FB from './firebase-config.js';
import { t } from './i18n.js';
import * as Utils from './utils.js';
import { dom } from './dom-elements.js';
import { initWorkoutLogic } from './workout-logic.js';
import { initProgressionUI } from './progression-logic.js';

// Re-exports from split files for backward compatibility
export * from './exercise-logic-routine.js';
export * from './exercise-logic-exercise.js';
export * from './exercise-logic-plan.js';

import { handleExerciseSubmit } from './exercise-logic-exercise.js';
import { openManageRoutinesModal, createNewRoutine } from './exercise-logic-routine.js';
import { initExercisePlansLogic } from './exercise-logic-plan.js';

export function initExerciseLogic(refreshUI) {
    initWorkoutLogic(refreshUI);
    initExerciseSettings(refreshUI);
    initProgressionUI();
    initExercisePlansLogic(refreshUI);
    
    const addRoutineBtn = document.getElementById('add-routine-btn');
    if (addRoutineBtn) addRoutineBtn.onclick = () => createNewRoutine(refreshUI);

    const manageRoutinesBtn = document.getElementById('manage-routines-btn');
    if (manageRoutinesBtn) manageRoutinesBtn.onclick = () => openManageRoutinesModal(refreshUI);

    const exForm = document.getElementById('exercise-form');
    if (exForm) exForm.onsubmit = (e) => handleExerciseSubmit(e, refreshUI);
}

// removed function openManageRoutinesModal() {}
// removed function renderRoutinesManagementList() {}
// removed function createNewRoutine() {}
// removed function deleteRoutine() {}
// removed function renameRoutine() {}
// removed function addExercise() {}
// removed function editExercise() {}
// removed function handleExerciseSubmit() {}
// removed function updateExercise() {}
// removed function deleteExercise() {}
// removed function replaceExercise() {}
// removed function reorderRoutines() {}
// removed function reorderExercises() {}
// removed function initExercisePlansLogic() {}
// removed function renderExercisePlansManagementList() {}
// removed function selectExercisePlan() {}
// removed function resetRoutineSeries() {}

export async function selectRoutine(routineId, refreshUI) {
    if (!state.user) return;
    state.selectedRoutineId = routineId;
    import('./state.js').then(m => m.saveState(refreshUI));
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
            const exportData = state.routines.map(r => ({
                name: r.name,
                exercises: (r.exercises || []).map(ex => ({
                    name: ex.name, sets: ex.sets, reps: ex.reps, weight: ex.weight,
                    loadMode: ex.loadMode, loadMultiplier: ex.loadMultiplier,
                    restBetweenSets: ex.restBetweenSets, restBetweenExercises: ex.restBetweenExercises
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
                } catch (err) { console.error("Import failed", err); }
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
                ...ex, exerciseGroupId: Utils.uuidv4(), doneSeries: [], createdAt: FB.serverTimestamp()
            });
        }
    }
}