import { state } from './state.js';
import { Chart, registerables } from 'chart.js';
import { t } from './i18n.js';

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
        .sort((a, b) => a.createdAt - b.createdAt);

    const labels = history.map(log => new Date(log.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
    const data = history.map(log => {
        const ex = log.exercises.find(e => e.exerciseGroupId === currentGroupId);
        if (!ex || ex.sets.length === 0) return 0;

        const effectiveWeight = (set, bodyweight) => {
            if (ex.type === 'bodyweight') return (bodyweight || 70) + set.weightKg;
            return set.weightKg;
        };

        if (currentMetric === 'topSet') {
            return Math.max(...ex.sets.map(s => effectiveWeight(s, ex.bodyweightKg) * s.reps));
        } else if (currentMetric === 'volume') {
            return ex.sets.reduce((sum, s) => sum + (effectiveWeight(s, ex.bodyweightKg) * s.reps), 0);
        } else if (currentMetric === 'sets') {
            return ex.sets.length;
        }
        return 0;
    });

    const metricLabel = t('metric_' + (currentMetric === 'topSet' ? 'top_set' : currentMetric), state.language);

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