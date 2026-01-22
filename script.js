import { modalsHtml } from './modals-html.js';
import { state, saveState, getCurrentMeals, setCurrentMeals, loadUserData, loadDailyPlanForDate } from './state.js';
import * as Utils from './utils.js';
import * as UI from './ui.js';
import * as FB from './firebase-config.js';
import { dom } from './dom-elements.js';
import * as MealsLogic from './meals-logic.js';
import * as RecipesLogic from './recipes-logic.js';
import * as DatabaseLogic from './database-logic.js';
import * as GoalsLogic from './goals-logic.js';
import * as WeightLogic from './weight-logic.js';
import { t, updateUILanguage } from './i18n.js';
import * as Nutrients from './nutrient-utils.js';
import * as AuthLogic from './auth-logic.js';
import * as SettingsLogic from './settings-logic.js';

// --- DOM Injection ---
if (dom.modalsOutlet) {
    dom.modalsOutlet.innerHTML = modalsHtml;
}

// UI Options object for renderAll to pass callbacks
const uiOptions = {
    onAddFood: (mealId) => MealsLogic.openAddFoodModal(mealId, refreshUI),
    onRenameMeal: (mealId) => MealsLogic.renameMeal(mealId, refreshUI),
    onCopyMeal: (mealId) => MealsLogic.copyMeal(mealId, refreshUI),
    onPasteMeal: (mealId) => MealsLogic.pasteMeal(mealId, refreshUI),
    onDeleteMeal: (mealId) => MealsLogic.deleteMeal(mealId, refreshUI),
    onViewRecipe: (mealId, index) => MealsLogic.showRecipeDetails(mealId, index),
    onRemoveItem: (mealId, index) => MealsLogic.removeItemFromMeal(mealId, index, refreshUI),
    onInlineEdit: (e, mealId, index) => MealsLogic.startInlineEdit(e, mealId, index, refreshUI)
};

const refreshUI = () => {
    updateUILanguage('es');
    
    if (dom.modeSelector) dom.modeSelector.value = state.mode;

    SettingsLogic.updateDayName();
    SettingsLogic.updateModeVisibility();
    
    if (state.mode === 'daily') {
        dom.plannerTitle.textContent = t('daily_title', state.language);
    } else {
        dom.plannerTitle.textContent = t('standard_title', state.language);
    }

    UI.renderAll(uiOptions);
    AuthLogic.updateAuthUI();
    WeightLogic.refreshWeightUI();

    if (dom.recipeLibraryModal && dom.recipeLibraryModal.style.display === 'block') {
        RecipesLogic.refreshRecipeLibrary();
    }
    if (dom.libraryModal && dom.libraryModal.style.display === 'block') {
        DatabaseLogic.refreshLibrary();
    }

    if (dom.foodModal && dom.foodModal.style.display === 'block' && MealsLogic.currentSelectedFoodId) {
        const food = state.foodList.find(f => f.id === MealsLogic.currentSelectedFoodId);
        if (food) MealsLogic.renderUnitSelector(food);
    }
};

// --- Tombstone comments for refactored functions ---
// removed function updateAuthUI() {} -> Moved to auth-logic.js
// removed function updateModeVisibility() {} -> Moved to settings-logic.js
// removed function updateDayName() {} -> Moved to settings-logic.js
// removed function shiftDate() {} -> Moved to settings-logic.js

// --- Global Event Bindings ---

function setupGlobalUI() {
    dom.loginBtn.onclick = AuthLogic.login;
    dom.logoutBtn.onclick = () => AuthLogic.logout(refreshUI);

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
            [dom.foodModal, dom.dbModal, dom.libraryModal, dom.pasteModal, dom.recipeLibraryModal, dom.recipeEditorModal, dom.recipeDetailsModal, dom.settingsModal, dom.wizardModal, dom.weightModal].forEach(m => {
                if(m) m.style.display = 'none';
            });
        }
    });

    dom.addVitaminBtn.onclick = () => Nutrients.addNutrientRowToContainer('db-vitamins-container');
    dom.addMineralBtn.onclick = () => Nutrients.addNutrientRowToContainer('db-minerals-container');
    const addConvBtn = document.getElementById('add-conversion-btn');
    if (addConvBtn) addConvBtn.onclick = () => Nutrients.addConversionRow('db-conversions-container');
}

// Initial Run
AuthLogic.initAuth(refreshUI);
SettingsLogic.initSettingsUI(refreshUI);
MealsLogic.initMealsUI(refreshUI);
RecipesLogic.initRecipesUI(refreshUI);
DatabaseLogic.initDatabaseUI(refreshUI);
WeightLogic.initWeightUI(refreshUI);
setupGlobalUI();

refreshUI();
Nutrients.updateNutrientSuggestions();
import { initSharedFoodSync } from './state.js';
initSharedFoodSync(refreshUI);