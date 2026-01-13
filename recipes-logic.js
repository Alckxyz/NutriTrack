import { state, saveState, calculateCalories } from './state.js';
import * as Utils from './utils.js';
import * as UI from './ui.js';
import { dom } from './dom-elements.js';
import { openAddFoodModal, setCurrentActiveMealId } from './meals-logic.js';
import * as FB from './firebase-config.js';

let currentEditingRecipeId = null;
let tempRecipeItems = [];

export function refreshRecipeLibrary() {
    UI.renderRecipeLibraryList(dom.recipeLibraryList, dom.recipeLibrarySearch.value, openRecipeEditor, deleteRecipe);
}

export function openRecipeEditor(recipeId = null) {
    currentEditingRecipeId = recipeId;
    dom.recipeIngredientsList.innerHTML = '';
    dom.recipeNameInput.value = '';
    dom.recipePortionsInput.value = 1;
    tempRecipeItems = [];

    if (recipeId) {
        const recipe = state.foodList.find(f => f.id === recipeId && f.type === 'recipe');
        if (recipe) {
            dom.recipeNameInput.value = recipe.name;
            dom.recipePortionsInput.value = recipe.portions || 1;
            tempRecipeItems = JSON.parse(JSON.stringify(recipe.items || []));
        }
    }

    renderRecipeEditorItems();
    dom.recipeEditorModal.style.display = 'block';
}

export function renderRecipeEditorItems() {
    dom.recipeIngredientsList.innerHTML = '';
    tempRecipeItems.forEach((item, idx) => {
        const food = state.foodList.find(f => f.id === item.foodId);
        if (!food) return;
        const div = document.createElement('div');
        div.className = 'meal-item';
        div.innerHTML = `
            <div class="item-info">
                <div class="item-name">${food.name}</div>
                <div class="item-meta">
                    <span><span class="editable-amount-recipe" data-index="${idx}">${item.amount}</span>g</span>
                </div>
            </div>
            <div class="item-actions">
                <button class="delete-btn" data-index="${idx}">×</button>
            </div>
        `;
        div.querySelector('.delete-btn').onclick = () => {
            tempRecipeItems.splice(idx, 1);
            renderRecipeEditorItems();
        };
        div.querySelector('.editable-amount-recipe').onclick = (e) => {
            const span = e.target;
            const input = document.createElement('input');
            input.type = 'number';
            input.value = span.textContent;
            input.className = 'inline-amount-input';
            input.onblur = () => {
                const val = parseFloat(input.value);
                if (!isNaN(val) && val > 0) tempRecipeItems[idx].amount = val;
                renderRecipeEditorItems();
            };
            span.replaceWith(input);
            input.focus();
        };
        dom.recipeIngredientsList.appendChild(div);
    });
    updateRecipePreview();
}

export function updateRecipePreview() {
    const totals = { protein: 0, carbs: 0, fat: 0, weight: 0 };
    const portions = parseFloat(dom.recipePortionsInput.value) || 1;
    tempRecipeItems.forEach(item => {
        if (!item) return;
        const food = state.foodList.find(f => f && f.id === item.foodId);
        if (!food) return;
        const isRecipe = food.type === 'recipe';
        const ratio = isRecipe ? (item.amount || 0) : ((item.amount || 0) / 100);
        totals.protein += (food.protein || 0) * ratio;
        totals.carbs += (food.carbs || 0) * ratio;
        totals.fat += (food.fat || 0) * ratio;
        totals.weight += isRecipe ? 0 : item.amount;
    });

    if (totals.weight > 0) {
        const pPortion = totals.protein / portions;
        const cPortion = totals.carbs / portions;
        const fPortion = totals.fat / portions;
        const kcalPortion = (pPortion * 4) + (cPortion * 4) + (fPortion * 9);
        dom.recipeSummaryPreview.innerHTML = `
            <span class="nutrient-badge kcal">${Math.round(kcalPortion)} kcal / ${Utils.t('portions_unit', state.language)}</span>
            <span class="nutrient-badge">P: ${pPortion.toFixed(1)}g</span>
            <span class="nutrient-badge">C: ${cPortion.toFixed(1)}g</span>
            <span class="nutrient-badge">F: ${fPortion.toFixed(1)}g</span>
            <span class="nutrient-badge" style="background:#444">Total: ${Math.round(totals.weight)}g</span>
        `;
    } else {
        dom.recipeSummaryPreview.innerHTML = '<span style="color:var(--text-light); font-size:0.8rem">Add ingredients to see nutritional info</span>';
    }
}

