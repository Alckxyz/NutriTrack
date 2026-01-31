import { state, saveState } from './state.js';
import { dom } from './dom-elements.js';
import { t } from './i18n.js';
import * as FB from './firebase-config.js';
import * as Utils from './utils.js';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

let weightChart = null;
let currentRange = 30;

export function initWeightUI(refreshUI) {
    dom.weightBtn.onclick = () => {
        dom.weightModal.style.display = 'block';
        const dateInput = document.getElementById('weight-date-input');
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
        refreshWeightUI();
    };

    dom.reminderWeightBtn.onclick = () => {
        dom.weightBtn.click();
    };

    dom.saveWeightBtn.onclick = () => {
        saveWeightEntry();
    };
}

export async function saveWeightEntry() {
    if (!state.user) return alert("Inicia sesión para guardar tu progreso");
    const weight = parseFloat(dom.weightInput.value);
    const unit = dom.weightUnitSelect.value;
    const note = dom.weightNote.value.trim();
    const dateInput = document.getElementById('weight-date-input');
    const selectedDate = dateInput ? dateInput.value : null;

    if (isNaN(weight) || weight <= 0) return alert("Ingresa un peso válido.");

    const weightKg = unit === 'lb' ? weight * 0.453592 : weight;
    const timestamp = selectedDate ? new Date(selectedDate + 'T12:00:00').getTime() : Date.now();

    try {
        const colRef = FB.collection(FB.db, 'users', state.user.uid, 'weightEntries');
        await FB.addDoc(colRef, {
            weight,
            unit,
            weightKg,
            note,
            createdAt: timestamp
        });
        dom.weightInput.value = '';
        dom.weightNote.value = '';
        checkRecalculateAlert(weightKg);
    } catch (e) {
        console.error("Error saving weight:", e);
        alert("Error de permisos: " + e.message);
    }
}

export async function deleteWeightEntry(id) {
    if (!state.user) return;
    if (await Utils.confirmAction("¿Borrar este registro?", t('confirm', state.language), { okText: t('delete_btn', state.language), isDanger: true })) {
        try {
            const docRef = FB.doc(FB.db, 'users', state.user.uid, 'weightEntries', id);
            await FB.deleteDoc(docRef);
        } catch (e) {
            console.error("Error deleting weight:", e);
        }
    }
}

async function checkRecalculateAlert(newWeightKg) {
    // Check against last calculation weight if stored, or first weight
    const lastCalculatedWeight = state.goals?.calculatorInputs?.weight;
    if (lastCalculatedWeight) {
        const diff = Math.abs(newWeightKg - lastCalculatedWeight) / lastCalculatedWeight;
        if (diff > 0.04) { // 4% change
            const diffPct = (diff * 100).toFixed(1);
            if (await Utils.confirmAction(
                t('weight_recalculate_alert', state.language).replace('{diff}', diffPct), 
                "Nuevo Peso Detectado",
                { okText: t('recalculate_now_btn', state.language), isDanger: false }
            )) {
                dom.weightModal.style.display = 'none';
                dom.settingsBtn.click();
                setTimeout(() => dom.openWizardBtn.click(), 500);
            }
        }
    }
}

export function refreshWeightUI() {
    renderWeightHistory();
    renderWeightChart();
    renderWeightAnalysis();
    renderAutoCoach();
    updateDashboardReminder();
}

function updateDashboardReminder() {
    if (!state.weightEntries || state.weightEntries.length === 0) {
        dom.weightReminder.classList.remove('hidden');
        return;
    }
    const lastEntry = state.weightEntries[0]; // ordered desc
    const lastTime = Utils.toMillis(lastEntry.createdAt);
    const diffDays = (Date.now() - lastTime) / (1000 * 60 * 60 * 24);
    if (diffDays > 7) {
        dom.weightReminder.classList.remove('hidden');
    } else {
        dom.weightReminder.classList.add('hidden');
    }
}

