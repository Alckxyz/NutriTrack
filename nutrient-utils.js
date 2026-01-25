import { state, fetchFoodConversions } from './state.js';
import { t } from './i18n.js';
import * as FB from './firebase-config.js';
import { confirmAction } from './utils.js';

export function updateNutrientSuggestions() {
    const suggestionsList = document.getElementById('nutrient-suggestions');
    if (!suggestionsList) return;

    const nutrientNames = new Set();
    state.foodList.forEach(food => {
        if (food.vitamins) Object.keys(food.vitamins).forEach(n => nutrientNames.add(n));
        if (food.minerals) Object.keys(food.minerals).forEach(n => nutrientNames.add(n));
    });

    suggestionsList.innerHTML = '';
    Array.from(nutrientNames).sort().forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        suggestionsList.appendChild(option);
    });
}

export function getDynamicNutrientsFromContainer(containerId) {
    const container = document.getElementById(containerId);
    const rows = container.querySelectorAll('.nutrient-input-row');
    const data = {};
    rows.forEach(row => {
        const nameInput = row.querySelector('.nutrient-name');
        const valueInput = row.querySelector('.nutrient-value');
        if (!nameInput || !valueInput) return;
        const name = nameInput.value.trim();
        const value = parseFloat(valueInput.value);
        if (name && !isNaN(value)) {
            data[name] = value;
        }
    });
    return data;
}

export function addNutrientRowToContainer(containerId, name = '', value = '') {
    const container = document.getElementById(containerId);
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'nutrient-input-row';
    row.innerHTML = `
        <input type="text" placeholder="Name (e.g. Vit B12)" value="${name}" required class="nutrient-name" list="nutrient-suggestions">
        <input type="number" step="0.001" placeholder="Value" value="${value}" required class="nutrient-value">
        <button type="button" class="remove-row-btn">×</button>
    `;
    row.querySelector('.remove-row-btn').onclick = () => row.remove();
    container.appendChild(row);
}

export function addConversionRow(containerId, name = '', quantity = '1', weight = '', id = null, ownerId = null) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const isOwner = !ownerId || (state.user && ownerId === state.user.uid);
    
    const row = document.createElement('div');
    row.className = 'nutrient-input-row';
    if (id) row.dataset.id = id;
    if (ownerId) row.dataset.ownerId = ownerId;
    
    row.innerHTML = `
        <input type="number" step="any" min="0.01" value="${quantity}" required class="conv-qty" style="width: 55px;" title="Cantidad" ${isOwner ? '' : 'disabled'}>
        <input type="text" placeholder="${t('unit_name_placeholder', state.language)}" value="${name}" required class="conv-name" style="flex: 1;" ${isOwner ? '' : 'disabled'}>
        <span style="font-size: 0.8rem; color: var(--text-light); margin: 0 2px;">=</span>
        <input type="number" step="any" min="0" placeholder="g/ml" value="${weight}" required class="conv-weight" style="width: 65px;" title="Peso total" ${isOwner ? '' : 'disabled'}>
        <span style="font-size: 0.7rem; color: var(--text-light);">g/ml</span>
        <button type="button" class="remove-row-btn" ${isOwner ? '' : 'style="display:none"'}>×</button>
    `;
    
    const removeBtn = row.querySelector('.remove-row-btn');
    removeBtn.onclick = async () => {
        if (id && state.user && ownerId === state.user.uid) {
            const confirmMsg = t('confirm_delete_conversion', state.language);
            const msg = confirmMsg === 'confirm_delete_conversion' ? "¿Borrar esta conversión?" : confirmMsg;
            if (!(await confirmAction(msg, t('confirm', state.language), { okText: t('delete_btn', state.language), isDanger: true }))) return;
            
            const foodId = document.getElementById('db-edit-id').value;
            try {
                const docRef = FB.doc(FB.db, 'foodList', foodId, 'conversions', id);
                await FB.deleteDoc(docRef);
                
                // Refresh the entire container to ensure UI is in sync with public data
                fetchFoodConversions(foodId, () => {
                    const container = document.getElementById(containerId);
                    if (container) {
                        container.innerHTML = '';
                        const updated = state.foodConversions[foodId] || [];
                        updated.forEach(c => {
                            const qty = c.originalQty || 1;
                            const w = c.totalWeight || (c.grams * qty);
                            addConversionRow(containerId, c.name, qty, w, c.id, c.ownerId);
                        });
                    }
                });
            } catch (e) {
                console.error("Error deleting conversion", e);
            }
        } else {
            row.remove();
        }
    };
    container.appendChild(row);
}

export function getConversionsFromContainer(containerId) {
    const container = document.getElementById(containerId);
    const rows = container.querySelectorAll('.nutrient-input-row');
    const conversions = [];
    rows.forEach(row => {
        const nameInput = row.querySelector('.conv-name');
        const qtyInput = row.querySelector('.conv-qty');
        const weightInput = row.querySelector('.conv-weight');
        if (!nameInput || !qtyInput || !weightInput) return;
        
        const name = nameInput.value.trim();
        const qty = parseFloat(qtyInput.value) || 1;
        const totalWeight = parseFloat(weightInput.value) || 0;
        
        if (name && totalWeight > 0) {
            const weightPerUnit = totalWeight / qty;
            conversions.push({ 
                id: row.dataset.id || null,
                ownerId: row.dataset.ownerId || null,
                name, 
                grams: weightPerUnit, 
                originalQty: qty,
                totalWeight: totalWeight
            });
        }
    });
    return conversions;
}