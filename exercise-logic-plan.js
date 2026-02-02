import * as FB from './firebase-config.js';
import { state } from './state.js';
import * as Utils from './utils.js';

export function initExercisePlansLogic(refreshUI) {
    const addPlanBtn = document.getElementById('add-exercise-plan-btn');
    if (addPlanBtn) {
        addPlanBtn.onclick = () => {
            const newId = 'ep_' + Date.now();
            state.exercisePlans.push({
                id: newId,
                name: state.language === 'es' ? 'Nuevo Plan' : 'New Plan'
            });
            import('./state.js').then(m => m.saveState(() => {
                renderExercisePlansManagementList(refreshUI);
                if (refreshUI) refreshUI();
            }));
        };
    }
}

export function renderExercisePlansManagementList(refreshUI) {
    const list = document.getElementById('exercise-plans-list');
    if (!list) return;
    list.innerHTML = '';
    state.exercisePlans.forEach(plan => {
        const item = document.createElement('div');
        item.className = 'library-item';
        item.innerHTML = `
            <div style="flex: 1;"><input type="text" class="plan-name-input" value="${plan.name}" style="background: transparent; border: none; color: white; width: 100%;"></div>
            <div class="library-item-actions"><button class="delete-btn" style="padding: 4px 8px;">×</button></div>
        `;
        const nameInput = item.querySelector('.plan-name-input');
        nameInput.onblur = () => {
            const newName = nameInput.value.trim();
            if (newName && newName !== plan.name) {
                plan.name = newName;
                import('./state.js').then(m => m.saveState(refreshUI));
            }
        };
        item.querySelector('.delete-btn').onclick = async () => {
            if (state.exercisePlans.length <= 1) return alert(state.language === 'es' ? "Debes tener al menos un plan." : "You must have at least one plan.");
            if (await Utils.confirmAction(state.language === 'es' ? "¿Borrar este plan?" : "Delete this plan?", state.language === 'es' ? "Borrar Plan" : "Delete Plan", { isDanger: true })) {
                state.exercisePlans = state.exercisePlans.filter(p => p.id !== plan.id);
                if (state.currentExercisePlanId === plan.id) state.currentExercisePlanId = state.exercisePlans[0].id;
                import('./state.js').then(m => m.saveState(() => {
                    renderExercisePlansManagementList(refreshUI);
                    if (refreshUI) refreshUI();
                }));
            }
        };
        list.appendChild(item);
    });
}

export function selectExercisePlan(planId, refreshUI) {
    state.currentExercisePlanId = planId;
    const routinesOfPlan = state.routines.filter(r => r.planId === planId || (!r.planId && planId === 'ep1'));
    state.selectedRoutineId = routinesOfPlan.length > 0 ? routinesOfPlan[0].id : null;
    import('./state.js').then(m => m.saveState(refreshUI));
}