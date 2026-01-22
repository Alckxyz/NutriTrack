import { state, saveState, calculateCalories } from './state.js';
import * as Utils from './utils.js';
import { t } from './i18n.js';
import * as UI from './ui.js';
import { dom } from './dom-elements.js';
import { openAddFoodModal, setCurrentActiveMealId } from './meals-logic.js';
import * as FB from './firebase-config.js';

let currentEditingRecipeId = null;
let tempRecipeItems = [];

export function initRecipesUI(refreshUI) {
    dom.manageRecipesBtn.onclick = () => {
        dom.recipeLibraryModal.style.display = 'block';
        refreshRecipeLibrary();
    };

    dom.createNewRecipeBtn.onclick = () => openRecipeEditor();
    dom.recipeLibrarySearch.oninput = () => refreshRecipeLibrary();
    dom.recipePortionsInput.oninput = () => updateRecipePreview();
    dom.recipeAddIngredientBtn.onclick = () => addIngredientToRecipeContext();
    dom.saveRecipeBtn.onclick = () => saveRecipe(refreshUI);
}

export function refreshRecipeLibrary() {
    UI.renderRecipeLibraryList(dom.recipeLibraryList, dom.recipeLibrarySearch.value, openRecipeEditor, deleteRecipe);
}

export function openRecipeEditor(recipeId = null) {
    currentEditingRecipeId = recipeId;
    dom.recipeIngredientsList.innerHTML = '';
    
    if (recipeId) {
        const recipe = state.foodList.find(f => f.id === recipeId);
        if (recipe) {
            dom.recipeNameInput.value = recipe.name || '';
            dom.recipePortionsInput.value = recipe.portions || 1;
            // Load existing ingredients into temp state
            tempRecipeItems = JSON.parse(JSON.stringify(recipe.items || []));
            const titleEl = document.getElementById('recipe-editor-title');
            if (titleEl) titleEl.textContent = t('recipe_editor_title', state.language) + ' (Edit)';
        }
    } else {
        dom.recipeNameInput.value = '';
        dom.recipePortionsInput.value = 1;
        tempRecipeItems = [];
        const titleEl = document.getElementById('recipe-editor-title');
        if (titleEl) titleEl.textContent = t('recipe_editor_title', state.language);
    }

    renderRecipeEditorItems();
    dom.recipeEditorModal.style.display = 'block';
}

export function renderRecipeEditorItems() {
    dom.recipeIngredientsList.innerHTML = '';
    tempRecipeItems.forEach((item, idx) => {
        let food = state.foodList.find(f => f.id === item.foodId);
        let isDeleted = false;
        if (!food) {
            if (item.snapshot) {
                food = item.snapshot;
                isDeleted = true;
            } else {
                return;
            }
        }
        const div = document.createElement('div');
        div.className = 'meal-item';
        div.innerHTML = `
            <div class="item-info">
                <div class="item-name">${isDeleted ? `<span style="color:var(--delete-btn-bg); font-weight:bold;">[${t('deleted_badge', state.language)}]</span> ` : ''}${food.name}</div>
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
        let food = state.foodList.find(f => f && f.id === item.foodId);
        if (!food) {
            if (item.snapshot) food = item.snapshot;
            else return;
        }
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
            <span class="nutrient-badge kcal">${Math.round(kcalPortion)} kcal / ${t('portions_unit', state.language)}</span>
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
            const recipeDocRef = FB.doc(FB.db, 'users', state.user.uid, 'foods', recipeId);
            await FB.deleteDoc(recipeDocRef);
            // onSnapshot in state.js will handle refreshing UI
            if (refreshCallback) refreshCallback();
        } catch (e) {
            console.error("Delete recipe failed", e);
            try {
                const legacyRef = FB.doc(FB.db, 'foodList', recipeId);
                await FB.deleteDoc(legacyRef);
            } catch(e2) {}
        }
    }
}

export async function updateRecipe(recipeId, recipeData, refreshCallback) {
    if (!state.user) return;
    try {
        const docRef = FB.doc(FB.db, 'users', state.user.uid, 'foods', recipeId);
        await FB.updateDoc(docRef, recipeData);
        Utils.showToast("✅ " + (state.language === 'es' ? "Receta guardada" : "Recipe saved"));
        if (refreshCallback) refreshCallback();
    } catch (e) {
        console.error("Update recipe failed", e);
        Utils.showToast("❌ " + t('recipe_error_msg', state.language));
    }
}

export async function saveRecipe(refreshCallback) {
    const name = dom.recipeNameInput.value.trim();
    const portions = parseFloat(dom.recipePortionsInput.value) || 1;
    if (!name) return alert('Please enter a recipe name');
    if (tempRecipeItems.length === 0) return alert('Add at least one ingredient');

    const btn = dom.saveRecipeBtn;
    btn.disabled = true;
    btn.style.opacity = '0.7';

    const totals = { protein: 0, carbs: 0, fat: 0, weight: 0, vitamins: {}, minerals: {} };
    tempRecipeItems.forEach(item => {
        if (!item) return;
        let food = state.foodList.find(f => f && f.id === item.foodId);
        if (!food) {
            if (item.snapshot) food = item.snapshot;
            else return;
        }
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
        ownerName: state.displayName,
        updated_at: Date.now()
    };
    Object.entries(totals.vitamins).forEach(([n, v]) => recipeData.vitamins[n] = v / portions);
    Object.entries(totals.minerals).forEach(([n, v]) => recipeData.minerals[n] = v / portions);

    if (!state.user) return alert("Login to save.");

    try {
        if (currentEditingRecipeId) {
            await updateRecipe(currentEditingRecipeId, recipeData, refreshCallback);
        } else {
            const colRef = FB.collection(FB.db, 'users', state.user.uid, 'foods');
            await FB.addDoc(colRef, { ...recipeData, created_at: Date.now() });
            Utils.showToast("✅ " + t('recipe_success_msg', state.language));
        }
        
        dom.recipeEditorModal.style.display = 'none';
        if (refreshCallback) refreshCallback();
        if (dom.recipeLibraryModal.style.display === 'block') refreshRecipeLibrary();
    } catch (e) {
        console.error("Save recipe failed", e);
        Utils.showToast("❌ " + t('recipe_error_msg', state.language));
    } finally {
        btn.disabled = false;
        btn.style.opacity = '1';
    }
}

export function addIngredientToRecipeContext() {
    setCurrentActiveMealId('TEMP_RECIPE');
    openAddFoodModal('TEMP_RECIPE');
}

export function handleIngredientSelection(foodId, amount) {
    const food = state.foodList.find(f => f.id === foodId);
    if (food) {
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
            conversions: food.conversions || []
        };
        tempRecipeItems.push({ foodId, amount, snapshot });
    }
    dom.foodModal.style.display = 'none';
    renderRecipeEditorItems();
}