export async function deleteRecipe(recipeId, refreshCallback) {
    if (!state.user) return alert("Please login.");
    const recipe = state.foodList.find(f => f.id === recipeId);
    if (!recipe) return;

    // Ownership check
    if (recipe.ownerId !== state.user.uid) {
        return alert(state.language === 'es' ? "No tienes permiso para borrar esta receta." : "No permission to delete this recipe.");
    }

    if (confirm(state.language === 'es' ? '¿Borrar esta receta?' : 'Delete this recipe?')) {
        try {
            const recipeDocRef = FB.doc(FB.db, 'foodList', recipeId);
            await FB.deleteDoc(recipeDocRef);
            // onSnapshot in state.js will handle refreshing UI
            if (refreshCallback) refreshCallback();
        } catch (e) {
            console.error("Delete recipe failed", e);
        }
    }
}

export async function saveRecipe(refreshCallback) {
    const name = dom.recipeNameInput.value.trim();
    const portions = parseFloat(dom.recipePortionsInput.value) || 1;
    if (!name) return alert('Please enter a recipe name');
    if (tempRecipeItems.length === 0) return alert('Add at least one ingredient');

    const totals = { protein: 0, carbs: 0, fat: 0, weight: 0, vitamins: {}, minerals: {} };
    tempRecipeItems.forEach(item => {
        if (!item) return;
        const food = state.foodList.find(f => f && f.id === item.foodId);
        if (!food) return;
        const isRecipe = food.type === 'recipe';
        const ratio = isRecipe ? (item.amount || 0) : ((item.amount || 0) / 100);
        totals.protein += (food.protein || 0) * ratio;
        totals.carbs += (food.carbs || 0) * ratio;
        totals.fat += (food.fat || 0) * ratio;
        totals.weight += isRecipe ? 0 : item.amount;
        if (food.vitamins) Object.entries(food.vitamins).forEach(([n, v]) => totals.vitamins[n] = (totals.vitamins[n] || 0) + (v * ratio));
        if (food.minerals) Object.entries(food.minerals).forEach(([n, v]) => totals.minerals[n] = (totals.minerals[n] || 0) + (v * ratio));
    });

    const recipeData = {
        type: 'recipe',
        name,
        portions,
        items: tempRecipeItems,
        protein: totals.protein / portions,
        carbs: totals.carbs / portions,
        fat: totals.fat / portions,
        vitamins: {},
        minerals: {},
        ownerId: state.user.uid,
        updated_at: Date.now()
    };
    Object.entries(totals.vitamins).forEach(([n, v]) => recipeData.vitamins[n] = v / portions);
    Object.entries(totals.minerals).forEach(([n, v]) => recipeData.minerals[n] = v / portions);

    if (!state.user) return alert("Login to save.");

    try {
        if (currentEditingRecipeId) {
            const existing = state.foodList.find(f => f.id === currentEditingRecipeId);
            if (existing && existing.ownerId === state.user.uid) {
                const docRef = FB.doc(FB.db, 'foodList', currentEditingRecipeId);
                // When updating, we don't strictly need to re-send ownerId, but it's safe as it's the same
                await FB.updateDoc(docRef, recipeData);
            } else {
                return alert("No permission to edit this recipe.");
            }
        } else {
            const colRef = FB.collection(FB.db, 'foodList');
            await FB.addDoc(colRef, { ...recipeData, created_at: Date.now() });
        }
        dom.recipeEditorModal.style.display = 'none';
        if (refreshCallback) refreshCallback();
    } catch (e) {
        console.error("Save recipe failed", e);
    }
}

export function addIngredientToRecipeContext() {
    setCurrentActiveMealId('TEMP_RECIPE');
    openAddFoodModal('TEMP_RECIPE');
}

export function handleIngredientSelection(foodId, amount) {
    tempRecipeItems.push({ foodId, amount });
    dom.foodModal.style.display = 'none';
    renderRecipeEditorItems();
}