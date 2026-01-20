import { state, saveState, getCurrentMeals } from './state.js';
import * as Utils from './utils.js';
import * as UI from './ui.js';
import { dom } from './dom-elements.js';

export let currentActiveMealId = null;
export let currentSelectedFoodId = null;
export let activeAddTab = 'food'; // 'food' or 'recipes'

export function openAddFoodModal(mealId, refreshCallback) {
    currentActiveMealId = mealId;
    currentSelectedFoodId = null;
    activeAddTab = 'food'; // Default tab
    
    const modalTitle = document.getElementById('modal-title');
    if (modalTitle) modalTitle.textContent = Utils.t('modal_add_food_title', state.language);
    
    dom.confirmAddFoodBtn.textContent = Utils.t('confirm', state.language);
    
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

    setTimeout(() => dom.foodSearch.focus(), 10);
    dom.foodSearch.value = '';
    UI.renderFoodResults(dom.foodResults, '', activeAddTab, (food) => selectFoodForMeal(food));
    dom.foodAmountInput.value = 100;
}

export function renderUnitSelector(food) {
    if (!food) return;
    const isRecipe = food.type === 'recipe';
    const unitDisplay = document.getElementById('food-unit-display');
    const unitHidden = document.getElementById('food-unit');
    
    let unitCode = food.defaultUnit || (isRecipe ? 'unit' : 'g');

    const unitLabel = isRecipe && unitCode === 'unit' 
        ? Utils.t('portions_unit', state.language) 
        : Utils.t('unit_' + unitCode, state.language);
    
    if (unitDisplay) unitDisplay.textContent = unitLabel;
    if (unitHidden) unitHidden.value = unitCode;
}

export function selectFoodForMeal(food) {
    currentSelectedFoodId = food.id;
    const isRecipe = food.type === 'recipe';
    dom.selectedFoodName.textContent = food.name;
    
    // Hint no longer needed as conversions are removed
    dom.defaultConvHint.classList.add('hidden');

    renderUnitSelector(food);

    if (isRecipe) {
        dom.foodAmountInput.value = 1;
    } else {
        dom.foodAmountInput.value = 100;
    }
    
    dom.foodDetailsForm.classList.remove('hidden');
    setTimeout(() => {
        dom.foodAmountInput.focus();
        dom.foodAmountInput.select();
    }, 10);
}

export function confirmAddFood(refreshCallback) {
    const amount = parseFloat(dom.foodAmountInput.value);
    if (isNaN(amount) || amount < 0) return alert('Enter a valid amount');
    if (!currentSelectedFoodId) return alert('Please select a food');
    
    const unit = dom.foodUnitSelector.value;
    const meals = getCurrentMeals();
    const meal = meals.find(m => m && m.id === currentActiveMealId);
    
    if (!meal) {
        dom.foodModal.style.display = 'none';
        return;
    }

    if (!meal.items) meal.items = [];
    meal.items.push({ 
        foodId: currentSelectedFoodId, 
        amount, 
        unit 
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

export function deleteMeal(mealId, refreshCallback) {
    if (confirm(Utils.t('confirm_delete_meal', state.language))) {
        const meals = getCurrentMeals();
        const updatedMeals = meals.filter(m => m.id !== mealId);
        import('./state.js').then(m => {
            m.setCurrentMeals(updatedMeals);
            saveState(refreshCallback);
        });
    }
}

export function renameMeal(mealId, refreshCallback) {
    const meals = getCurrentMeals();
    const meal = meals.find(m => m && m.id === mealId);
    if (!meal) return;
    const newName = prompt(Utils.t('prompt_rename_meal', state.language), meal.name);
    if (newName && newName.trim() !== '') {
        meal.name = newName.trim();
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