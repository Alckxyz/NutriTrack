import { state } from './state.js';
import { t } from './i18n.js';

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

export function addConversionRow(containerId, name = '', quantity = '1') {
    const container = document.getElementById(containerId);
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'nutrient-input-row';
    row.innerHTML = `
        <input type="number" step="any" min="0.01" value="${quantity}" required class="conv-qty" style="width: 60px;" title="Cantidad">
        <input type="text" placeholder="${t('unit_name_placeholder', state.language)}" value="${name}" required class="conv-name" style="flex: 1;">
        <span style="font-size: 0.8rem; color: var(--text-light); margin: 0 5px;">= ref.</span>
        <button type="button" class="remove-row-btn">×</button>
    `;
    row.querySelector('.remove-row-btn').onclick = () => row.remove();
    container.appendChild(row);
}

export function getConversionsFromContainer(containerId, baseAmount) {
    const container = document.getElementById(containerId);
    const rows = container.querySelectorAll('.nutrient-input-row');
    const conversions = [];
    rows.forEach(row => {
        const nameInput = row.querySelector('.conv-name');
        const qtyInput = row.querySelector('.conv-qty');
        if (!nameInput || !qtyInput) return;
        
        const name = nameInput.value.trim();
        const qty = parseFloat(qtyInput.value) || 1;
        
        if (name) {
            // grams = baseAmount / quantity
            // e.g. if 2 cups = 500g (baseAmount), then 1 cup = 250g
            const weightPerUnit = baseAmount / qty;
            conversions.push({ name, grams: weightPerUnit, originalQty: qty });
        }
    });
    return conversions;
}