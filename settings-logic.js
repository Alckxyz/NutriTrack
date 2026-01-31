import { dom } from './dom-elements.js';
import { state, saveState, loadDailyPlanForDate } from './state.js';
import { t, updateUILanguage } from './i18n.js';
import * as Utils from './utils.js';
import * as GoalsLogic from './goals-logic.js';
import * as FB from './firebase-config.js';

export function initSettingsUI(refreshUI) {
    dom.settingsBtn.onclick = () => {
        dom.settingsModal.style.display = 'block';
        if (dom.displayNameInput) dom.displayNameInput.value = state.displayName || '';
        GoalsLogic.initGoalsUI(refreshUI);
        renderVisibleMicrosSettings(refreshUI);
    };

    dom.saveProfileBtn.onclick = async () => {
        const newName = dom.displayNameInput.value.trim();
        if (newName) {
            state.displayName = newName;
            await saveState(refreshUI);
            Utils.showToast("✅ " + t('profile_updated', state.language));
        }
    };

    dom.modeSelector.onchange = (e) => {
        state.mode = e.target.value;
        saveState(refreshUI);
    };

    dom.planDatePicker.onchange = async (e) => {
        state.currentDate = e.target.value;
        if (state.user) {
            await loadDailyPlanForDate(state.currentDate, refreshUI);
        } else {
            refreshUI();
        }
    };

    dom.prevDayBtn.onclick = () => shiftDate(-1, refreshUI);
    dom.nextDayBtn.onclick = () => shiftDate(1, refreshUI);

    setupImportExport(refreshUI);
}

function setupImportExport(refreshUI) {
    let currentImportMode = '';

    dom.exportDbBtn.onclick = () => {
        if (!state.user) {
            alert(state.language === 'es' ? "Inicia sesión para exportar tus alimentos." : "Login to export your foods.");
            return;
        }
        const userFoods = state.foodList.filter(f => f.ownerId === state.user.uid);
        Utils.downloadJSON(userFoods, 'nutritrack-food-list.json');
    };

    dom.exportPlanBtn.onclick = () => {
        if (state.mode === 'daily') {
            Utils.downloadJSON({ language: state.language, dailyPlans: state.dailyPlans }, 'nutritrack-daily-plans.json');
        } else {
            Utils.downloadJSON({ language: state.language, meals: state.meals }, 'nutritrack-standard-plan.json');
        }
    };

    dom.importDbBtn.onclick = () => { currentImportMode = 'food-list'; dom.fileInput.multiple = false; dom.fileInput.click(); };
    dom.importPlanBtn.onclick = () => { currentImportMode = 'plan-auto'; dom.fileInput.multiple = false; dom.fileInput.click(); };

    dom.fileInput.onchange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        let successCount = 0;
        for (const file of files) {
            try {
                const text = await file.text();
                const data = JSON.parse(text);

                if (currentImportMode === 'plan-auto') {
                    if (Array.isArray(data)) {
                        if (data.length > 0 && 'items' in data[0]) {
                            state.meals = data;
                            state.mode = 'standard';
                        }
                    } else if (data.dailyPlans) {
                        state.dailyPlans = data.dailyPlans;
                        state.mode = 'daily';
                        if (data.language) state.language = data.language;
                    } else if (data.meals) {
                        state.meals = data.meals;
                        state.mode = 'standard';
                        if (data.language) state.language = data.language;
                    }
                } else if (currentImportMode === 'food-list') {
                    if (!state.user) {
                        alert("Please login to import foods.");
                        return;
                    }
                    const list = Array.isArray(data) ? data : (data.foodList || []);
                    for (const item of list) {
                        if (!item.name) continue;
                        const existing = state.foodList.find(f => f.name.toLowerCase() === item.name.toLowerCase() && f.ownerId === state.user.uid);
                        const foodData = {
                            name: item.name,
                            brand: item.brand || '',
                            baseAmount: parseFloat(item.baseAmount) || 100,
                            protein: parseFloat(item.protein) || 0,
                            carbs: parseFloat(item.carbs) || 0,
                            fat: parseFloat(item.fat) || 0,
                            fiber: parseFloat(item.fiber) || 0,
                            defaultUnit: item.defaultUnit || 'g',
                            vitamins: item.vitamins || {},
                            minerals: item.minerals || {},
                            updated_at: Date.now()
                        };

                        if (existing) {
                            const foodRef = FB.doc(FB.db, 'users', state.user.uid, 'foods', existing.id);
                            await FB.updateDoc(foodRef, foodData).catch(async () => {
                                const legacyRef = FB.doc(FB.db, 'foodList', existing.id);
                                await FB.updateDoc(legacyRef, foodData);
                            });
                        } else {
                            const foodCollection = FB.collection(FB.db, 'users', state.user.uid, 'foods');
                            await FB.addDoc(foodCollection, { ...foodData, ownerId: state.user.uid, created_at: Date.now() });
                        }
                    }
                }
                successCount++;
            } catch (err) {
                console.error("Import error for file:", file.name, err);
            }
        }

        if (successCount > 0) {
            dom.settingsModal.style.display = 'none';
            saveState(refreshUI);
        }
        dom.fileInput.value = '';
    };
}

