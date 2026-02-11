import { state } from './state.js';
import { t } from './i18n.js';

function calculateExerciseSuggestion(ex, state) {
    const groupId = ex.exerciseGroupId || ex.id;
    const logs = state.workoutLogs
        .filter(l => l.exercises.some(le => le.exerciseGroupId === groupId))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

    if (logs.length === 0) return null;

    const lastEx = logs[0].exercises.find(le => le.exerciseGroupId === groupId);
    if (!lastEx || !lastEx.sets || lastEx.sets.length === 0) return null;

    // Logic for "Effective Weight": The weight used in the majority of sets
    const weightCounts = {};
    lastEx.sets.forEach(s => {
        weightCounts[s.weightKg] = (weightCounts[s.weightKg] || 0) + 1;
    });
    
    let dominantWeight = parseFloat(Object.keys(weightCounts)[0]);
    let maxCount = 0;
    for (const [w, count] of Object.entries(weightCounts)) {
        const weight = parseFloat(w);
        if (count > maxCount || (count === maxCount && weight > dominantWeight)) {
            dominantWeight = weight;
            maxCount = count;
        }
    }

    const baseReps = ex.reps || 10;
    const minReps = ex.minReps || baseReps;
    const maxReps = ex.maxReps || baseReps;
    
    // Suggestion logic: 
    // If majority reached current target or more -> suggest more reps or more weight
    const allReachedTarget = lastEx.sets.every(s => s.reps >= baseReps);
    const allReachedMax = lastEx.sets.every(s => s.reps >= maxReps);
    const majorityBelowMin = lastEx.sets.filter(s => s.reps < minReps).length > (lastEx.sets.length / 2);
    const majorityBelowTarget = lastEx.sets.filter(s => s.reps < baseReps).length > (lastEx.sets.length / 2);

    let suggestion = {
        weight: dominantWeight,
        reps: baseReps,
        type: 'maintain',
        message: ''
    };

    if (allReachedMax) {
        // reached max reps in all sets: increase weight
        suggestion.weight += 2.5;
        // reset reps to min or current target
        suggestion.reps = minReps;
        suggestion.type = 'increase';
        suggestion.message = t('suggest_increase', state.language);
    } else if (majorityBelowMin) {
        // failing to hit even min reps: decrease weight
        suggestion.weight = Math.max(0, dominantWeight - 2.5);
        suggestion.reps = minReps;
        suggestion.type = 'decrease';
        suggestion.message = t('suggest_decrease', state.language);
    } else if (allReachedTarget && baseReps < maxReps) {
        // reached current target but not max yet: push reps
        suggestion.type = 'push';
        suggestion.reps = baseReps + 1;
        suggestion.message = t('suggest_push_reps', state.language);
    } else if (majorityBelowTarget) {
        // keep current weight but try to hit target reps next time
        suggestion.type = 'maintain';
        suggestion.message = t('suggest_push_reps', state.language);
    } else {
        suggestion.type = 'maintain';
        suggestion.message = t('suggest_push_reps', state.language);
    }

    return suggestion;
}

