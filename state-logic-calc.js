import { state } from './state-base.js';
import { t } from './i18n.js';

export function calculateCalories(food) {
    if (!food) return 0;
    const p = food.protein || 0;
    const c = food.carbs || 0;
    const f = food.fat || 0;
    return (p * 4) + (c * 4) + (f * 9);
}

export function calculateMealNutrients(meal) {
    const summary = { 
        calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0,
        vitamins: {}, minerals: {} 
    };

    if (!meal || !meal.items) return summary;

    meal.items.forEach(item => {
        if (!item || !item.foodId) return;
        let food = state.foodList.find(f => f && f.id === item.foodId);
        
        if (!food) {
            if (item.snapshot) {
                // Use snapshot but mark as deleted
                food = { ...item.snapshot, name: `${t('deleted_badge', state.language)}: ${item.snapshot.name || 'Alimento'}` };
            } else {
                // If no snapshot, use placeholder
                food = { name: t('deleted_badge', state.language), protein: 0, carbs: 0, fat: 0, vitamins: {}, minerals: {} };
            }
        }
        
        const isRecipe = food.type === 'recipe';
        const unit = item.unit || food.defaultUnit || 'g';
        
        let ratio;
        const baseUnit = food.defaultUnit || 'g';
        
        if (unit.startsWith('custom:')) {
            const [_, grams, label] = unit.split(':');
            const weightPerUnit = parseFloat(grams) || 0;
            const defaultBase = (baseUnit === 'g' || baseUnit === 'ml') ? 100 : 1;
            const baseAmount = food.baseAmount || defaultBase;
            ratio = (item.amount * weightPerUnit) / baseAmount;
        } else {
            const conversionFactors = { kg: 1000, lb: 453.592, oz: 28.3495, l: 1000 };
            const factor = conversionFactors[unit] || 1;
            const amountInBase = item.amount * factor;
            
            const defaultBase = (baseUnit === 'g' || baseUnit === 'ml') ? 100 : 1;
            const baseAmount = food.baseAmount || defaultBase;
            ratio = isRecipe ? (amountInBase || 0) : (amountInBase / baseAmount);
        }
        const foodKcal = calculateCalories(food);
        
        summary.calories += (foodKcal * ratio);
        summary.protein += ((food.protein || 0) * ratio);
        summary.carbs += ((food.carbs || 0) * ratio);
        summary.fat += ((food.fat || 0) * ratio);
        summary.fiber += ((food.fiber || 0) * ratio);

        if (food.vitamins) {
            Object.entries(food.vitamins).forEach(([name, val]) => {
                summary.vitamins[name] = (summary.vitamins[name] || 0) + (val * ratio);
            });
        }
        if (food.minerals) {
            Object.entries(food.minerals).forEach(([name, val]) => {
                summary.minerals[name] = (summary.minerals[name] || 0) + (val * ratio);
            });
        }
    });

    return summary;
}