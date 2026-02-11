import { state, fetchFoodConversions } from './state.js';
import { t } from './i18n.js';
import * as FB from './firebase-config.js';
import { confirmAction } from './utils.js';

/**
 * Reference Daily Intake (RDI/RDA) for Adults.
 * Simplified for general nutritional tracking.
 */
export const NUTRIENT_RDA = {
    // Vitamins
    'Vitamina A': { male: 900, female: 700, unit: 'mcg' },
    'Vitamina B1': { male: 1.2, female: 1.1, unit: 'mg' },
    'Vitamina B2': { male: 1.3, female: 1.1, unit: 'mg' },
    'Vitamina B3': { male: 16, female: 14, unit: 'mg' },
    'Vitamina B5': { male: 5, female: 5, unit: 'mg' },
    'Vitamina B6': { male: 1.3, female: 1.3, unit: 'mg' },
    'Vitamina B7': { male: 30, female: 30, unit: 'mcg' },
    'Vitamina B9': { male: 400, female: 400, unit: 'mcg' },
    'Ácido Fólico': { male: 400, female: 400, unit: 'mcg' },
    'Vitamina B12': { male: 2.4, female: 2.4, unit: 'mcg' },
    'Vitamina C': { male: 90, female: 75, unit: 'mg' },
    'Vitamina D': { male: 15, female: 15, unit: 'mcg' },
    'Vitamina E': { male: 15, female: 15, unit: 'mg' },
    'Vitamina K': { male: 120, female: 90, unit: 'mcg' },
    // Minerals
    'Calcio': { male: 1000, female: 1000, unit: 'mg' },
    'Hierro': { male: 8, female: 18, unit: 'mg' },
    'Magnesio': { male: 400, female: 310, unit: 'mg' },
    'Fósforo': { male: 700, female: 700, unit: 'mg' },
    'Potasio': { male: 3400, female: 2600, unit: 'mg' },
    'Sodio': { male: 1500, female: 1500, unit: 'mg', limit: 2300 }, // Special case for sodium limit
    'Zinc': { male: 11, female: 8, unit: 'mg' },
    'Cobre': { male: 0.9, female: 0.9, unit: 'mg' },
    'Manganeso': { male: 2.3, female: 1.8, unit: 'mg' },
    'Selenio': { male: 55, female: 55, unit: 'mcg' },
    'Yodo': { male: 1500, female: 150, unit: 'mcg' }
};

export const VITAMIN_NAMES = [
    'Vitamina A', 'Vitamina B1', 'Vitamina B2', 'Vitamina B3', 'Vitamina B5', 
    'Vitamina B6', 'Vitamina B7', 'Vitamina B9', 'Ácido Fólico', 'Vitamina B12', 
    'Vitamina C', 'Vitamina D', 'Vitamina E', 'Vitamina K'
];

export const MINERAL_NAMES = [
    'Calcio', 'Hierro', 'Magnesio', 'Fósforo', 'Potasio', 'Sodio', 
    'Zinc', 'Cobre', 'Manganeso', 'Selenio', 'Yodo'
];

const MICRONUTRIENT_UNITS = {
    'Vitamina A': 'mcg',
    'Vitamin A': 'mcg',
    'Vitamina B1': 'mg',
    'Vitamina B2': 'mg',
    'Vitamina B3': 'mg',
    'Vitamina B5': 'mg',
    'Vitamina B6': 'mg',
    'Vitamina B7': 'mcg',
    'Vitamina B9': 'mcg',
    'Ácido Fólico': 'mcg',
    'Folic Acid': 'mcg',
    'Vitamina B12': 'mcg',
    'Vitamina C': 'mg',
    'Vitamin C': 'mg',
    'Vitamina D': 'mcg',
    'Vitamin D': 'mcg',
    'Vitamina E': 'mg',
    'Vitamin E': 'mg',
    'Vitamina K': 'mcg',
    'Vitamin K': 'mcg',
    'Calcio': 'mg',
    'Calcium': 'mg',
    'Hierro': 'mg',
    'Iron': 'mg',
    'Magnesio': 'mg',
    'Magnesium': 'mg',
    'Fósforo': 'mg',
    'Phosphorus': 'mg',
    'Potasio': 'mg',
    'Potassium': 'mg',
    'Sodio': 'mg',
    'Sodium': 'mg',
    'Zinc': 'mg',
    'Cobre': 'mg',
    'Copper': 'mg',
    'Manganeso': 'mg',
    'Manganese': 'mg',
    'Selenio': 'mcg',
    'Selenium': 'mcg',
    'Yodo': 'mcg',
    'Iodine': 'mcg'
};

export function getNutrientUnit(name) {
    if (!name) return 'mg';
    if (name.includes('(') && (name.includes('g') || name.includes('U'))) return ''; // Unit already in name
    
    // Check RDA table first for exact or partial match
    const rdaEntry = NUTRIENT_RDA[name];
    if (rdaEntry) return rdaEntry.unit;

    const lower = name.toLowerCase();
    const entry = Object.entries(MICRONUTRIENT_UNITS).find(([k]) => lower.includes(k.toLowerCase()));
    return entry ? entry[1] : 'mg';
}

export function getNutrientRDA(name, sex = 'male', age = 30) {
    const entry = NUTRIENT_RDA[name];
    if (!entry) return null;

    // Age-based adjustments (simplified)
    let val = sex === 'female' ? entry.female : entry.male;
    
    // Elderly calcium adjustment
    if (name === 'Calcio' && age > 50 && sex === 'female') val = 1200;
    if (name === 'Calcio' && age > 70) val = 1200;

    // Post-menopausal iron adjustment
    if (name === 'Hierro' && age > 50 && sex === 'female') val = 8;

    return { val, unit: entry.unit, limit: entry.limit };
}

export function updateNutrientSuggestions() {
    const vitList = document.getElementById('vitamin-suggestions');
    const minList = document.getElementById('mineral-suggestions');
    if (!vitList || !minList) return;

    // Start with standard names from RDA table
    const vitamins = new Set(VITAMIN_NAMES);
    const minerals = new Set(MINERAL_NAMES);
    
    // Also include any custom names already present in the user's food list
    if (state.foodList) {
        state.foodList.forEach(food => {
            if (food && food.vitamins) {
                Object.keys(food.vitamins).forEach(n => vitamins.add(n));
            }
            if (food && food.minerals) {
                Object.keys(food.minerals).forEach(n => minerals.add(n));
            }
        });
    }

    const populate = (list, set) => {
        list.innerHTML = '';
        Array.from(set).sort().forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            list.appendChild(option);
        });
    };

    populate(vitList, vitamins);
    populate(minList, minerals);
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

export function addNutrientRowToContainer(containerId, name = '', value = '', listId = '') {
    const container = document.getElementById(containerId);
    if (!container) return;
    const row = document.createElement('div');
    row.className = 'nutrient-input-row';
    row.innerHTML = `
        <input type="text" placeholder="Name (e.g. Vit B12)" value="${name}" required class="nutrient-name" ${listId ? `list="${listId}"` : ''}>
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