function renderWeightHistory() {
    const list = dom.weightHistoryList;
    if (!list) return;
    list.innerHTML = '';
    state.weightEntries.forEach(entry => {
        const div = document.createElement('div');
        div.className = 'library-item';
        const date = Utils.toLocalDate(entry.createdAt).toLocaleDateString();
        div.innerHTML = `
            <div class="library-item-info">
                <strong>${entry.weight} ${entry.unit}</strong> <small>(${date})</small>
                ${entry.note ? `<br><small style="color:var(--text-light)">${entry.note}</small>` : ''}
            </div>
            <button class="delete-btn" style="padding: 2px 8px;">×</button>
        `;
        div.querySelector('.delete-btn').onclick = () => deleteWeightEntry(entry.id);
        list.appendChild(div);
    });
}

function renderWeightAnalysis() {
    const panel = dom.weightAnalysisPanel;
    if (!panel || !state.weightEntries || state.weightEntries.length < 2) {
        panel.innerHTML = `<p>${t('trend_no_data', state.language)}</p>`;
        return;
    }

    const current = state.weightEntries[0].weightKg;
    const initial = state.weightEntries[state.weightEntries.length - 1].weightKg;
    const totalChange = (current - initial).toFixed(1);
    
    // Simple Weekly trend (last 14 days)
    const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
    const recentEntries = state.weightEntries.filter(e => Utils.toMillis(e.createdAt) > twoWeeksAgo);
    
    let trendMsg = '';
    if (recentEntries.length >= 2) {
        const latest = recentEntries[0].weightKg;
        const oldest = recentEntries[recentEntries.length - 1].weightKg;
        const weeklyChange = (latest - oldest) / (recentEntries.length); // simple avg change per entry roughly
        
        const goal = state.goals.calculatorInputs?.goal || 'maintain';
        
        if (goal === 'lose') {
            if (weeklyChange < -0.2) trendMsg = t('trend_losing_slow', state.language);
            else if (weeklyChange < -1.5) trendMsg = t('trend_losing_fast', state.language);
            else trendMsg = t('trend_losing_stalled', state.language);
        } else if (goal === 'gain') {
            if (weeklyChange > 0.1 && weeklyChange < 0.5) trendMsg = t('trend_gaining_slow', state.language);
            else if (weeklyChange > 0.5) trendMsg = t('trend_gaining_fast', state.language);
            else trendMsg = t('trend_gaining_stalled', state.language);
        } else {
            trendMsg = t('trend_maintain_stable', state.language);
        }
    }

    panel.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <span>${t('trend_gain_total', state.language).replace('{val}', totalChange)}</span>
            <span style="color:var(--primary)">${trendMsg}</span>
        </div>
    `;
}

function renderAutoCoach() {
    const coachContent = dom.coachContent;
    const applyBtn = dom.coachApplyBtn;
    if (!coachContent || !applyBtn) return;

    if (!state.weightEntries || state.weightEntries.length < 2) {
        coachContent.innerHTML = `<p style="color:var(--text-light); font-style:italic;">${t('coach_no_data', state.language)}</p>`;
        applyBtn.classList.add('hidden');
        return;
    }

    const now = Date.now();
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    
    const weekNowEntries = state.weightEntries.filter(e => Utils.toMillis(e.createdAt) > (now - oneWeekMs));
    const weekPrevEntries = state.weightEntries.filter(e => {
        const ms = Utils.toMillis(e.createdAt);
        return ms <= (now - oneWeekMs) && ms > (now - 2 * oneWeekMs);
    });

    if (weekNowEntries.length < 2 || weekPrevEntries.length < 1) {
        coachContent.innerHTML = `<p style="color:var(--text-light); font-style:italic;">${t('coach_no_data', state.language)}</p>`;
        applyBtn.classList.add('hidden');
        return;
    }

    const avgNow = weekNowEntries.reduce((sum, e) => sum + e.weightKg, 0) / weekNowEntries.length;
    const avgPrev = weekPrevEntries.reduce((sum, e) => sum + e.weightKg, 0) / weekPrevEntries.length;
    
    const diffKg = avgNow - avgPrev;
    const pctChange = (diffKg / avgPrev) * 100;
    
    // User goal from wizard or settings
    const userGoal = state.goals.calculatorInputs?.goal || 'maintain'; // lose, maintain, gain
    
    let statusMsg = '';
    let recommendationKcal = 0;
    let onTrack = false;

    // Ranges:
    // gain (bulk): +0.25% to +0.5%
    // lose (cut): -0.5% to -1.0%
    // maintain: -0.25% to +0.25%

    if (userGoal === 'gain') {
        if (pctChange >= 0.20 && pctChange <= 0.60) {
            onTrack = true;
            statusMsg = t('coach_status_on_track', state.language);
        } else if (pctChange < 0.20) {
            statusMsg = t('coach_status_too_slow', state.language);
            recommendationKcal = 200;
        } else {
            statusMsg = t('coach_status_too_fast', state.language);
            recommendationKcal = -150;
        }
    } else if (userGoal === 'lose') {
        if (pctChange <= -0.45 && pctChange >= -1.1) {
            onTrack = true;
            statusMsg = t('coach_status_on_track', state.language);
        } else if (pctChange > -0.45) {
            statusMsg = t('coach_status_too_slow', state.language);
            recommendationKcal = -200;
        } else {
            statusMsg = t('coach_status_too_fast', state.language);
            recommendationKcal = 200;
        }
    } else { // maintain
        if (pctChange >= -0.30 && pctChange <= 0.30) {
            onTrack = true;
            statusMsg = t('coach_status_on_track', state.language);
        } else if (pctChange > 0.30) {
            statusMsg = t('coach_status_too_fast', state.language);
            recommendationKcal = -150;
        } else {
            statusMsg = t('coach_status_too_slow', state.language);
            recommendationKcal = 150;
        }
    }

    const goalLabel = t(`coach_goal_${userGoal === 'lose' ? 'cut' : userGoal === 'gain' ? 'bulk' : 'maintain'}`, state.language);
    
    coachContent.innerHTML = `
        <div style="margin-bottom:8px;">
            <strong>Objetivo actual:</strong> <span style="color:var(--secondary)">${goalLabel}</span>
        </div>
        <div style="margin-bottom:8px; color: ${onTrack ? 'var(--primary)' : '#ff8a80'};">
            ${t('coach_trend_msg', state.language).replace('{kg}', diffKg.toFixed(2)).replace('{pct}', pctChange.toFixed(2))}
        </div>
        <div style="font-weight:bold; margin-bottom:4px;">${statusMsg}</div>
    `;

    if (recommendationKcal !== 0) {
        applyBtn.classList.remove('hidden');
        applyBtn.textContent = t('coach_apply_btn', state.language).replace('{delta}', (recommendationKcal > 0 ? '+' : '') + recommendationKcal);
        applyBtn.onclick = async () => {
            state.goals.calories = (state.goals.calories || 2000) + recommendationKcal;
            // Also store coach info for analytics if needed
            state.goals.lastCoachDelta = recommendationKcal;
            state.goals.lastCoachDate = Date.now();
            
            await saveState();
            import('./utils.js').then(u => u.showToast("✅ " + t('profile_updated', state.language)));
            renderAutoCoach();
        };
    } else {
        applyBtn.classList.add('hidden');
    }
}

function renderWeightChart() {
    const ctx = dom.weightChartCanvas?.getContext('2d');
    if (!ctx) return;

    if (weightChart) weightChart.destroy();

    const entries = [...state.weightEntries].reverse();
    const data = entries.map(e => e.weightKg);
    const labels = entries.map(e => Utils.toLocalDate(e.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));

    weightChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Peso (kg)',
                data: data,
                borderColor: '#81c784',
                backgroundColor: 'rgba(129, 199, 132, 0.1)',
                fill: true,
                tension: 0.3,
                pointRadius: 4,
                pointBackgroundColor: '#81c784'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    grid: { color: '#333' },
                    ticks: { color: '#aaa', font: { size: 10 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#aaa', font: { size: 10 } }
                }
            }
        }
    });
}