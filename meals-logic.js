import { state, saveState, getCurrentMeals } from './state.js';
import { confirmAction } from './utils.js';
import * as Utils from './utils.js';
import * as UI from './ui.js';
import { t, tUnit } from './i18n.js';
import { dom } from './dom-elements.js';
import { getNutrientUnit } from './nutrient-utils.js';

export let currentActiveMealId = null;
export let currentSelectedFoodId = null;
export let activeAddTab = 'food'; // 'food' or 'recipes'

export function initMealsUI(refreshUI) {
    dom.foodSearch.oninput = (e) => UI.renderFoodResults(dom.foodResults, e.target.value, activeAddTab, selectFoodForMeal);
    
    dom.foodAmountInput.onkeydown = (e) => {
        if (e.key === 'Enter') dom.confirmAddFoodBtn.click();
    };

    dom.confirmAddFoodBtn.onclick = () => {
        if (currentActiveMealId === 'TEMP_RECIPE') {
            const amount = parseFloat(dom.foodAmountInput.value);
            if (!amount || amount <= 0) return;
            import('./recipes-logic.js').then(m => m.handleIngredientSelection(currentSelectedFoodId, amount));
        } else {
            confirmAddFood(refreshUI);
        }
    };

    dom.addMealBtn.onclick = () => {
        dom.mealPromptInput.value = '';
        dom.mealPromptModal.style.display = 'block';
        setTimeout(() => dom.mealPromptInput.focus(), 10);
    };

    dom.mealPromptInput.onkeydown = (e) => {
        if (e.key === 'Enter') dom.confirmMealBtn.click();
    };

    dom.confirmMealBtn.onclick = () => {
        const name = dom.mealPromptInput.value.trim();
        if (!name) return;
        const meals = getCurrentMeals();
        meals.push({ id: 'm' + Date.now(), name, items: [] });
        dom.mealPromptModal.style.display = 'none';
        saveState(refreshUI);
    };
}

export function openAddFoodModal(mealId, refreshCallback) {
    currentActiveMealId = mealId;
    currentSelectedFoodId = null;
    activeAddTab = 'food'; // Default tab
    
    const modalTitle = document.getElementById('modal-title');
    if (modalTitle) modalTitle.textContent = t('modal_add_food_title', state.language);
    
    dom.confirmAddFoodBtn.textContent = t('confirm', state.language);
    
    const searchSection = document.getElementById('food-search-section');
    if (searchSection) searchSection.classList.remove('hidden');
    
    dom.foodDetailsForm.classList.add('hidden');
    dom.foodModal.style.display = 'block';
    
    // Setup tab listeners
    const foodTab = document.getElementById('tab-btn-food');
    const recipeTab = document.getElementById('tab-btn-recipes');
    
    const updateTabsUI = () => {
        foodTab.classList.toggle('active', activeAddTab === 'food');
        recipeTab.classList.toggle('active', activeAddTab === 'recipes');
        UI.renderFoodResults(dom.foodResults, dom.foodSearch.value, activeAddTab, (food) => selectFoodForMeal(food));
    };

    if (foodTab && recipeTab) {
        foodTab.onclick = () => { activeAddTab = 'food'; updateTabsUI(); };
        recipeTab.onclick = () => { activeAddTab = 'recipes'; updateTabsUI(); };
        updateTabsUI();
    }

    const unitSelector = document.getElementById('food-unit-selector');
    if (unitSelector) {
        unitSelector.onchange = () => {
            const food = state.foodList.find(f => f.id === currentSelectedFoodId);
            if (!food) return;
            const val = unitSelector.value;
            const amountLabel = document.getElementById('food-amount-label');
            if (val === 'g' || val === 'ml') {
                dom.foodAmountInput.value = 100;
                if (amountLabel) amountLabel.textContent = t('amount_label', state.language);
            } else {
                dom.foodAmountInput.value = 1;
                if (amountLabel) amountLabel.textContent = t('amount_label_generic', state.language);
            }
        };
    }

    setTimeout(() => dom.foodSearch.focus(), 10);
    dom.foodSearch.value = '';
    UI.renderFoodResults(dom.foodResults, '', activeAddTab, (food) => selectFoodForMeal(food));
    dom.foodAmountInput.value = 100;
    const amountLabel = document.getElementById('food-amount-label');
    if (amountLabel) amountLabel.textContent = t('amount_label', state.language);
}

