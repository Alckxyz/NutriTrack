import { state, calculateMealNutrients } from './state.js';
import { t } from './i18n.js';

const statContainers = {
    get calories() { return document.getElementById('stat-calories'); },
    get protein() { return document.getElementById('stat-protein'); },
    get carbs() { return document.getElementById('stat-carbs'); },
    get fat() { return document.getElementById('stat-fat'); },
    get fiber() { return document.getElementById('stat-fiber'); }
};

const renderStat = (container, current, goal, unit, labelKey, hasGoals) => {
    if (!container) return;
    container.innerHTML = `<span class="label" data-t="${labelKey}">${t(labelKey, state.language)}</span>`;
    const valueSpan = document.createElement('span');
    valueSpan.className = 'value';
    if (hasGoals && goal > 0) {
        const percent = (current / goal) * 100;
        const reached = percent >= 100;

        valueSpan.textContent = `${Math.round(current)} / ${Math.round(goal)}`;
        valueSpan.style.color = reached ? 'var(--primary)' : '#ffffff';
        container.appendChild(valueSpan);

        const goalInfo = document.createElement('span');
        goalInfo.className = 'goal-info';
        const remaining = goal - current;
        goalInfo.textContent = `${remaining.toFixed(1)}${unit} ${t('remaining', state.language)}`;
        container.appendChild(goalInfo);

        const progressCont = document.createElement('div');
        progressCont.className = 'progress-container';
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        const displayPercent = Math.min(100, percent);
        progressBar.style.width = `${displayPercent}%`;
        
        // Use blue (secondary) while filling, green (primary) when reached
        progressBar.style.background = reached ? 'var(--primary)' : 'var(--secondary)';
        
        progressCont.appendChild(progressBar);
        container.appendChild(progressCont);
    } else {
        valueSpan.textContent = unit === 'kcal' ? Math.round(current) : current.toFixed(1);
        container.appendChild(valueSpan);
        const unitSpan = document.createElement('span');
        unitSpan.className = 'unit';
        unitSpan.textContent = unit;
        container.appendChild(unitSpan);
    }
};

export function updateSummary() {
    let totals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, vitamins: {}, minerals: {} };
    const currentMeals = (typeof state.getCurrentMeals === 'function' ? state.getCurrentMeals() : []); 
    // Usually state.js handles getCurrentMeals, but we import it from state.js anyway
    import('./state.js').then(({ getCurrentMeals }) => {
        const meals = getCurrentMeals();
        meals.forEach(meal => {
            const m = calculateMealNutrients(meal);
            totals.calories += m.calories;
            totals.protein += m.protein;
            totals.carbs += m.carbs;
            totals.fat += m.fat;
            totals.fiber += m.fiber;
            Object.entries(m.vitamins).forEach(([n, v]) => totals.vitamins[n] = (totals.vitamins[n] || 0) + v);
            Object.entries(m.minerals).forEach(([n, v]) => totals.minerals[n] = (totals.minerals[n] || 0) + v);
        });

        const hasGoals = state.goals && state.goals.calories > 0;
        renderStat(statContainers.calories, totals.calories, state.goals.calories, 'kcal', 'calories', hasGoals);
        renderStat(statContainers.protein, totals.protein, state.goals.protein, 'g', 'protein', hasGoals);
        renderStat(statContainers.carbs, totals.carbs, state.goals.carbs, 'g', 'carbs', hasGoals);
        renderStat(statContainers.fat, totals.fat, state.goals.fat, 'g', 'fat', hasGoals);
        renderStat(statContainers.fiber, totals.fiber, state.goals.fiber, 'g', 'fiber', hasGoals);

        const existingPrompt = document.querySelector('.set-goals-prompt');
        if (hasGoals) {
            if (existingPrompt) existingPrompt.remove();
        } else if (!existingPrompt) {
            const statsGrid = document.querySelector('.stats-grid');
            const prompt = document.createElement('div');
            prompt.className = 'set-goals-prompt';
            prompt.textContent = t('set_goals_hint', state.language);
            statsGrid.appendChild(prompt);
        }

        let microsHtml = '';
        const visibleList = state.visibleMicros || [];
        [...Object.entries(totals.vitamins), ...Object.entries(totals.minerals)].forEach(([name, val]) => {
            if (val > 0 && visibleList.includes(name)) {
                microsHtml += `<div class="micro-badge-large"><span class="label">${name}</span><span class="value">${val.toFixed(1)}</span></div>`;
            }
        });
        const totalMicrosEl = document.getElementById('total-micros');
        if (totalMicrosEl) totalMicrosEl.innerHTML = microsHtml ? `<h3>${t('total_micros', state.language)}</h3>` + microsHtml : '';
    });
}