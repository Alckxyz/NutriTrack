import { state, saveState, getCurrentMeals } from './state.js';
import * as Utils from './utils.js';
import * as UI from './ui.js';
import { dom } from './dom-elements.js';

export let currentActiveMealId = null;
export let currentSelectedFoodId = null;

export function openAddFoodModal(mealId, refreshCallback) {
    currentActiveMealId = mealId;
    currentSelectedFoodId = null;
    document.getElementById('modal-title').textContent = Utils.t('modal_add_food_title', state.language);
    dom.confirmAddFoodBtn.textContent = Utils.t('confirm', state.language);
    document.getElementById('food-search-section').classList.remove('hidden');
    dom.foodDetailsForm.classList.add('hidden');
    dom.foodModal.style.display = 'block';
    setTimeout(() => dom.foodSearch.focus(), 10);
    dom.foodSearch.value = '';
    UI.renderFoodResults(dom.foodResults, '', (food) => selectFoodForMeal(food));
    dom.foodAmountInput.value = 100;
}

export function selectFoodForMeal(food) {
    currentSelectedFoodId = food.id;
    const isRecipe = food.type === 'recipe';
    const label = document.querySelector('label[for="food-amount"]');
    dom.selectedFoodName.textContent = food.name;
    
    if (isRecipe) {
        label.textContent = Utils.t('recipe_portions_label', state.language);
        dom.foodAmountInput.value = 1;
    } else {
        label.textContent = Utils.t('amount_label', state.language);
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
    if (!amount || amount <= 0) return alert('Enter a valid amount');
    if (!currentSelectedFoodId) return alert('Please select a food');
    
    const meals = getCurrentMeals();
    const meal = meals.find(m => m && m.id === currentActiveMealId);
    
    if (!meal) {
        dom.foodModal.style.display = 'none';
        return;
    }

    if (!meal.items) meal.items = [];
    meal.items.push({ foodId: currentSelectedFoodId, amount });
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
        if (!isNaN(newVal) && newVal > 0) {
            const meals = getCurrentMeals();
            const meal = meals.find(m => m && m.id === mealId);
            meal.items[itemIdx].amount = newVal;
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