export function renderUnitSelector(food) {
    if (!food) return;
    const selector = document.getElementById('food-unit-selector');
    if (!selector) return;

    selector.innerHTML = '';
    const isRecipe = food.type === 'recipe';
    
    // Add default unit
    const defaultUnitCode = food.defaultUnit || (isRecipe ? 'unit' : 'g');
    const defaultOption = document.createElement('option');
    defaultOption.value = defaultUnitCode;
    defaultOption.textContent = tUnit(defaultUnitCode, state.language, isRecipe);
    selector.appendChild(defaultOption);

    // Add fixed standard conversions based on base unit
    if (defaultUnitCode === 'g') {
        ['kg', 'oz', 'lb'].forEach(u => {
            const opt = document.createElement('option');
            opt.value = u;
            opt.textContent = tUnit(u, state.language);
            selector.appendChild(opt);
        });
    } else if (defaultUnitCode === 'ml') {
        const opt = document.createElement('option');
        opt.value = 'l';
        opt.textContent = tUnit('l', state.language);
        selector.appendChild(opt);
    }

    // Add custom conversions from state.foodConversions
    const customConversions = state.foodConversions[food.id] || [];
    customConversions.forEach(conv => {
        const opt = document.createElement('option');
        opt.value = `custom:${conv.grams}:${conv.name}`;
        opt.textContent = conv.name;
        selector.appendChild(opt);
    });
}

export async function selectFoodForMeal(food) {
    currentSelectedFoodId = food.id;
    const isRecipe = food.type === 'recipe';
    dom.selectedFoodName.textContent = food.name;
    
    // Hint no longer needed as conversions are removed
    dom.defaultConvHint.classList.add('hidden');

    // Fetch latest public conversions to ensure the selector is up to date
    await import('./state.js').then(m => m.fetchFoodConversions(food.id));
    renderUnitSelector(food);

    if (isRecipe) {
        dom.foodAmountInput.value = 1;
    } else {
        dom.foodAmountInput.value = 100;
    }
    
    // Switch views to show a dedicated "quantity window"
    const searchSection = document.getElementById('food-search-section');
    if (searchSection) searchSection.classList.add('hidden');
    dom.foodDetailsForm.classList.remove('hidden');

    // Setup back button to return to search
    const backBtn = document.getElementById('back-to-search-btn');
    if (backBtn) {
        backBtn.onclick = () => {
            dom.foodDetailsForm.classList.add('hidden');
            if (searchSection) searchSection.classList.remove('hidden');
        };
    }

    setTimeout(() => {
        dom.foodAmountInput.focus();
        dom.foodAmountInput.select();
    }, 10);
}

export function confirmAddFood(refreshCallback) {
    const amount = parseFloat(dom.foodAmountInput.value);
    if (isNaN(amount) || amount < 0) return alert('Enter a valid amount');
    if (!currentSelectedFoodId) return alert('Please select a food');
    
    const selector = document.getElementById('food-unit-selector');
    const unit = selector ? selector.value : 'g';
    const meals = getCurrentMeals();
    const meal = meals.find(m => m && m.id === currentActiveMealId);
    
    if (!meal) {
        dom.foodModal.style.display = 'none';
        return;
    }

    const food = state.foodList.find(f => f.id === currentSelectedFoodId);
    if (!food) {
        dom.foodModal.style.display = 'none';
        return;
    }

    if (!meal.items) meal.items = [];
    
    // Create a snapshot of the food data to preserve nutrients even if the food is deleted from library
    const snapshot = {
        name: food.name,
        brand: food.brand || '',
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        vitamins: food.vitamins || {},
        minerals: food.minerals || {},
        baseAmount: food.baseAmount || (food.defaultUnit === 'g' || food.defaultUnit === 'ml' ? 100 : 1),
        defaultUnit: food.defaultUnit || 'g',
        type: food.type || 'standard',
        conversions: food.conversions || [],
        items: food.items || [] // Store ingredients if it's a recipe
    };

    meal.items.push({ 
        foodId: currentSelectedFoodId, 
        amount, 
        unit,
        snapshot
    });
    dom.foodModal.style.display = 'none';
    saveState(refreshCallback);
}

export function startInlineEdit(event, mealId, itemIdx, refreshCallback) {
    event.stopPropagation();
    const span = event.target;
    const currentVal = span.textContent;
    const input = document.createElement('input');
    input.type = 'number';
    input.value = currentVal;
    input.className = 'inline-amount-input';
    
    const save = () => {
        const newVal = parseFloat(input.value);
        if (!isNaN(newVal) && newVal >= 0) {
            const meals = getCurrentMeals();
            const meal = meals.find(m => m && m.id === mealId);
            const item = meal.items[itemIdx];
            item.amount = newVal;
            saveState(refreshCallback);
        } else {
            refreshCallback();
        }
    };

    input.onblur = save;
    input.onkeydown = (e) => {
        if (e.key === 'Enter') input.blur();
        if (e.key === 'Escape') {
            input.onblur = null;
            refreshCallback();
        }
    };

    span.replaceWith(input);
    input.focus();
    input.select();
}

export function removeItemFromMeal(mealId, index, refreshCallback) {
    const meals = getCurrentMeals();
    const meal = meals.find(m => m && m.id === mealId);
    meal.items.splice(index, 1);
    saveState(refreshCallback);
}

export async function deleteMeal(mealId, refreshCallback) {
    if (await confirmAction(t('confirm_delete_meal', state.language))) {
        const meals = getCurrentMeals();
        const updatedMeals = meals.filter(m => m.id !== mealId);
        import('./state.js').then(m => {
            m.setCurrentMeals(updatedMeals);
            saveState(refreshCallback);
        });
    }
}

