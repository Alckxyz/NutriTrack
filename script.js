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

// --- State Management ---
// Logic moved to state.js

// --- DOM Elements ---
// Moved to dom-elements.js

// Inject Modals into DOM first so all element references exist before listeners are attached
if (dom.modalsOutlet) {
    dom.modalsOutlet.innerHTML = modalsHtml;
}

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
    updateUILanguage('es');
    
    // Safety checks for modal elements that might not be injected yet
    if (dom.modeSelector) dom.modeSelector.value = state.mode;

    updateDayName();
    updateModeVisibility();
    
    // Update dynamic titles that change with mode & language
    if (state.mode === 'daily') {
        dom.plannerTitle.textContent = t('daily_title', state.language);
    } else {
        dom.plannerTitle.textContent = t('standard_title', state.language);
    }

    UI.renderAll(uiOptions);
    updateAuthUI();
    WeightLogic.refreshWeightUI();

    // If "Add Food to Meal" modal is active, update its units
    if (dom.foodModal && dom.foodModal.style.display === 'block' && MealsLogic.currentSelectedFoodId) {
        const food = state.foodList.find(f => f.id === MealsLogic.currentSelectedFoodId);
        if (food) MealsLogic.renderUnitSelector(food);
    }
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

dom.loginBtn.onclick = async () => {
    try {
        await FB.signInWithPopup(FB.auth, FB.provider);
    } catch (error) {
        console.error("Login failed:", error);
    }
};

dom.logoutBtn.onclick = async () => {
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

dom.foodSearch.oninput = (e) => UI.renderFoodResults(dom.foodResults, e.target.value, MealsLogic.activeAddTab, MealsLogic.selectFoodForMeal);

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

dom.addMealBtn.onclick = () => {
    const name = prompt(t('prompt_new_meal', state.language));
    if (name) {
        const meals = getCurrentMeals();
        meals.push({ id: 'm' + Date.now(), name, items: [] });
        saveState(refreshUI);
    }
};

dom.openDbModalBtn.onclick = () => DatabaseLogic.openDbModalForAdd();
dom.manageRecipesBtn.onclick = () => {
    dom.recipeLibraryModal.style.display = 'block';
    RecipesLogic.refreshRecipeLibrary();
};

dom.weightBtn.onclick = () => {
    dom.weightModal.style.display = 'block';
    WeightLogic.refreshWeightUI();
};

dom.reminderWeightBtn.onclick = () => {
    dom.weightBtn.click();
};

dom.saveWeightBtn.onclick = () => {
    WeightLogic.saveWeightEntry();
};
dom.createNewRecipeBtn.onclick = () => RecipesLogic.openRecipeEditor();
dom.recipeLibrarySearch.oninput = () => RecipesLogic.refreshRecipeLibrary();
dom.recipePortionsInput.oninput = () => RecipesLogic.updateRecipePreview();
dom.recipeAddIngredientBtn.onclick = () => RecipesLogic.addIngredientToRecipeContext();
dom.saveRecipeBtn.onclick = () => RecipesLogic.saveRecipe(refreshUI);

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
        [dom.foodModal, dom.dbModal, dom.libraryModal, dom.pasteModal, dom.recipeLibraryModal, dom.recipeEditorModal, dom.settingsModal, dom.wizardModal, dom.weightModal].forEach(m => m.style.display = 'none');
    }
});

dom.addVitaminBtn.onclick = () => Nutrients.addNutrientRowToContainer('db-vitamins-container');
dom.addMineralBtn.onclick = () => Nutrients.addNutrientRowToContainer('db-minerals-container');
const addConvBtn = document.getElementById('add-conversion-btn');
if (addConvBtn) addConvBtn.onclick = () => Nutrients.addConversionRow('db-conversions-container');

dom.newFoodForm.onsubmit = (e) => DatabaseLogic.handleNewFoodSubmit(e, refreshUI);

// Update base amount default when unit changes in food creation
document.getElementById('db-default-unit').addEventListener('input', (e) => {
    const unit = e.target.value.toLowerCase();
    if (unit === 'g' || unit === 'ml') {
        dom.dbBaseAmount.value = 100;
    } else if (unit) {
        // Only reset to 1 if user actually typed something and it's not g/ml
        // This avoids resetting if user is clearing the field
        dom.dbBaseAmount.value = 1;
    }
});

dom.settingsBtn.onclick = () => {
    dom.settingsModal.style.display = 'block';
    if (dom.displayNameInput) dom.displayNameInput.value = state.displayName || '';
    GoalsLogic.initGoalsUI(refreshUI);
};

