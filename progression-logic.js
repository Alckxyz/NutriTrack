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
    const addManualBtn = document.getElementById('add-manual-log-btn');

    if (addManualBtn) {
        addManualBtn.onclick = () => openManualLogModal();
    }

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
                <div style="display: flex; gap: 8px; align-items: center;">
                    <span style="font-size: 0.75rem; color: var(--text-light); font-weight: 600;">${date}</span>
                    <button class="edit-btn-mini edit-log-btn" style="padding: 2px 6px; font-size: 0.65rem;">✏️</button>
                </div>
                <span style="font-size: 0.75rem;">${bestSetText} (${ex.sets.length} sets)</span>
            </div>
            ${ex.notes ? `
                <div style="width: 100%; background: rgba(100, 181, 246, 0.08); padding: 8px; border-radius: 6px; border-left: 3px solid var(--secondary); margin-top: 4px;">
                    <span style="font-size: 0.8rem; color: var(--text); font-style: italic; display: block;">" ${ex.notes} \"</span>
                </div>
            ` : ''}
        `;

        entry.querySelector('.edit-log-btn').onclick = () => openManualLogModal(log.id);

        listCont.appendChild(entry);
    });
}

async function openManualLogModal(logId = null) {
    if (!state.user) return;

    // Find exercise from current group to know its tracking mode
    let targetExDef = null;
    state.routines.forEach(r => {
        const found = r.exercises.find(e => (e.exerciseGroupId || e.id) === currentGroupId);
        if (found) targetExDef = found;
    });
    const isTimeBased = targetExDef?.trackingMode === 'time';

    const modal = document.getElementById('manual-log-modal');
    const titleEl = document.getElementById('manual-log-title');
    const dateIn = document.getElementById('manual-log-date');
    const setsList = document.getElementById('manual-log-sets-list');
    const notesIn = document.getElementById('manual-log-notes');
    const saveBtn = document.getElementById('manual-log-save-btn');
    const addSetBtn = document.getElementById('manual-log-add-set');
    const idIn = document.getElementById('manual-log-id');

    idIn.value = logId || '';
    setsList.innerHTML = '';
    
    let logData = null;
    let exData = null;

    if (logId) {
        logData = state.workoutLogs.find(l => l.id === logId);
        exData = logData?.exercises.find(e => e.exerciseGroupId === currentGroupId);
        titleEl.textContent = "Editar Sesión";
        dateIn.value = Utils.toLocalDate(logData.createdAt).toISOString().split('T')[0];
        notesIn.value = exData?.notes || '';
        const repsHeader = setsList.previousElementSibling?.children[2];
        if (repsHeader) repsHeader.textContent = (exData?.trackingMode === 'time' || isTimeBased) ? 'Seg' : 'Reps';
    } else {
        titleEl.textContent = "Registrar Sesión Pasada";
        dateIn.value = new Date().toISOString().split('T')[0];
        notesIn.value = '';
        const repsHeader = setsList.previousElementSibling?.children[2];
        if (repsHeader) repsHeader.textContent = isTimeBased ? 'Seg' : 'Reps';
    }

    const renderSetRow = (weight = 0, reps = 0) => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.gap = '8px';
        row.style.alignItems = 'center';
        row.innerHTML = `
            <div style="display: flex; align-items: center; gap: 4px;">
                <input type="number" class="manual-weight" value="${weight}" style="width: 58px; padding: 6px; font-size: 0.85rem;" placeholder="0">
                <span style="font-size: 0.7rem; color: var(--text-light);">kg</span>
            </div>
            <span style="font-size: 0.8rem;">x</span>
            <div style="display: flex; align-items: center; gap: 4px;">
                <input type="number" class="manual-reps" value="${reps}" style="width: 58px; padding: 6px; font-size: 0.85rem;" placeholder="0">
                <span style="font-size: 0.7rem; color: var(--text-light);">${isTimeBased ? 'seg' : 'reps'}</span>
            </div>
            <button class="delete-btn remove-set" style="padding: 4px 8px; margin-left: auto;">×</button>
        `;
        row.querySelector('.remove-set').onclick = () => row.remove();
        setsList.appendChild(row);
    };

    if (exData && exData.sets) {
        exData.sets.forEach(s => renderSetRow(s.weightKg, s.reps));
    } else {
        renderSetRow();
    }

    addSetBtn.onclick = () => renderSetRow();

    saveBtn.onclick = async () => {
        const dateStr = dateIn.value;
        const notes = notesIn.value.trim();
        const timestamp = new Date(dateStr + 'T12:00:00').getTime();
        
        const sets = Array.from(setsList.children).map((row, idx) => ({
            weightKg: parseFloat(row.querySelector('.manual-weight').value) || 0,
            reps: parseInt(row.querySelector('.manual-reps').value) || 0,
            setIndex: idx
        })).filter(s => s.reps > 0 || s.weightKg > 0);

        if (sets.length === 0) return alert("Agrega al menos una serie.");

        // Find exercise name from current group
        let exName = "Ejercicio";
        state.routines.forEach(r => {
            const found = r.exercises.find(e => (e.exerciseGroupId || e.id) === currentGroupId);
            if (found) exName = found.name;
        });

        const exercises = [{
            exerciseId: currentGroupId,
            exerciseName: exName,
            exerciseGroupId: currentGroupId,
            sets: sets,
            notes: notes,
            loadMode: 'external_total',
            loadMultiplier: 1
        }];

        const workoutData = {
            routineId: 'manual',
            routineName: 'Registro Manual',
            exercises: exercises,
            createdAt: timestamp,
            startedAt: timestamp
        };

        try {
            const FB = await import('./firebase-config.js');
            if (logId) {
                const docRef = FB.doc(FB.db, 'users', state.user.uid, 'workoutLogs', logId);
                await FB.updateDoc(docRef, workoutData);
            } else {
                const colRef = FB.collection(FB.db, 'users', state.user.uid, 'workoutLogs');
                await FB.addDoc(colRef, workoutData);
            }
            modal.style.display = 'none';
            Utils.showToast("✅ Registro guardado");
            renderChart(); // Refresh progression view
        } catch (e) {
            console.error("Error saving manual log:", e);
        }
    };

    modal.style.display = 'block';
}