export function renameMeal(mealId, newName, refreshCallback) {
    const meals = getCurrentMeals();
    const meal = meals.find(m => m && m.id === mealId);
    if (!meal) return;
    if (newName !== meal.name) {
        meal.name = newName;
        saveState(refreshCallback);
    }
}

export function copyMeal(mealId, refreshCallback) {
    const meals = getCurrentMeals();
    const meal = meals.find(m => m && m.id === mealId);
    if (meal && meal.items.length > 0) {
        state.clipboard = JSON.parse(JSON.stringify(meal.items));
        refreshCallback();
    }
}

export function pasteMeal(mealId, refreshCallback) {
    if (!state.clipboard) return;
    const meals = getCurrentMeals();
    const meal = meals.find(m => m && m.id === mealId);
    if (meal) {
        const itemsToPaste = JSON.parse(JSON.stringify(state.clipboard));
        meal.items.push(...itemsToPaste);
        saveState(refreshCallback);
    }
}

export function setCurrentActiveMealId(id) {
    currentActiveMealId = id;
}

export function showRecipeDetails(mealId, itemIdx) {
    const meals = getCurrentMeals();
    const meal = meals.find(m => m.id === mealId);
    if (!meal || !meal.items[itemIdx]) return;
    
    const item = meal.items[itemIdx];
    const food = state.foodList.find(f => f.id === item.foodId) || item.snapshot;
    
    if (!food || food.type !== 'recipe') return;

    dom.recipeDetailsTitle.textContent = food.name;
    dom.recipeDetailsList.innerHTML = '';
    
    const ingredients = food.items || [];
    if (ingredients.length === 0) {
        dom.recipeDetailsList.innerHTML = `<div style="padding:15px; text-align:center; color:var(--text-light);">${state.language === 'es' ? 'No hay ingredientes registrados.' : 'No ingredients registered.'}</div>`;
    } else {
        ingredients.forEach(ing => {
            const ingFood = state.foodList.find(f => f.id === ing.foodId) || ing.snapshot;
            if (!ingFood) return;

            const isSubRecipe = ingFood.type === 'recipe';
            const baseAmount = ingFood.baseAmount || (ingFood.defaultUnit === 'g' || ingFood.defaultUnit === 'ml' ? 100 : 1);
            const ratio = isSubRecipe ? (ing.amount || 0) : (ing.amount / baseAmount);
            
            const protein = (ingFood.protein || 0) * ratio;
            const carbs = (ingFood.carbs || 0) * ratio;
            const fat = (ingFood.fat || 0) * ratio;
            const kcal = (protein * 4) + (carbs * 4) + (fat * 9);

            let micros = [];
            const visibleList = state.visibleMicros || [];
            if (ingFood.vitamins) Object.entries(ingFood.vitamins).forEach(([n, v]) => {
                if (visibleList.includes(n)) micros.push(`${n}: ${(v * ratio).toFixed(1)}${getNutrientUnit(n)}`);
            });
            if (ingFood.minerals) Object.entries(ingFood.minerals).forEach(([n, v]) => {
                if (visibleList.includes(n)) micros.push(`${n}: ${(v * ratio).toFixed(1)}${getNutrientUnit(n)}`);
            });

            const row = document.createElement('div');
            row.className = 'meal-item';
            row.style.minHeight = 'auto';
            row.style.padding = '10px 12px';
            row.innerHTML = `
                <div class="item-info">
                    <div class="item-name" style="font-size: 0.85rem; font-weight: 600;">
                        ${ingFood.name}
                        ${isSubRecipe ? `<small style="color:var(--secondary); font-size:0.6rem; border:1px solid var(--secondary); padding:0 2px; border-radius:2px; margin-left:4px;">${t('recipe_badge', state.language)}</small>` : ''}
                    </div>
                    <div class="item-meta">
                        <span style="font-size: 0.75rem;">
                            <strong>${ing.amount}${isSubRecipe ? ' ' + t('portions_unit', state.language) : 'g'}</strong> - 
                            <span style="color: var(--primary)">${Math.round(kcal)} kcal</span>
                        </span>
                        <div class="item-nutrients-mini" style="font-size: 0.7rem; color: var(--text-light); margin-top: 2px;">
                            P: ${protein.toFixed(1)}g | C: ${carbs.toFixed(1)}g | G: ${fat.toFixed(1)}g
                            ${micros.length > 0 ? `<br><span class="micro-text" style="color: #81c784; font-style: italic; font-size: 0.65rem; display: block; margin-top: 2px;">${micros.join(' | ')}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
            dom.recipeDetailsList.appendChild(row);
        });
    }

    dom.recipeDetailsModal.style.display = 'block';
    
    const closeBtn = dom.recipeDetailsModal.querySelector('.close-details-btn');
    if (closeBtn) {
        closeBtn.onclick = () => dom.recipeDetailsModal.style.display = 'none';
    }
}