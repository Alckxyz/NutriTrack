export function parsePastedFood(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    let name = "Nuevo Alimento";
    let protein = 0, carbs = 0, fat = 0;
    let baseAmount = 100;
    let defaultUnit = 'g';
    let vitamins = {}, minerals = {}, conversions = [];
    
    let currentSection = null;

    lines.forEach((line, index) => {
        if (index === 0 && !line.includes(':')) {
            name = line;
            return;
        }
        
        const lowerLine = line.toLowerCase();
        
        if (lowerLine.startsWith('protein:')) protein = parseFloat(line.split(':')[1]) || 0;
        else if (lowerLine.startsWith('carbs:')) carbs = parseFloat(line.split(':')[1]) || 0;
        else if (lowerLine.startsWith('fat:')) fat = parseFloat(line.split(':')[1]) || 0;
        else if (lowerLine.startsWith('unit:')) defaultUnit = line.split(':')[1].trim().toLowerCase();
        else if (lowerLine.startsWith('amount:') || lowerLine.startsWith('base amount:')) baseAmount = parseFloat(line.split(':')[1]) || 100;
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
                else if (currentSection === 'units') conversions.push({ name: k, grams: val });
            } else if (lowerLine.startsWith('name:')) {
                name = v;
            }
        }
    });

    // Simple unit normalization for commonly pasted text
    if (defaultUnit.includes('cup') || defaultUnit.includes('taza')) defaultUnit = 'cup';
    else if (defaultUnit.includes('tbsp') || defaultUnit.includes('cucharada')) defaultUnit = 'tbsp';
    else if (defaultUnit.includes('tsp') || defaultUnit.includes('cucharadita')) defaultUnit = 'tsp';
    else if (defaultUnit.includes('ml')) defaultUnit = 'ml';
    else if (defaultUnit.includes('unit') || defaultUnit.includes('unidad')) defaultUnit = 'unit';
    else if (defaultUnit.includes('oz') || defaultUnit.includes('onza')) defaultUnit = 'oz';
    else if (defaultUnit.includes('g')) defaultUnit = 'g';

    return { name, protein, carbs, fat, vitamins, minerals, conversions, baseAmount, defaultUnit };
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

// removed function getDynamicNutrientsFromContainer() {}
// removed object translations {}
// removed function updateNutrientSuggestions() {}
// removed function t() {}
// removed function updateUILanguage() {}
// removed function addNutrientRowToContainer() {}

export const UNIT_TYPES = {
    G: 'g',
    ML: 'ml',
    CUP: 'cup',
    TBSP: 'tbsp',
    TSP: 'tsp',
    UNIT: 'unit',
    OZ: 'oz'
};

// Helper to calculate grams from oz if needed
export function calculateGramsFromUnit(food, amount, unit) {
    if (unit === UNIT_TYPES.G || unit === UNIT_TYPES.ML) return amount;
    if (unit === UNIT_TYPES.OZ) return amount * 28.35;
    return amount; // Fallback
}