export function getExerciseItemHTML(ex, routine, state) {
    const isCompleted = ex.doneSeries && ex.doneSeries.length >= ex.sets;
    const groupId = ex.exerciseGroupId || ex.id;
    const groupLogs = state.workoutLogs.filter(l => l.exercises.some(le => le.exerciseGroupId === groupId));
    let trendHtml = '';
    let lastTopSetHtml = '';
    if (groupLogs.length > 0) {
        const lastLog = groupLogs[0];
        const lastEx = lastLog.exercises.find(le => le.exerciseGroupId === groupId);
        if (lastEx && lastEx.sets.length > 0) {
            const topSet = lastEx.sets.reduce((prev, curr) => (curr.weightKg * curr.reps > prev.weightKg * prev.reps) ? curr : prev);
            lastTopSetHtml = `<div style="font-size:0.65rem; color:var(--primary); margin-top:2px;">${t('last_top_set', state.language)}: ${topSet.weightKg}kg x ${topSet.reps}</div>`;
        }
        if (groupLogs.length >= 3) {
            const vol1 = lastEx ? lastEx.sets.reduce((s, c) => s + (c.weightKg * c.reps), 0) : 0;
            const prevEx = groupLogs[1].exercises.find(le => le.exerciseGroupId === groupId);
            const vol2 = prevEx ? prevEx.sets.reduce((s, c) => s + (c.weightKg * c.reps), 0) : 0;
            const prevEx2 = groupLogs[2].exercises.find(le => le.exerciseGroupId === groupId);
            const vol3 = prevEx2 ? prevEx2.sets.reduce((s, c) => s + (c.weightKg * c.reps), 0) : 0;
            if (vol1 > vol2) trendHtml = `<span title="${t('trend_desc_improving', state.language)}">${t('trend_improving', state.language)}</span>`;
            else if (vol1 <= vol2 && vol1 <= vol3) trendHtml = `<span title="${t('trend_desc_stalled', state.language)}" style="color:#ff8a80">${t('trend_stalled', state.language)}</span>`;
        }
    }
    const isTime = ex.trackingMode === 'time';
    const isUnilateral = isTime && ex.timeMode === 'unilateral';
    const suggestion = calculateExerciseSuggestion(ex, state);
    const isPlates = ex.weightUnit === 'plates';
    const unitLabel = isPlates 
        ? (ex.weight === 1 ? t('unit_plate', state.language) : t('unit_plates', state.language)) 
        : 'kg';
    
    const totalWeightPlates = (isPlates && ex.weightPerPlate) ? (ex.weight * ex.weightPerPlate) : null;
    const weightPerPlateInfo = (isPlates && ex.weightPerPlate) 
        ? `<small style="opacity:0.7; font-size: 0.65rem;"> (${ex.weightPerPlate} kg/placa${totalWeightPlates !== null ? ` - Total: ${totalWeightPlates} kg` : ''})</small>` 
        : '';

    const isBodyweight = ex.loadMode === 'bodyweight';
    const suggestionBtn = suggestion ? `
        <button class="view-suggestion-btn" 
                style="background: rgba(100, 181, 246, 0.1); border: 1px solid var(--secondary); border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; padding: 0;" 
                title="${t('view_suggestion', state.language)}"
                data-weight="${suggestion.weight}" 
                data-unit="${unitLabel}"
                data-reps="${suggestion.reps}" 
                data-is-bodyweight="${isBodyweight}"
                data-message="${suggestion.message}">
            ✨
        </button>
    ` : '';

    return `
    <div class="exercise-item ${isCompleted ? 'completed' : ''} ${isTime ? 'time-based' : ''}" data-id="${ex.id}">
        <div class="exercise-content-row">
            <div class="exercise-info">
                <div style="display:flex; justify-content:space-between; align-items:start;">
                    <h4 style="display:inline-block; margin:0;">${ex.name}</h4>
                    <div style="font-size:0.6rem; color:var(--text-light);">${trendHtml}</div>
                </div>
                <div class="exercise-config">
                    <span><strong>${ex.sets}</strong> ${t('sets', state.language)}</span>
                    <span><strong>${ex.reps}</strong> ${isTime ? 'seg' : t('reps', state.language)}</span>
                    ${ex.loadMode !== 'bodyweight' ? `<span><strong>${ex.weight}</strong> ${unitLabel}${weightPerPlateInfo}</span>` : ''}
                </div>
                ${isUnilateral ? `<div style="font-size:0.65rem; color:var(--secondary); margin-top:2px;">🔄 ${t('time_mode_unilateral', state.language)}</div>` : ''}
                ${lastTopSetHtml}
                <div class="exercise-config" style="margin-top:4px; font-size:0.7rem; opacity:0.8;">
                    <span>⏲️ <strong>${(ex.restBetweenSets / 60).toFixed(1).replace(/\.0$/, '')}</strong>min (set)</span>
                    <span>⏲️ <strong>${(ex.restBetweenExercises / 60).toFixed(1).replace(/\.0$/, '')}</strong>min (ex)</span>
                </div>
                ${ex.isVariantChange ? `<div style="font-size:0.6rem; color:var(--secondary); font-weight:bold; margin-top:4px;">✨ ${t('variant_change_msg', state.language)}</div>` : ''}
            </div>
            <div class="series-dots-container">
                ${Array.from({length: ex.sets}).map((_, i) => `<div class="series-dot ${ex.doneSeries?.includes(i) ? 'done' : ''}" data-index="${i}">${isTime ? '⏱️' : i+1}</div>`).join('')}
            </div>
            <div class="exercise-actions-group">
                ${suggestionBtn}
                <button class="edit-btn-mini edit-ex" style="padding:4px 8px; font-size:0.7rem;" title="${t('edit_btn', state.language)}">✏️</button>

                <button class="add-mini-btn replace-ex" style="padding:4px 8px; font-size:0.7rem; border-color:var(--secondary); color:var(--secondary);" title="${t('replace_exercise', state.language)}">⇄</button>
                <button class="add-mini-btn view-prog" style="padding:4px 8px; font-size:0.7rem; border-color:var(--primary); color:var(--primary);" title="${t('view_progress', state.language)}">📈</button>
            </div>
        </div>
    </div>`;
}