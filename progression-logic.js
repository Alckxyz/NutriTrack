import { state } from './state.js';
import { Chart, registerables } from 'chart.js';
import { t } from './i18n.js';
import * as Utils from './utils.js';

Chart.register(...registerables);

let progChart = null;
let currentGroupId = null;
let currentMetric = 'topSet';

export function initProgressionUI() {
    const modal = document.getElementById('progression-modal');
    const select = document.getElementById('progression-group-select');
    const tabs = document.querySelectorAll('#progression-modal .tab-btn');

    if (select) {
        select.onchange = (e) => {
            currentGroupId = e.target.value;
            renderChart();
        };
    }

    tabs.forEach(tab => {
        tab.onclick = () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentMetric = tab.dataset.metric;
            renderChart();
        };
    });
}

export function showProgression(groupId) {
    currentGroupId = groupId;
    const modal = document.getElementById('progression-modal');
    const select = document.getElementById('progression-group-select');
    
    // Fill select with all unique groups
    const groupsMap = new Map();
    state.workoutLogs.forEach(log => {
        log.exercises.forEach(ex => {
            const gid = ex.exerciseGroupId || ex.exerciseId;
            if (!groupsMap.has(gid)) groupsMap.set(gid, ex.exerciseName);
        });
    });
    // Add groups from current routines too (in case no logs yet)
    state.routines.forEach(r => {
        r.exercises.forEach(ex => {
            const gid = ex.exerciseGroupId || ex.id;
            if (!groupsMap.has(gid)) groupsMap.set(gid, ex.name);
        });
    });

    select.innerHTML = '';
    groupsMap.forEach((name, gid) => {
        const opt = document.createElement('option');
        opt.value = gid;
        opt.textContent = name;
        if (gid === groupId) opt.selected = true;
        select.appendChild(opt);
    });

    modal.style.display = 'block';
    renderChart();
}

function renderChart() {
    const canvas = document.getElementById('progression-chart');
    if (!canvas || !currentGroupId) return;

    if (progChart) progChart.destroy();

    // Filter and prepare data
    const history = state.workoutLogs
        .filter(log => log.exercises.some(ex => ex.exerciseGroupId === currentGroupId))
        .sort((a, b) => Utils.toMillis(a.createdAt) - Utils.toMillis(b.createdAt));

    const labels = history.map(log => Utils.toLocalDate(log.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
    const data = history.map((log, idx) => {
        const ex = log.exercises.find(e => e.exerciseGroupId === currentGroupId);
        if (!ex || ex.sets.length === 0) return 0;

        const getSetScore = (set) => {
            if (ex.loadMode === 'bodyweight') {
                return set.reps;
            }
            const multiplier = ex.loadMultiplier || 1;
            const equivalentWeight = set.weightKg * multiplier;
            return equivalentWeight * set.reps;
        };

        if (currentMetric === 'topSet') {
            return Math.max(...ex.sets.map(s => getSetScore(s)));
        } else if (currentMetric === 'volume') {
            return ex.sets.reduce((sum, s) => sum + getSetScore(s), 0);
        } else if (currentMetric === 'sets') {
            return ex.sets.length;
        }
        return 0;
    });

    const metricLabel = t('metric_' + (currentMetric === 'topSet' ? 'top_set' : currentMetric), state.language);

    renderHistoryList(history);

    progChart = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: metricLabel,
                data: data,
                borderColor: '#64b5f6',
                backgroundColor: 'rgba(100, 181, 246, 0.1)',
                fill: true,
                tension: 0.3,
                pointRadius: 5,
                pointBackgroundColor: '#64b5f6'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: '#333' }, ticks: { color: '#aaa' } },
                x: { grid: { display: false }, ticks: { color: '#aaa' } }
            }
        }
    });
}

function renderHistoryList(history) {
    const listCont = document.getElementById('progression-history-list');
    if (!listCont) return;
    listCont.innerHTML = '';

    // Show newest first for the history list
    const sortedHistory = [...history].reverse();

    if (sortedHistory.length === 0) {
        listCont.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-light); font-size: 0.8rem;">No hay registros previos.</div>`;
        return;
    }

    sortedHistory.forEach(log => {
        const ex = log.exercises.find(e => e.exerciseGroupId === currentGroupId);
        if (!ex) return;

        const date = Utils.toLocalDate(log.createdAt).toLocaleDateString(undefined, { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });

        const entry = document.createElement('div');
        entry.className = 'library-item';
        entry.style.flexDirection = 'column';
        entry.style.alignItems = 'flex-start';
        entry.style.gap = '4px';
        entry.style.padding = '10px 12px';

        let bestSetText = '';
        if (ex.sets.length > 0) {
            const bestSet = ex.sets.reduce((prev, curr) => (curr.weightKg * curr.reps > prev.weightKg * prev.reps) ? curr : prev);
            bestSetText = `<span style="color: var(--primary); font-weight: bold;">${bestSet.weightKg}kg x ${bestSet.reps}</span>`;
        }

        entry.innerHTML = `
            <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                <span style="font-size: 0.75rem; color: var(--text-light); font-weight: 600;">${date}</span>
                <span style="font-size: 0.75rem;">${bestSetText} (${ex.sets.length} sets)</span>
            </div>
            ${ex.notes ? `
                <div style="width: 100%; background: rgba(100, 181, 246, 0.08); padding: 8px; border-radius: 6px; border-left: 3px solid var(--secondary); margin-top: 4px;">
                    <span style="font-size: 0.8rem; color: var(--text); font-style: italic; display: block;">" ${ex.notes} \"</span>
                </div>
            ` : ''}
        `;
        listCont.appendChild(entry);
    });
}