dom.saveProfileBtn.onclick = async () => {
    const newName = dom.displayNameInput.value.trim();
    if (newName) {
        state.displayName = newName;
        await saveState(refreshUI);
        alert(state.language === 'es' ? "Perfil actualizado" : "Profile updated");
    }
};

document.getElementById('manage-db-btn').onclick = () => {
    dom.libraryModal.style.display = 'block';
    setTimeout(() => dom.librarySearchInput.focus(), 10);
    dom.librarySearchInput.value = '';
    dom.librarySortSelect.value = state.librarySort;
    DatabaseLogic.refreshLibrary();
};

dom.pasteFoodBtn.onclick = () => {
    dom.pasteArea.value = '';
    dom.pasteModal.style.display = 'block';
    setTimeout(() => { dom.pasteArea.focus(); dom.pasteArea.select(); }, 10);
};

dom.confirmPasteBtn.onclick = () => DatabaseLogic.handlePasteFood(refreshUI);

dom.copyPromptBtn.onclick = () => {
    const aiPrompt = `Vas a ayudarme a sacar nutrientes promedio de alimentos. Primero responde solo con: Estoy listo Después de eso, cuando yo te mande un alimento, dame los nutrientes promedio con este formato exacto (sin agregar nada extra, sin explicaciones, sin emojis, sin corchetes, sin comillas, sin paréntesis, y sin unidades en los valores: solo números). Los valores deben ser un promedio. ✅ Regla del nombre (primera línea): La primera línea debe ser solo el nombre del alimento, sin cantidad, sin peso y sin empaque. NO escribas “bolsa”, “paquete”, “porción”, “unidad”, “gramos”, etc. ✅ Regla de Units: Si mi descripción contiene empaque o cantidad, agrega esa unidad con valor 1. “una bolsa” → Bolsa: 1 “un paquete” → Paquete: 1 “una porción” → Porción: 1 “una unidad” → Unidad: 1 “una lata” → Lata: 1 “una botella” → Botella: 1 Si menciono peso o volumen, agrégalo también: “X gramos” → Gramos: X “X ml” → Mililitros: X Si NO menciono gramos o mililitros, igual debes agregar un aproximado en Units: Gramos: X Formato obligatorio: Nombre del alimento Protein: X Carbs: X Fat: X Units: Unidad1: X Unidad2: X Vitamins: Vit X: X Minerals: Mineral X: X Reglas: Protein, Carbs y Fat son obligatorios. Units debe aparecer siempre. Vitamins y Minerals son opcionales. Usa solo números (decimales permitidos). No pongas “g”, “mg”, “kcal”, etc.`;
    
    navigator.clipboard.writeText(aiPrompt).then(() => {
        const originalText = dom.copyPromptBtn.textContent;
        dom.copyPromptBtn.textContent = t('prompt_copied', state.language);
        dom.copyPromptBtn.style.background = 'rgba(129, 199, 132, 0.2)';
        setTimeout(() => {
            dom.copyPromptBtn.textContent = originalText;
            dom.copyPromptBtn.style.background = '';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
};

dom.librarySearchInput.oninput = () => DatabaseLogic.refreshLibrary();
dom.librarySortSelect.onchange = (e) => {
    state.librarySort = e.target.value;
    DatabaseLogic.refreshLibrary();
};

dom.exportDbBtn.onclick = () => {
    if (!state.user) {
        alert(state.language === 'es' ? "Inicia sesión para exportar tus alimentos." : "Login to export your foods.");
        return;
    }
    const userFoods = state.foodList.filter(f => f.ownerId === state.user.uid);
    Utils.downloadJSON(userFoods, 'nutritrack-food-list.json');
};

dom.exportPlanBtn.onclick = () => {
    if (state.mode === 'daily') {
        Utils.downloadJSON({ language: state.language, dailyPlans: state.dailyPlans }, 'nutritrack-daily-plans.json');
    } else {
        Utils.downloadJSON({ language: state.language, meals: state.meals }, 'nutritrack-standard-plan.json');
    }
};

dom.importDbBtn.onclick = () => { currentImportMode = 'food-list'; dom.fileInput.multiple = false; dom.fileInput.click(); };

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
                        // Update existing (new path)
                        const foodRef = FB.doc(FB.db, 'users', state.user.uid, 'foods', existing.id);
                        await FB.updateDoc(foodRef, foodData).catch(async () => {
                            const legacyRef = FB.doc(FB.db, 'foodList', existing.id);
                            await FB.updateDoc(legacyRef, foodData);
                        });
                    } else {
                        // Create new (new path)
                        const foodCollection = FB.collection(FB.db, 'users', state.user.uid, 'foods');
                        await FB.addDoc(foodCollection, { 
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
Nutrients.updateNutrientSuggestions();
initSharedFoodSync(refreshUI);