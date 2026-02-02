import * as FB from './firebase-config.js';
import { state } from './state.js';
import { t } from './i18n.js';
import * as Utils from './utils.js';

export async function createNewRoutine(refreshUI) {
    if (!state.user) return alert("Inicia sesión para crear rutinas");
    
    const modal = document.getElementById('routine-prompt-modal');
    const input = document.getElementById('routine-prompt-input');
    const confirmBtn = document.getElementById('confirm-routine-btn');
    
    if (!modal || !input || !confirmBtn) return;

    input.value = '';
    modal.style.display = 'block';
    setTimeout(() => input.focus(), 10);

    const handleConfirm = async () => {
        const name = input.value.trim();
        if (!name) return;
        
        modal.style.display = 'none';
        confirmBtn.onclick = null;
        input.onkeydown = null;
        
        await performRoutineCreation(name, refreshUI);
    };

    const handleKeydown = (e) => {
        if (e.key === 'Enter') handleConfirm();
    };

    confirmBtn.onclick = handleConfirm;
    input.onkeydown = handleKeydown;
}

async function performRoutineCreation(name, refreshUI) {
    try {
        const maxOrder = state.routines.length > 0 
            ? Math.max(0, ...state.routines.map(r => r.order || 0)) 
            : -1;

        const colRef = FB.collection(FB.db, 'users', state.user.uid, 'routines');
        const newDoc = await FB.addDoc(colRef, {
            name: name,
            planId: state.currentExercisePlanId,
            order: maxOrder + 1,
            createdAt: FB.serverTimestamp()
        });
        await import('./state.js').then(m => m.saveState(() => {
            Utils.showToast("✅ " + (state.language === 'es' ? "Rutina creada" : "Routine created"));
            if (refreshUI) refreshUI();
        }));
    } catch (e) { 
        console.error("Error creating routine:", e); 
        Utils.showToast("❌ Error");
    }
}

export async function deleteRoutine(routineId) {
    if (!state.user) return;
    if (!(await Utils.confirmAction(t('confirm_delete_routine', state.language), t('confirm', state.language), { okText: t('delete_btn', state.language), isDanger: true }))) return;
    try {
        const docRef = FB.doc(FB.db, 'users', state.user.uid, 'routines', routineId);
        await FB.deleteDoc(docRef);
    } catch (e) { console.error("Error deleting routine:", e); }
}

export async function renameRoutine(routineId, newName) {
    if (!state.user) return;
    try {
        const docRef = FB.doc(FB.db, 'users', state.user.uid, 'routines', routineId);
        await FB.updateDoc(docRef, { name: newName });
    } catch (e) { console.error("Error renaming routine:", e); }
}

export async function resetRoutineSeries(routineId, refreshUI) {
    if (!state.user) return;
    const routine = state.routines.find(r => r.id === routineId);
    if (!routine || !routine.exercises) return;
    if (!(await Utils.confirmAction(t('confirm_reset_series', state.language), t('confirm', state.language), { okText: t('reset_series', state.language), isDanger: true }))) return;
    try {
        const promises = routine.exercises.map(ex => {
            const docRef = FB.doc(FB.db, 'users', state.user.uid, 'routines', routineId, 'exercises', ex.id);
            return FB.updateDoc(docRef, { doneSeries: [] });
        });
        await Promise.all(promises);
        if (refreshUI) refreshUI();
    } catch (e) { console.error("Error resetting series:", e); }
}

export async function reorderRoutines(orderedIds) {
    if (!state.user) return;
    try {
        const batch = orderedIds.map((id, index) => {
            const docRef = FB.doc(FB.db, 'users', state.user.uid, 'routines', id);
            return FB.updateDoc(docRef, { order: index });
        });
        await Promise.all(batch);
    } catch (e) { console.error("Error reordering routines:", e); }
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
            <div style="flex: 1;"><input type="text" class="routine-name-input" value="${routine.name || ''}" style="background: transparent; border: none; color: white; width: 100%;"></div>
            <div class="library-item-actions"><button class="delete-btn" style="padding: 4px 8px;">×</button></div>`;
        const nameInput = item.querySelector('.routine-name-input');
        nameInput.onblur = () => { if (nameInput.value.trim() && nameInput.value.trim() !== routine.name) renameRoutine(routine.id, nameInput.value.trim()).then(() => { if (refreshUI) refreshUI(); }); };
        item.querySelector('.delete-btn').onclick = () => deleteRoutine(routine.id).then(() => { renderRoutinesManagementList(refreshUI); if (refreshUI) refreshUI(); });
        list.appendChild(item);
    });
}