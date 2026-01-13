import Sortable from 'sortablejs';
import { state, calculateCalories, calculateMealNutrients, saveState, getCurrentMeals, setCurrentMeals } from './state.js';
import { t } from './utils.js';

const mealsListEl = document.getElementById('meals-list');
const totalCaloriesEl = document.getElementById('total-calories');
const totalProteinEl = document.getElementById('total-protein');
const totalCarbsEl = document.getElementById('total-carbs');
const totalFatEl = document.getElementById('total-fat');
const totalMicrosEl = document.getElementById('total-micros');

export function renderMeals(options = {}) {
    const { onAddFood, onRenameMeal, onDeleteMeal, onRemoveItem, onInlineEdit, onCopyMeal, onPasteMeal } = options;
    mealsListEl.innerHTML = '';
    
    const currentMeals = getCurrentMeals();
    
    currentMeals.forEach(meal => {
        if (!meal) return;
        const mealCard = document.createElement('div');
        mealCard.className = 'meal-card';
        mealCard.dataset.id = meal.id;

        const mealSummary = calculateMealNutrients(meal);

        let microsHtml = '';
        [...Object.entries(mealSummary.vitamins), ...Object.entries(mealSummary.minerals)].forEach(([name, val]) => {
            if (val > 0) {
                microsHtml += `<span class="nutrient-badge micro">${name}: ${val.toFixed(1)}</span>`;
            }
        });

        mealCard.innerHTML = `
            <div class="meal-header">
                <div class="meal-title-group">
                    <h3><span class="drag-handle">☰</span> ${meal.name}</h3>
                    <div class="meal-nutrients-grid">
                        <span class="nutrient-badge kcal">${Math.round(mealSummary.calories)} kcal</span>
                        <span class="nutrient-badge">P: ${mealSummary.protein.toFixed(1)}g</span>
                        <span class="nutrient-badge">C: ${mealSummary.carbs.toFixed(1)}g</span>
                        <span class="nutrient-badge">F: ${mealSummary.fat.toFixed(1)}g</span>
                        ${microsHtml}
                    </div>
                </div>
                <div class="meal-header-actions">
                    <button class="edit-btn-mini rename-meal-trigger" title="${t('rename_btn', state.language)}">✏️</button>
                    <button class="edit-btn-mini copy-meal-trigger" title="${t('copy_btn', state.language)}">📋</button>
                    <button class="edit-btn-mini paste-meal-trigger ${!state.clipboard ? 'hidden' : ''}" title="${t('paste_btn', state.language)}">📥</button>
                    <button class="delete-btn delete-meal-trigger" title="${t('delete_btn', state.language)}">🗑️</button>
                </div>
            </div>
            <div class="meal-items" data-meal-id="${meal.id}">
                ${(meal.items || []).map((item, idx) => {
                    if (!item) return '';
                    let food = state.foodList.find(f => f && f.id === item.foodId);
                    if (!food) return '';
                    const isRecipe = food.type === 'recipe';
                    const ratio = isRecipe ? item.amount : (item.amount / 100);
                    const foodKcal = calculateCalories(food); // calculateCalories returns per unit (100g or 1 portion)
                    
                    let foodMicros = [];
                    if (food.vitamins) Object.entries(food.vitamins).forEach(([n, v]) => foodMicros.push(`${n}: ${(v * ratio).toFixed(1)}`));
                    if (food.minerals) Object.entries(food.minerals).forEach(([n, v]) => foodMicros.push(`${n}: ${(v * ratio).toFixed(1)}`));

                    const unit = isRecipe ? '' : 'g';

                    return `
                        <div class="meal-item" data-index="${idx}">
                            <div class="item-info">
                                <div class="item-name">${food.name} ${isRecipe ? `<small style="color:var(--secondary); font-size:0.6rem; vertical-align:middle; border:1px solid var(--secondary); padding:0 2px; border-radius:2px;">${t('recipe_badge', state.language)}</small>` : ''}</div>
                                <div class="item-meta">
                                    <span><span class="editable-amount" title="Click to edit quantity" data-meal-id="${meal.id}" data-index="${idx}">${item.amount}</span>${unit} - <strong>${Math.round(foodKcal * ratio)} kcal</strong></span>
                                    <div class="item-nutrients-mini">
                                        P: ${(food.protein * ratio).toFixed(1)}g | 
                                        C: ${(food.carbs * ratio).toFixed(1)}g | 
                                        F: ${(food.fat * ratio).toFixed(1)}g
                                        ${foodMicros.length > 0 ? `<br><span class="micro-text">${foodMicros.join(' | ')}</span>` : ''}
                                    </div>
                                </div>
                            </div>
                            <div class="item-actions">
                                <button class="delete-btn remove-item-trigger" data-meal-id="${meal.id}" data-index="${idx}" title="Remove item">×</button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="meal-footer">
                <button class="add-btn add-food-trigger" data-meal-id="${meal.id}">${t('add_food_btn', state.language)}</button>
            </div>
        `;

        // Event delegation for the card buttons
        mealCard.querySelector('.rename-meal-trigger').onclick = () => onRenameMeal(meal.id);
        mealCard.querySelector('.copy-meal-trigger').onclick = () => onCopyMeal(meal.id);
        const pasteBtn = mealCard.querySelector('.paste-meal-trigger');
        if (pasteBtn) pasteBtn.onclick = () => onPasteMeal(meal.id);
        mealCard.querySelector('.delete-meal-trigger').onclick = () => onDeleteMeal(meal.id);
        mealCard.querySelector('.add-food-trigger').onclick = () => onAddFood(meal.id);
        mealCard.querySelectorAll('.remove-item-trigger').forEach(btn => {
            btn.onclick = () => onRemoveItem(btn.dataset.mealId, parseInt(btn.dataset.index));
        });
        mealCard.querySelectorAll('.editable-amount').forEach(span => {
            span.onclick = (e) => onInlineEdit(e, span.dataset.mealId, parseInt(span.dataset.index));
        });

        mealsListEl.appendChild(mealCard);

        new Sortable(mealCard.querySelector('.meal-items'), {
            group: 'foods',
            animation: 150,
            onAdd: (evt) => {
                const sourceMealId = evt.from.dataset.mealId;
                const targetMealId = evt.to.dataset.mealId;
                const meals = getCurrentMeals();
                const sourceMeal = meals.find(m => m.id === sourceMealId);
                const targetMeal = meals.find(m => m.id === targetMealId);
                const [movedItem] = sourceMeal.items.splice(evt.oldIndex, 1);
                targetMeal.items.splice(evt.newIndex, 0, movedItem);
                saveState(() => renderAll(options));
            },
            onUpdate: (evt) => {
                const mealId = evt.from.dataset.mealId;
                const meals = getCurrentMeals();
                const meal = meals.find(m => m.id === mealId);
                const [movedItem] = meal.items.splice(evt.oldIndex, 1);
                meal.items.splice(evt.newIndex, 0, movedItem);
                saveState(() => renderAll(options));
            }
        });
    });

    new Sortable(mealsListEl, {
        animation: 150,
        handle: '.drag-handle',
        onEnd: (evt) => {
            const meals = getCurrentMeals();
            const [movedMeal] = meals.splice(evt.oldIndex, 1);
            meals.splice(evt.newIndex, 0, movedMeal);
            saveState(() => renderAll(options));
        }
    });
}

export function updateSummary() {
    let totals = { calories: 0, protein: 0, carbs: 0, fat: 0, vitamins: {}, minerals: {} };
    const currentMeals = getCurrentMeals();
    currentMeals.forEach(meal => {
        const m = calculateMealNutrients(meal);
        totals.calories += m.calories;
        totals.protein += m.protein;
        totals.carbs += m.carbs;
        totals.fat += m.fat;
        Object.entries(m.vitamins).forEach(([n, v]) => totals.vitamins[n] = (totals.vitamins[n] || 0) + v);
        Object.entries(m.minerals).forEach(([n, v]) => totals.minerals[n] = (totals.minerals[n] || 0) + v);
    });

    totalCaloriesEl.textContent = Math.round(totals.calories);
    totalProteinEl.textContent = totals.protein.toFixed(1);
    totalCarbsEl.textContent = totals.carbs.toFixed(1);
    totalFatEl.textContent = totals.fat.toFixed(1);

    let microsHtml = '';
    [...Object.entries(totals.vitamins), ...Object.entries(totals.minerals)].forEach(([name, val]) => {
        if (val > 0) {
            microsHtml += `<div class="micro-badge-large"><span class="label">${name}</span><span class="value">${val.toFixed(1)}</span></div>`;
        }
    });
    totalMicrosEl.innerHTML = microsHtml ? `<h3>${t('total_micros', state.language)}</h3>` + microsHtml : '';
}

export function renderLibraryList(container, searchInput, sortSelect, onEdit, onDelete) {
    const query = searchInput.value.toLowerCase();
    const sortVal = sortSelect.value;
    // We only show basic foods here, or everything? Usually "Manage Food List" implies the basic database items.
    // However, if we want them unified, let's filter out recipes from the general list if needed, 
    // or label them. Let's show everything but label recipes.
    let filtered = state.foodList.filter(f => f && f.name && f.name.toLowerCase().includes(query));
    
    filtered.sort((a, b) => {
        if (sortVal === 'name') return a.name.localeCompare(b.name);
        if (sortVal === 'newest') return (b.created_at || 0) - (a.created_at || 0);
        if (sortVal === 'edited') return (b.updated_at || 0) - (a.updated_at || 0);
        return 0;
    });
    
    container.innerHTML = '';
    filtered.forEach(food => {
        const item = document.createElement('div');
        item.className = 'library-item';
        const foodKcal = Math.round(calculateCalories(food));
        const isRecipe = food.type === 'recipe';
        const isOwner = state.user && food.ownerId === state.user.uid;

        item.innerHTML = `
            <div class="library-item-info">
                <strong>${food.name}</strong> ${isRecipe ? `<small style="color:var(--secondary); border:1px solid var(--secondary); padding:0 2px; border-radius:2px; font-size:0.6rem;">${t('recipe_badge', state.language)}</small>` : ''}<br>
                <small>${foodKcal} kcal | P: ${food.protein.toFixed(1)}g | C: ${food.carbs.toFixed(1)}g | F: ${food.fat.toFixed(1)}g</small>
            </div>
            <div class="library-item-actions ${isOwner ? '' : 'hidden'}">
                <button class="edit-btn">${t('edit_btn', state.language)}</button>
                <button class="delete-btn">${t('delete_btn', state.language)}</button>
            </div>
        `;
        item.querySelector('.edit-btn').onclick = () => onEdit(food.id);
        item.querySelector('.delete-btn').onclick = () => onDelete(food.id);
        container.appendChild(item);
    });
}

export function renderFoodResults(container, query, onSelect) {
    container.innerHTML = '';
    const queryLower = query.toLowerCase();
    
    // Filter results
    const results = state.foodList.filter(f => f && f.name && f.name.toLowerCase().includes(queryLower));
    
    // Separate recipes and standard foods for display order
    const recipes = results.filter(f => f.type === 'recipe');
    const standardFoods = results.filter(f => f.type !== 'recipe');

    recipes.forEach(recipe => {
        const div = document.createElement('div');
        div.className = 'food-result-item';
        div.style.borderLeft = '3px solid var(--secondary)';
        div.innerHTML = `<strong>${recipe.name}</strong> <small style="color:var(--secondary)">(${t('recipe_badge', state.language)})</small> <span style="font-size:0.8rem; color:#888">(${Math.round(calculateCalories(recipe))} kcal/${t('portions_unit', state.language)})</span>`;
        div.onclick = () => onSelect(recipe);
        container.appendChild(div);
    });

    standardFoods.forEach(food => {
        const div = document.createElement('div');
        div.className = 'food-result-item';
        div.innerHTML = `<strong>${food.name}</strong> <span style="font-size:0.8rem; color:#888">(${Math.round(calculateCalories(food))} kcal/100g)</span>`;
        div.onclick = () => onSelect(food);
        container.appendChild(div);
    });
}

export function renderRecipeLibraryList(container, query, onEdit, onDelete) {
    const queryLower = query.toLowerCase();
    let filtered = state.foodList.filter(f => f && f.type === 'recipe' && f.name && f.name.toLowerCase().includes(queryLower));
    
    container.innerHTML = '';
    filtered.forEach(recipe => {
        const item = document.createElement('div');
        item.className = 'library-item';
        const kcal = Math.round(calculateCalories(recipe));
        const isOwner = state.user && recipe.ownerId === state.user.uid;

        item.innerHTML = `
            <div class="library-item-info">
                <strong>${recipe.name}</strong><br>
                <small>${kcal} kcal/${t('portions_unit', state.language)} | P: ${recipe.protein.toFixed(1)}g | C: ${recipe.carbs.toFixed(1)}g | F: ${recipe.fat.toFixed(1)}g</small>
            </div>
            <div class="library-item-actions ${isOwner ? '' : 'hidden'}">
                <button class="edit-btn">${t('edit_btn', state.language)}</button>
                <button class="delete-btn">${t('delete_btn', state.language)}</button>
            </div>
        `;
        item.querySelector('.edit-btn').onclick = () => onEdit(recipe.id);
        item.querySelector('.delete-btn').onclick = () => onDelete(recipe.id);
        container.appendChild(item);
    });
}

export function renderAll(options) {
    renderMeals(options);
    updateSummary();
}