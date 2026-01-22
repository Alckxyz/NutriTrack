export function parsePastedFood(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    let name = "Nuevo Alimento";
    let brand = "";
    let protein = 0, carbs = 0, fat = 0;
    let baseAmount = 100;
    let defaultUnit = 'g';
    let vitamins = {}, minerals = {}, conversions = [];
    
    let currentSection = null;

    let firstUnitInListFound = false;
    let explicitBaseAmountFound = false;

    lines.forEach((line, index) => {
        if (index === 0 && !line.includes(':')) {
            name = line;
            return;
        }
        
        const lowerLine = line.toLowerCase();
        
        if (lowerLine.startsWith('brand:') || lowerLine.startsWith('marca:')) brand = line.split(':')[1].trim();
        else if (lowerLine.startsWith('protein:')) protein = parseFloat(line.split(':')[1]) || 0;
        else if (lowerLine.startsWith('carbs:')) carbs = parseFloat(line.split(':')[1]) || 0;
        else if (lowerLine.startsWith('fat:')) fat = parseFloat(line.split(':')[1]) || 0;
        else if (lowerLine.startsWith('unit:')) {
            defaultUnit = line.split(':')[1].trim();
            firstUnitInListFound = true; // Si hay una línea explícita de "unit:", no usamos la primera de la lista
        }
        else if (lowerLine.startsWith('amount:') || lowerLine.startsWith('base amount:')) {
            baseAmount = parseFloat(line.split(':')[1]) || 100;
            explicitBaseAmountFound = true;
        }
        else if (lowerLine.includes('vitamin')) currentSection = 'vitamins';
        else if (lowerLine.includes('mineral')) currentSection = 'minerals';
        else if (lowerLine.includes('unit') && lowerLine.endsWith(':')) currentSection = 'units';
        else if (lowerLine.includes('conversion') && lowerLine.endsWith(':')) currentSection = 'units';
        else if (line.includes(':')) {
            const parts = line.split(':').map(s => s.trim());
            const k = parts[0];
            const v = parts[1];
            const val = parseFloat(v);
            if (k && !isNaN(val)) {
                if (currentSection === 'vitamins') vitamins[k] = val;
                else if (currentSection === 'minerals') minerals[k] = val;
                else if (currentSection === 'units') {
                    if (!firstUnitInListFound) {
                        // La primera unidad de la lista se convierte en la Unidad por Defecto
                        defaultUnit = k;
                        // Usamos su peso como la Cantidad de Referencia base
                        if (!explicitBaseAmountFound) baseAmount = val;
                        firstUnitInListFound = true;
                    } else {
                        // El resto entran como conversiones
                        // En el texto pegado, el valor suele indicar cuántas unidades de X equivalen a la referencia
                        // Almacenamos el peso por unidad (grams) y guardamos el valor original para la UI
                        const weightPerUnit = baseAmount / (val || 1);
                        conversions.push({ name: k, grams: weightPerUnit, originalQty: val });
                    }
                }
            } else if (lowerLine.startsWith('name:')) {
                name = v;
            }
        }
    });

    // Simple unit normalization for commonly pasted text
    const norm = defaultUnit.toLowerCase();
    if (norm.includes('cup') || norm.includes('taza')) defaultUnit = 'cup';
    else if (norm.includes('tbsp') || norm.includes('cucharada')) defaultUnit = 'tbsp';
    else if (norm.includes('tsp') || norm.includes('cucharadita')) defaultUnit = 'tsp';
    else if (norm.includes('ml')) defaultUnit = 'ml';
    else if (norm.includes('unit') || norm.includes('unidad')) defaultUnit = 'unit';
    else if (norm.includes('oz') || norm.includes('onza')) defaultUnit = 'oz';
    else if (norm === 'g' || norm === 'gramos' || norm === 'gramo') defaultUnit = 'g';

    return { name, brand, protein, carbs, fat, vitamins, minerals, conversions, baseAmount, defaultUnit };
}

export function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

export function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) toast.remove();
    }, 2000);
}

// removed function getDynamicNutrientsFromContainer() {}
// removed object translations {}
// removed function updateNutrientSuggestions() {}
// removed function t() {}
// removed function updateUILanguage() {}
// removed function addNutrientRowToContainer() {}

export const UNIT_TYPES = {
    G: 'g',
    ML: 'ml',
    KG: 'kg',
    LB: 'lb',
    OZ: 'oz',
    L: 'l',
    CUP: 'cup',
    TBSP: 'tbsp',
    TSP: 'tsp',
    UNIT: 'unit'
};

export const CONVERSION_FACTORS = {
    kg: 1000,
    lb: 453.592,
    oz: 28.3495,
    l: 1000
};

// Helper to calculate amount in base unit (g or ml)
export function convertToBaseAmount(amount, unit) {
    if (CONVERSION_FACTORS[unit]) {
        return amount * CONVERSION_FACTORS[unit];
    }
    return amount;
}