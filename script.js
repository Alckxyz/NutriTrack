import { state, saveState, getCurrentMeals, setCurrentMeals, loadUserData, loadDailyPlanForDate } from './state.js';
import * as Utils from './utils.js';
import * as UI from './ui.js';
import * as FB from './firebase-config.js';
import { dom } from './dom-elements.js';
import * as MealsLogic from './meals-logic.js';
import * as RecipesLogic from './recipes-logic.js';
import * as DatabaseLogic from './database-logic.js';

// --- State Management ---
// Logic moved to state.js

// --- DOM Elements ---
// Moved to dom-elements.js

let currentImportMode = '';

// UI Options object for renderAll to pass callbacks
const uiOptions = {
    onAddFood: (mealId) => MealsLogic.openAddFoodModal(mealId, refreshUI),
    onRenameMeal: (mealId) => MealsLogic.renameMeal(mealId, refreshUI),
    onCopyMeal: (mealId) => MealsLogic.copyMeal(mealId, refreshUI),
    onPasteMeal: (mealId) => MealsLogic.pasteMeal(mealId, refreshUI),
    onDeleteMeal: (mealId) => MealsLogic.deleteMeal(mealId, refreshUI),
    onRemoveItem: (mealId, index) => MealsLogic.removeItemFromMeal(mealId, index, refreshUI),
    onInlineEdit: (e, mealId, index) => MealsLogic.startInlineEdit(e, mealId, index, refreshUI)
};

const refreshUI = () => {
    // Ensure UI language matches state
    Utils.updateUILanguage(state.language);
    dom.langSelector.value = state.language;
    dom.modeSelector.value = state.mode;

    updateDayName();
    updateModeVisibility();
    
    // Update dynamic titles that change with mode & language
    if (state.mode === 'daily') {
        dom.plannerTitle.textContent = Utils.t('daily_title', state.language);
    } else {
        dom.plannerTitle.textContent = Utils.t('standard_title', state.language);
    }

    UI.renderAll(uiOptions);
    updateAuthUI();
};

function updateAuthUI() {
    const loginBtn = document.getElementById('login-btn');
    const userProfile = document.getElementById('user-profile');
    const userAvatar = document.getElementById('user-avatar');

    if (state.user) {
        loginBtn.classList.add('hidden');
        userProfile.classList.remove('hidden');
        userAvatar.src = state.user.photoURL || `https://images.websim.com/avatar/${state.user.displayName}`;
    } else {
        loginBtn.classList.remove('hidden');
        userProfile.classList.add('hidden');
    }
}

function updateModeVisibility() {
    if (state.mode === 'daily') {
        dom.datePickerContainer.classList.remove('hidden');
    } else {
        dom.datePickerContainer.classList.add('hidden');
    }
}

function updateDayName() {
    if (state.mode === 'daily') {
        const date = new Date(state.currentDate + 'T12:00:00');
        const options = { weekday: 'long' };
        const dayName = date.toLocaleDateString(state.language === 'es' ? 'es-ES' : 'en-US', options);
        dom.dayNameDisplay.textContent = dayName;
    } else {
        dom.dayNameDisplay.textContent = '';
    }
}

// --- Removed functions now in logic modules ---
// removed function openAddFoodModal() {}
// removed function startInlineEdit() {}
// removed function removeItemFromMeal() {}
// removed function deleteMeal() {}
// removed function renameMeal() {}
// removed function copyMeal() {}
// removed function pasteMeal() {}
// removed function selectFoodForMeal() {}
// removed function refreshRecipeLibrary() {}
// removed function openRecipeEditor() {}
// removed function renderRecipeEditorItems() {}
// removed function updateRecipePreview() {}
// removed function deleteRecipe() {}
// removed function openDbModalForAdd() {}
// removed function openDbModalForEdit() {}
// removed function refreshLibrary() {}
// removed function deleteFromDatabase() {}

// --- Event Listeners ---

document.getElementById('login-btn').onclick = async () => {
    try {
        await FB.signInWithPopup(FB.auth, FB.provider);
        // loadUserData is handled by the onAuthStateChanged listener to ensure single write
    } catch (error) {
        console.error("Login failed:", error);
    }
};

