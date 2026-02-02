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
    if (!selectedIsIncluded && routinesOfPlan.length > 0) {
        state.selectedRoutineId = routinesOfPlan[0].id;
        import('./state.js').then(m => m.saveState());
    } else if (routinesOfPlan.length === 0) {
        state.selectedRoutineId = null;
    }
    routineSelect.onchange = (e) => {
        Logic.selectRoutine(e.target.value, renderRoutines);
    };
}