export function shiftDate(days, refreshUI) {
    const current = new Date(state.currentDate + 'T12:00:00');
    current.setDate(current.getDate() + days);
    state.currentDate = current.toISOString().split('T')[0];
    dom.planDatePicker.value = state.currentDate;
    refreshUI();
}

export function updateModeVisibility() {
    const plansSelector = document.getElementById('standard-plans-selector-container');
    if (state.mode === 'daily') {
        dom.datePickerContainer.classList.remove('hidden');
        if (plansSelector) plansSelector.classList.add('hidden');
    } else {
        dom.datePickerContainer.classList.add('hidden');
        if (plansSelector) plansSelector.classList.remove('hidden');
        renderStandardPlansSelector();
    }
}

function renderStandardPlansSelector() {
    const select = document.getElementById('standard-plan-select');
    if (!select) return;

    select.innerHTML = '';
    state.standardPlans.forEach(plan => {
        const opt = document.createElement('option');
        opt.value = plan.id;
        opt.textContent = plan.name;
        if (plan.id === state.currentStandardPlanId) opt.selected = true;
        select.appendChild(opt);
    });

    select.onchange = (e) => {
        state.currentStandardPlanId = e.target.value;
        saveState(() => {
            // Trigger refresh
            const navCalBtn = document.getElementById('nav-calories-btn');
            if (navCalBtn) navCalBtn.click();
        });
    };

    const manageBtn = document.getElementById('manage-standard-plans-btn');
    if (manageBtn) {
        manageBtn.onclick = () => {
            document.getElementById('standard-plans-modal').style.display = 'block';
            renderStandardPlansList();
        };
    }
}

