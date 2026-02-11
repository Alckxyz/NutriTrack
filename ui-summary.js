import { state, calculateMealNutrients } from './state.js';
import { t } from './i18n.js';
import { getNutrientUnit } from './nutrient-utils.js';

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
        const userSex = state.goals?.calculatorInputs?.sex || 'male';
        const userAge = parseInt(state.goals?.calculatorInputs?.age) || 30;

        const allMicros = [...Object.entries(totals.vitamins), ...Object.entries(totals.minerals)];
        
        allMicros.forEach(([name, val]) => {
            if (val > 0 && visibleList.includes(name)) {
                const unit = getNutrientUnit(name);
                const rdaData = import('./nutrient-utils.js').then(nutri => {
                   const rda = nutri.getNutrientRDA(name, userSex, userAge);
                   let percentHtml = '';
                   let statusIcon = '';
                   let barStyle = '';

                   if (rda) {
                       const percent = (val / rda.val) * 100;
                       percentHtml = `<span style="font-size:0.75rem; font-weight:bold; margin-left:4px;">${Math.round(percent)}%</span>`;
                       
                       if (percent < 70) {
                           statusIcon = '⚠️';
                           barStyle = 'background: #ff8a80;';
                       } else if (percent < 100) {
                           statusIcon = '🟡';
                           barStyle = 'background: #ffd54f;';
                       } else {
                           statusIcon = '✅';
                           barStyle = 'background: var(--primary);';
                       }

                       // Special case for Sodium limit
                       if (rda.limit && val > rda.limit) {
                           statusIcon = '🛑';
                           barStyle = 'background: #ff5252;';
                       }

                       return `
                        <div class="micro-card-detailed" style="background: #252525; padding: 10px; border-radius: 8px; border: 1px solid var(--border); min-width: 140px; flex: 1 1 140px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                                <span style="font-size:0.75rem; font-weight:600; color:var(--text-light);">${name}</span>
                                <span style="font-size:0.8rem;">${statusIcon}</span>
                            </div>
                            <div style="display:flex; align-items:baseline; gap:2px;">
                                <span style="font-size:1.1rem; font-weight:bold; color:white;">${val.toFixed(1)}</span>
                                <small style="font-size:0.65rem; color:var(--text-light);">${unit}</small>
                                ${percentHtml}
                            </div>
                            <div class="progress-container" style="height:3px; margin-top:6px; background:#444;">
                                <div class="progress-bar" style="width:${Math.min(100, percent)}%; ${barStyle}"></div>
                            </div>
                        </div>`;
                   } else {
                       return `<div class="micro-badge-large"><span class="label">${name}</span><span class="value">${val.toFixed(1)}<small style="font-size:0.65em; font-weight:normal; margin-left:1px; color:var(--text-light);">${unit}</small></span></div>`;
                   }
                });
                
                // We need to handle the async nature or just wait for the first promise to resolve
                // Since this is inside a loop and we want to render, let's pre-calculate RDA or use a synchronous map if possible.
                // Re-calculating synchronously since NUTRIENT_RDA is exported.
            }
        });

        // Let's redo the loop synchronously using the exported NUTRIENT_RDA
        import('./nutrient-utils.js').then(nutri => {
            let synchronousMicrosHtml = '';
            allMicros.forEach(([name, val]) => {
                if (val > 0 && visibleList.includes(name)) {
                    const unit = getNutrientUnit(name);
                    const rda = nutri.getNutrientRDA(name, userSex, userAge);
                    
                    if (rda) {
                        const percent = (val / rda.val) * 100;
                        let statusIcon = '✅';
                        let barStyle = 'background: var(--primary);';
                        
                        if (percent < 70) {
                            statusIcon = '⚠️';
                            barStyle = 'background: #ff8a80;';
                        } else if (percent < 100) {
                            statusIcon = '🟡';
                            barStyle = 'background: #ffd54f;';
                        }

                        if (rda.limit && val > rda.limit) {
                            statusIcon = '🛑';
                            barStyle = 'background: #ff5252;';
                        }

                        synchronousMicrosHtml += `
                            <div class="micro-card-detailed" style="background: #252525; padding: 6px 8px; border-radius: 6px; border: 1px solid var(--border); min-width: 100px; flex: 1 1 calc(25% - 8px);">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
                                    <span style="font-size:0.65rem; font-weight:600; color:var(--text-light); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${name}</span>
                                    <span style="font-size:0.7rem;">${statusIcon}</span>
                                </div>
                                <div style="display:flex; align-items:baseline; gap:2px; line-height: 1;">
                                    <span style="font-size:0.9rem; font-weight:bold; color:white;">${val.toFixed(1)}</span>
                                    <small style="font-size:0.6rem; color:var(--text-light);">${unit}</small>
                                    <span style="font-size:0.65rem; font-weight:bold; margin-left:auto; color:${percent >= 100 ? 'var(--primary)' : 'var(--text-light)'}">${Math.round(percent)}%</span>
                                </div>
                                <div class="progress-container" style="height:3px; margin-top:4px; background:#444;">
                                    <div class="progress-bar" style="width:${Math.min(100, percent)}%; ${barStyle}"></div>
                                </div>
                            </div>`;
                    } else {
                        synchronousMicrosHtml += `<div class="micro-badge-large" style="min-width:100px; flex: 1 1 calc(25% - 8px);"><span class="label" style="font-size:0.6rem;">${name}</span><span class="value" style="font-size:0.85rem;">${val.toFixed(1)}<small style="font-size:0.6rem; font-weight:normal; margin-left:1px; color:var(--text-light);">${unit}</small></span></div>`;
                    }
                }
            });
            const totalMicrosEl = document.getElementById('total-micros');
            if (totalMicrosEl) {
                totalMicrosEl.innerHTML = synchronousMicrosHtml ? `<h3 style="width:100%; margin-bottom:6px; font-size: 0.9rem;">${t('total_micros', state.language)}</h3>` + synchronousMicrosHtml : '';
                totalMicrosEl.style.display = 'flex';
                totalMicrosEl.style.flexWrap = 'wrap';
                totalMicrosEl.style.gap = '8px';
                totalMicrosEl.style.marginTop = '1rem';
            }
        });
        const totalMicrosEl = document.getElementById('total-micros');
        if (totalMicrosEl) totalMicrosEl.innerHTML = microsHtml ? `<h3>${t('total_micros', state.language)}</h3>` + microsHtml : '';
    });
}