document.getElementById('logout-btn').onclick = async () => {
    await FB.signOut(FB.auth);
    state.user = null;
    refreshUI();
};

FB.onAuthStateChanged(FB.auth, (user) => {
    if (user) {
        loadUserData(user, refreshUI);
    } else {
        state.user = null;
        refreshUI();
    }
});

dom.foodSearch.oninput = (e) => UI.renderFoodResults(dom.foodResults, e.target.value, MealsLogic.selectFoodForMeal);

dom.foodAmountInput.onkeydown = (e) => {
    if (e.key === 'Enter') dom.confirmAddFoodBtn.click();
};

dom.confirmAddFoodBtn.onclick = () => {
    if (MealsLogic.currentActiveMealId === 'TEMP_RECIPE') {
        const amount = parseFloat(dom.foodAmountInput.value);
        if (!amount || amount <= 0) return;
        RecipesLogic.handleIngredientSelection(MealsLogic.currentSelectedFoodId, amount);
    } else {
        MealsLogic.confirmAddFood(refreshUI);
    }
};

document.getElementById('add-meal-btn').onclick = () => {
    const name = prompt(Utils.t('prompt_new_meal', state.language));
    if (name) {
        const meals = getCurrentMeals();
        meals.push({ id: 'm' + Date.now(), name, items: [] });
        saveState(refreshUI);
    }
};

document.getElementById('open-db-modal').onclick = () => DatabaseLogic.openDbModalForAdd();
document.getElementById('manage-recipes-btn').onclick = () => {
    dom.recipeLibraryModal.style.display = 'block';
    RecipesLogic.refreshRecipeLibrary();
};
dom.createNewRecipeBtn = document.getElementById('create-new-recipe-btn');
dom.createNewRecipeBtn.onclick = () => RecipesLogic.openRecipeEditor();
dom.recipeLibrarySearch.oninput = () => RecipesLogic.refreshRecipeLibrary();
dom.recipePortionsInput.oninput = () => RecipesLogic.updateRecipePreview();
document.getElementById('recipe-add-ingredient-btn').onclick = () => RecipesLogic.addIngredientToRecipeContext();
document.getElementById('save-recipe-btn').onclick = () => RecipesLogic.saveRecipe(refreshUI);

document.querySelectorAll('.close-btn').forEach(btn => {
    btn.onclick = () => {
        const modal = btn.closest('.modal');
        if (modal) modal.style.display = 'none';
    };
});

document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('mousedown', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });
});

window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        [dom.foodModal, dom.dbModal, dom.libraryModal, dom.pasteModal, dom.recipeLibraryModal, dom.recipeEditorModal, dom.settingsModal].forEach(m => m.style.display = 'none');
    }
});

document.getElementById('add-vitamin-btn').onclick = () => Utils.addNutrientRowToContainer('db-vitamins-container');
document.getElementById('add-mineral-btn').onclick = () => Utils.addNutrientRowToContainer('db-minerals-container');

dom.newFoodForm.onsubmit = (e) => DatabaseLogic.handleNewFoodSubmit(e, refreshUI);

dom.settingsBtn.onclick = () => {
    dom.settingsModal.style.display = 'block';
};

document.getElementById('manage-db-btn').onclick = () => {
    dom.libraryModal.style.display = 'block';
    setTimeout(() => dom.librarySearchInput.focus(), 10);
    dom.librarySearchInput.value = '';
    dom.librarySortSelect.value = state.librarySort;
    DatabaseLogic.refreshLibrary();
};

document.getElementById('paste-food-btn').onclick = () => {
    dom.pasteArea.value = '';
    dom.pasteModal.style.display = 'block';
    setTimeout(() => { dom.pasteArea.focus(); dom.pasteArea.select(); }, 10);
};

document.getElementById('confirm-paste-btn').onclick = () => DatabaseLogic.handlePasteFood(refreshUI);