function renderStandardPlansList() {
    const list = document.getElementById('standard-plans-list');
    const addBtn = document.getElementById('add-standard-plan-btn');
    if (!list) return;

    list.innerHTML = '';
    state.standardPlans.forEach(plan => {
        const item = document.createElement('div');
        item.className = 'library-item';
        item.innerHTML = `
            <div style="flex: 1;">
                <input type="text" class="plan-name-input" value="${plan.name}" style="background: transparent; border: none; color: white; width: 100%;">
            </div>
            <div class="library-item-actions">
                <button class="delete-btn" style="padding: 4px 8px;">×</button>
            </div>
        `;

        const nameInput = item.querySelector('.plan-name-input');
        nameInput.onblur = () => {
            const newName = nameInput.value.trim();
            if (newName && newName !== plan.name) {
                plan.name = newName;
                saveState(() => {
                    renderStandardPlansSelector();
                });
            }
        };

        item.querySelector('.delete-btn').onclick = async () => {
            if (state.standardPlans.length <= 1) {
                alert("Debes tener al menos un plan.");
                return;
            }
            if (await Utils.confirmAction("¿Borrar este plan y todas sus comidas?", "Borrar Plan", { isDanger: true })) {
                state.standardPlans = state.standardPlans.filter(p => p.id !== plan.id);
                if (state.currentStandardPlanId === plan.id) {
                    state.currentStandardPlanId = state.standardPlans[0].id;
                }
                saveState(() => {
                    renderStandardPlansList();
                    renderStandardPlansSelector();
                    // Full refresh
                    const navCalBtn = document.getElementById('nav-calories-btn');
                    if (navCalBtn) navCalBtn.click();
                });
            }
        };

        list.appendChild(item);
    });

    addBtn.onclick = () => {
        const newId = 'p_' + Date.now();
        state.standardPlans.push({
            id: newId,
            name: 'Nuevo Plan',
            meals: [
                { id: 'm1_' + newId, name: 'Desayuno', items: [] },
                { id: 'm2_' + newId, name: 'Almuerzo', items: [] },
                { id: 'm3_' + newId, name: 'Cena', items: [] }
            ]
        });
        saveState(() => {
            renderStandardPlansList();
            renderStandardPlansSelector();
        });
    };
}

function renderVisibleMicrosSettings(refreshUI) {
    const container = document.getElementById('visible-micros-selection');
    if (!container) return;

    // Separate vitamins and minerals from the food list
    const vitamins = new Set();
    const minerals = new Set();
    state.foodList.forEach(food => {
        if (food.vitamins) Object.keys(food.vitamins).forEach(v => vitamins.add(v));
        if (food.minerals) Object.keys(food.minerals).forEach(m => minerals.add(m));
    });

    container.innerHTML = '';

    if (vitamins.size === 0 && minerals.size === 0) {
        container.innerHTML = `<p style="font-size:0.7rem; color:var(--text-light); width:100%; text-align:center;">No hay micronutrientes registrados en tus alimentos todavía.</p>`;
        return;
    }

    const createGroup = (titleKey, items) => {
        if (items.size === 0) return;
        const sortedItems = Array.from(items).sort();
        
        const groupHeader = document.createElement('div');
        groupHeader.style.cssText = 'width: 100%; font-size: 0.7rem; font-weight: bold; color: var(--secondary); margin-top: 8px; margin-bottom: 4px; text-transform: uppercase; border-bottom: 1px solid #444; padding-bottom: 2px;';
        groupHeader.textContent = t(titleKey, state.language);
        container.appendChild(groupHeader);

        const itemsContainer = document.createElement('div');
        itemsContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 6px; width: 100%;';
        
        sortedItems.forEach(micro => {
            const label = document.createElement('label');
            label.style.cssText = 'display: flex; align-items: center; gap: 6px; background: #333; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; cursor: pointer;';
            
            const isChecked = state.visibleMicros.includes(micro);
            label.innerHTML = `
                <input type="checkbox" value="${micro}" ${isChecked ? 'checked' : ''}>
                ${micro}
            `;

            const checkbox = label.querySelector('input');
            checkbox.onchange = () => {
                if (checkbox.checked) {
                    if (!state.visibleMicros.includes(micro)) state.visibleMicros.push(micro);
                } else {
                    state.visibleMicros = state.visibleMicros.filter(m => m !== micro);
                }
                saveState(refreshUI);
            };
            itemsContainer.appendChild(label);
        });
        container.appendChild(itemsContainer);
    };

    createGroup('vitamins', vitamins);
    createGroup('minerals', minerals);
}

export function updateDayName() {
    if (state.mode === 'daily') {
        const date = new Date(state.currentDate + 'T12:00:00');
        const options = { weekday: 'long' };
        const dayName = date.toLocaleDateString(state.language === 'es' ? 'es-ES' : 'en-US', options);
        dom.dayNameDisplay.textContent = dayName;
    } else {
        dom.dayNameDisplay.textContent = '';
    }
}