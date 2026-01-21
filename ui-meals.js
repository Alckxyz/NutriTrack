import Sortable from 'sortablejs';
import { state, calculateCalories, calculateMealNutrients, saveState, getCurrentMeals } from './state.js';
import { t, tUnit } from './i18n.js';

export function renderMeals(options = {}) {
    const mealsListEl = document.getElementById('meals-list');
    if (!mealsListEl) return;
    const { onAddFood, onRenameMeal, onDeleteMeal, onRemoveItem, onInlineEdit, onCopyMeal, onPasteMeal, onRenderAll } = options;
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
            if (val > 0) microsHtml += `<span class="nutrient-badge micro">${name}: ${val.toFixed(1)}</span>`;
        });
        mealCard.innerHTML = `
            <div class="meal-header">
                <div class="meal-title-group">
                    <h3>${meal.name}</h3>
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
                    <span class="drag-handle" title="Drag to reorder meals">☰</span>
                </div>
            </div>
            <div class="meal-items" data-meal-id="${meal.id}">
                ${(meal.items || []).map((item, idx) => {
                    let food = state.foodList.find(f => f && f.id === item.foodId);
                    let isDeleted = false;
                    if (!food) {
                        if (item.snapshot) {
                            food = item.snapshot;
                            isDeleted = true;
                        } else {
                            return '';
                        }
                    }
                    const isRecipe = food.type === 'recipe';
                    const unitCode = item.unit || (isRecipe ? 'unit' : 'g');
                    
                    let unitLabel = '';
                    let ratio = 0;

                    if (unitCode.startsWith('custom:')) {
                        const [_, grams, label] = unitCode.split(':');
                        unitLabel = label;
                        const weightPerUnit = parseFloat(grams) || 0;
                        const defaultBase = (food.defaultUnit === 'g' || food.defaultUnit === 'ml') ? 100 : 1;
                        const baseAmount = food.baseAmount || defaultBase;
                        ratio = (item.amount * weightPerUnit) / baseAmount;
                    } else {
                        unitLabel = tUnit(unitCode, state.language, isRecipe);
                        const isPer100 = (unitCode === 'g' || unitCode === 'ml');
                        const baseAmount = food.baseAmount || (isPer100 ? 100 : 1);
                        ratio = isRecipe ? (item.amount || 0) : (item.amount / baseAmount);
                    }
                    const foodKcal = calculateCalories(food);
                    let foodMicros = [];
                    if (food.vitamins) Object.entries(food.vitamins).forEach(([n, v]) => foodMicros.push(`${n}: ${(v * ratio).toFixed(1)}`));
                    if (food.minerals) Object.entries(food.minerals).forEach(([n, v]) => foodMicros.push(`${n}: ${(v * ratio).toFixed(1)}`));
                    return `
                        <div class="meal-item" data-index="${idx}">
                            <div class="item-info">
                                <div class="item-name">
                                    ${isDeleted ? `<span style="color:#ff8a80; font-weight:bold; font-size:0.7rem;">[${t('deleted_badge', state.language)}]</span> ` : ''}
                                    ${food.name} 
                                    ${isRecipe ? `<small style="color:var(--secondary); font-size:0.6rem; border:1px solid var(--secondary); padding:0 2px; border-radius:2px;">${t('recipe_badge', state.language)}</small>` : ''}
                                </div>
                                <div class="item-meta">
                                    <span>
                                        <span class="editable-amount" data-meal-id="${meal.id}" data-index="${idx}">${item.amount}</span> ${unitLabel}
                                        - <strong>${Math.round(foodKcal * ratio)} kcal</strong>
                                    </span>
                                    <div class="item-nutrients-mini">P: ${(food.protein * ratio).toFixed(1)}g | C: ${(food.carbs * ratio).toFixed(1)}g | F: ${(food.fat * ratio).toFixed(1)}g${foodMicros.length > 0 ? `<br><span class="micro-text">${foodMicros.join(' | ')}</span>` : ''}</div>
                                </div>
                            </div>
                            <div class="item-actions">
                                <button class="delete-btn remove-item-trigger" data-meal-id="${meal.id}" data-index="${idx}">×</button>
                                <span class="item-drag-handle">☰</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="meal-footer"><button class="add-btn add-food-trigger" data-meal-id="${meal.id}">${t('add_food_btn', state.language)}</button></div>
        `;
        mealCard.querySelector('.rename-meal-trigger').onclick = () => onRenameMeal(meal.id);
        mealCard.querySelector('.copy-meal-trigger').onclick = () => onCopyMeal(meal.id);
        const pasteBtn = mealCard.querySelector('.paste-meal-trigger');
        if (pasteBtn) pasteBtn.onclick = () => onPasteMeal(meal.id);
        mealCard.querySelector('.delete-meal-trigger').onclick = () => onDeleteMeal(meal.id);
        mealCard.querySelector('.add-food-trigger').onclick = () => onAddFood(meal.id);
        mealCard.querySelectorAll('.remove-item-trigger').forEach(btn => btn.onclick = () => onRemoveItem(btn.dataset.mealId, parseInt(btn.dataset.index)));
        mealCard.querySelectorAll('.editable-amount').forEach(span => span.onclick = (e) => onInlineEdit(e, span.dataset.mealId, parseInt(span.dataset.index)));
        mealsListEl.appendChild(mealCard);
        new Sortable(mealCard.querySelector('.meal-items'), {
            group: 'foods', animation: 150, handle: '.item-drag-handle',
            onAdd: (evt) => {
                const meals = getCurrentMeals();
                const sourceMeal = meals.find(m => m.id === evt.from.dataset.mealId);
                const targetMeal = meals.find(m => m.id === evt.to.dataset.mealId);
                const [movedItem] = sourceMeal.items.splice(evt.oldIndex, 1);
                targetMeal.items.splice(evt.newIndex, 0, movedItem);
                saveState(() => onRenderAll());
            },
            onUpdate: (evt) => {
                const meals = getCurrentMeals();
                const meal = meals.find(m => m.id === evt.from.dataset.mealId);
                const [movedItem] = meal.items.splice(evt.oldIndex, 1);
                meal.items.splice(evt.newIndex, 0, movedItem);
                saveState(() => onRenderAll());
            }
        });
    });
    new Sortable(mealsListEl, { animation: 150, handle: '.drag-handle',
        onEnd: (evt) => {
            const meals = getCurrentMeals();
            const [movedMeal] = meals.splice(evt.oldIndex, 1);
            meals.splice(evt.newIndex, 0, movedMeal);
            saveState(() => onRenderAll());
        }
    });
}