dom.librarySearchInput.oninput = () => DatabaseLogic.refreshLibrary();
dom.librarySortSelect.onchange = (e) => {
    state.librarySort = e.target.value;
    DatabaseLogic.refreshLibrary();
};

document.getElementById('export-db-btn').onclick = () => Utils.downloadJSON(state.foodList, 'nutritrack-food-list.json');

dom.exportPlanBtn.onclick = () => {
    if (state.mode === 'daily') {
        Utils.downloadJSON({ language: state.language, dailyPlans: state.dailyPlans }, 'nutritrack-daily-plans.json');
    } else {
        Utils.downloadJSON({ language: state.language, meals: state.meals }, 'nutritrack-standard-plan.json');
    }
};

document.getElementById('import-db-btn').onclick = () => { currentImportMode = 'food-list'; dom.fileInput.multiple = false; dom.fileInput.click(); };

dom.importPlanBtn.onclick = () => {
    currentImportMode = 'plan-auto';
    dom.fileInput.multiple = false;
    dom.fileInput.click();
};



dom.fileInput.onchange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    let successCount = 0;
    
    for (const file of files) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (currentImportMode === 'plan-auto') {
                if (Array.isArray(data)) {
                    if (data.length > 0 && 'items' in data[0]) {
                        state.meals = data;
                        state.mode = 'standard';
                    }
                } else if (data.dailyPlans) {
                    state.dailyPlans = data.dailyPlans;
                    state.mode = 'daily';
                    if (data.language) state.language = data.language;
                } else if (data.meals) {
                    state.meals = data.meals;
                    state.mode = 'standard';
                    if (data.language) state.language = data.language;
                }
            } else if (currentImportMode === 'food-list') {
                if (!state.user) {
                    alert("Please login to import foods.");
                    return;
                }
                const list = Array.isArray(data) ? data : (data.foodList || []);
                for (const item of list) {
                    if (!item.name) continue;
                    
                    // Look for existing food with same name and same owner
                    const existing = state.foodList.find(f => 
                        f.name.toLowerCase() === item.name.toLowerCase() && 
                        f.ownerId === state.user.uid
                    );
                    
                    const foodData = {
                        name: item.name,
                        protein: parseFloat(item.protein) || 0,
                        carbs: parseFloat(item.carbs) || 0,
                        fat: parseFloat(item.fat) || 0,
                        vitamins: item.vitamins || {},
                        minerals: item.minerals || {},
                        updated_at: Date.now()
                    };

                    if (existing) {
                        // Update existing
                        await FB.updateDoc(FB.doc(FB.db, 'foodList', existing.id), foodData);
                    } else {
                        // Create new
                        await FB.addDoc(FB.collection(FB.db, 'foodList'), { 
                            ...foodData, 
                            ownerId: state.user.uid, 
                            created_at: Date.now() 
                        });
                    }
                }
            }
            successCount++;
        } catch (err) {
            console.error("Import error for file:", file.name, err);
        }
    }

    if (successCount > 0) {
        dom.settingsModal.style.display = 'none';
        saveState(refreshUI);
    }
    
    // Reset input so same file can be selected again
    dom.fileInput.value = '';
};

dom.langSelector.onchange = (e) => {
    state.language = e.target.value;
    saveState(refreshUI);
};

dom.modeSelector.onchange = (e) => {
    state.mode = e.target.value;
    saveState(refreshUI);
};

dom.planDatePicker.onchange = async (e) => {
    state.currentDate = e.target.value;
    if (state.user) {
        await loadDailyPlanForDate(state.currentDate, refreshUI);
    } else {
        refreshUI();
    }
};

function shiftDate(days) {
    const current = new Date(state.currentDate + 'T12:00:00');
    current.setDate(current.getDate() + days);
    state.currentDate = current.toISOString().split('T')[0];
    dom.planDatePicker.value = state.currentDate;
    refreshUI();
}

dom.prevDayBtn.onclick = () => shiftDate(-1);
dom.nextDayBtn.onclick = () => shiftDate(1);

import { initSharedFoodSync } from './state.js';

// Initial Render
refreshUI();
Utils.updateNutrientSuggestions();
initSharedFoodSync(refreshUI);