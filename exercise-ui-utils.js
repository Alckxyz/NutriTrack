import { state } from './state.js';
import { t } from './i18n.js';
import * as Logic from './exercise-logic.js';

export function updatePlanSelector(planSelect, managePlansBtn, renderRoutines) {
    if (!planSelect) return;
    planSelect.innerHTML = '';
    state.exercisePlans.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        if (state.currentExercisePlanId === p.id) opt.selected = true;
        planSelect.appendChild(opt);
    });
    planSelect.onchange = (e) => {
        import('./exercise-logic-plan.js').then(m => m.selectExercisePlan(e.target.value, renderRoutines));
    };
    if (managePlansBtn) {
        managePlansBtn.onclick = () => {
            document.getElementById('exercise-plans-modal').style.display = 'block';
            import('./exercise-logic-plan.js').then(m => m.renderExercisePlansManagementList(renderRoutines));
        };
    }
}

export function updateRoutineSelector(routineSelect, routinesOfPlan, renderRoutines) {
    if (!routineSelect) return;
    routineSelect.innerHTML = '';
    routinesOfPlan.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.id;
        opt.textContent = r.name || t('untitled_routine', state.language);
        if (state.selectedRoutineId === r.id) opt.selected = true;
        routineSelect.appendChild(opt);
    });

    const selectedIsIncluded = routinesOfPlan.some(r => r.id === state.selectedRoutineId);
    
    // Improved Persistence Logic:
    // We only set a default if we have routines available and the current selection 
    // is truly empty or invalid for the current plan.
    // Importantly, we don't set it to null if routinesOfPlan is empty, 
    // because that usually means data is just still loading from Firebase.
    if (routinesOfPlan.length > 0) {
        if (!state.selectedRoutineId) {
            state.selectedRoutineId = routinesOfPlan[0].id;
        } else if (!selectedIsIncluded) {
            // Keep the selectedRoutineId as is, unless we explicitly want to force 
            // the first one of the current plan.
            state.selectedRoutineId = routinesOfPlan[0].id;
        }
    }

    routineSelect.onchange = (e) => {
        Logic.selectRoutine(e.target.value, renderRoutines);
    };
}