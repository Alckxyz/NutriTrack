import { state, saveState } from './state.js';
import * as Utils from './utils.js';
import * as UI from './ui.js';
import { dom } from './dom-elements.js';
import * as FB from './firebase-config.js';
import { t } from './i18n.js';
import * as Nutrients from './nutrient-utils.js';

export function openDbModalForAdd() {
    const dbModalTitleEl = document.getElementById('db-modal-title');
    if (dbModalTitleEl) dbModalTitleEl.textContent = t('db_modal_title_add', state.language);
    dom.dbSaveBtn.textContent = t('save_to_list', state.language);
    dom.dbEditId.value = '';
    if (dom.newFoodForm) dom.newFoodForm.reset();
    dom.dbBaseAmount.value = 100;
    document.getElementById('db-default-unit').value = 'g';
    dom.dbVitaminsContainer.innerHTML = '';
    dom.dbMineralsContainer.innerHTML = '';
    const convContainer = document.getElementById('db-conversions-container');
    if (convContainer) convContainer.innerHTML = '';
    dom.dbModal.style.display = 'block';
    setTimeout(() => dom.dbName.focus(), 10);
}

export function openDbModalForEdit(foodId) {
    const food = state.foodList.find(f => f.id === foodId);
    if (!food) return;
    const dbModalTitleEl = document.getElementById('db-modal-title');
    if (dbModalTitleEl) dbModalTitleEl.textContent = t('db_modal_title_edit', state.language);
    dom.dbSaveBtn.textContent = t('update_food', state.language);
    dom.dbEditId.value = food.id;
    dom.dbName.value = food.name;
    dom.dbBaseAmount.value = food.baseAmount || ((food.defaultUnit === 'g' || food.defaultUnit === 'ml') ? 100 : 1);
    dom.dbProtein.value = food.protein;
    dom.dbCarbs.value = food.carbs;
    dom.dbFat.value = food.fat;
    document.getElementById('db-default-unit').value = food.defaultUnit || 'g';

    dom.dbVitaminsContainer.innerHTML = '';
    dom.dbMineralsContainer.innerHTML = '';
    const convContainer = document.getElementById('db-conversions-container');
    if (convContainer) convContainer.innerHTML = '';

    if (food.vitamins) Object.entries(food.vitamins).forEach(([n, v]) => Nutrients.addNutrientRowToContainer('db-vitamins-container', n, v));
    if (food.minerals) Object.entries(food.minerals).forEach(([n, v]) => Nutrients.addNutrientRowToContainer('db-minerals-container', n, v));
    if (food.conversions) {
        food.conversions.forEach(c => {
            // Recalculate original quantity if missing (backward compatibility)
            const qty = c.originalQty || (food.baseAmount / c.grams);
            Nutrients.addConversionRow('db-conversions-container', c.name, qty);
        });
    }

    dom.dbModal.style.display = 'block';
    setTimeout(() => dom.dbName.focus(), 10);
}

export function refreshLibrary() {
    UI.renderLibraryList(dom.libraryList, dom.librarySearchInput, dom.librarySortSelect, openDbModalForEdit, deleteFromDatabase);
}

export async function deleteFromDatabase(foodId, refreshCallback) {
    if (!state.user) return alert("Please login to manage the food list.");
    const food = state.foodList.find(f => f.id === foodId);
    if (!food) return;
    
    // Ownership check: only creator can delete
    if (food.ownerId !== state.user.uid) {
        return alert(state.language === 'es' ? "No tienes permiso para borrar este alimento." : "You don't have permission to delete this food.");
    }

    if (confirm(t('confirm_delete_food', state.language).replace('{name}', food.name))) {
        try {
            // New path: users/{uid}/foods/{foodId}
            const foodDocRef = FB.doc(FB.db, 'users', state.user.uid, 'foods', foodId);
            await FB.deleteDoc(foodDocRef);
            refreshLibrary();
            if (refreshCallback) refreshCallback();
        } catch (e) {
            console.error("Delete failed", e);
            // Fallback for older items in global list if they still exist there
            try {
                const globalDocRef = FB.doc(FB.db, 'foodList', foodId);
                await FB.deleteDoc(globalDocRef);
            } catch(e2) {}
        }
    }
}

export async function handleNewFoodSubmit(event, refreshCallback) {
    event.preventDefault();
    const editId = dom.dbEditId.value;
    
    const foodData = {
        name: dom.dbName.value,
        baseAmount: parseFloat(dom.dbBaseAmount.value) || 100,
        protein: parseFloat(dom.dbProtein.value) || 0,
        carbs: parseFloat(dom.dbCarbs.value) || 0,
        fat: parseFloat(dom.dbFat.value) || 0,
        defaultUnit: document.getElementById('db-default-unit').value || 'g',
        vitamins: Nutrients.getDynamicNutrientsFromContainer('db-vitamins-container'),
        minerals: Nutrients.getDynamicNutrientsFromContainer('db-minerals-container'),
        conversions: Nutrients.getConversionsFromContainer('db-conversions-container', parseFloat(dom.dbBaseAmount.value) || 100),
        ownerName: state.displayName,
        updated_at: Date.now()
    };

    if (!state.user) return alert("Please login to save foods.");

    try {
        if (editId) {
            const food = state.foodList.find(f => f.id === editId);
            // Ownership check for editing
            const isOwner = food && food.ownerId === state.user.uid;
            
            if (isOwner) {
                // Determine source and update path
                if (food.source === 'user') {
                    const foodDocRef = FB.doc(FB.db, 'users', state.user.uid, 'foods', editId);
                    await FB.updateDoc(foodDocRef, foodData);
                } else {
                    // Legacy path fallback (foodList)
                    const legacyRef = FB.doc(FB.db, 'foodList', editId);
                    await FB.updateDoc(legacyRef, foodData);
                }
            } else {
                return alert(state.language === 'es' ? "No tienes permiso para editar este alimento." : "No permission to edit this food.");
            }
        } else {
            // Creation logic - always saves to the user's specific subcollection
            const foodCollection = FB.collection(FB.db, 'users', state.user.uid, 'foods');
            await FB.addDoc(foodCollection, { 
                ...foodData, 
                ownerId: state.user.uid, 
                created_at: Date.now(),
                source: 'user'
            });
        }
        dom.dbModal.style.display = 'none';
        dom.newFoodForm.reset();
        if (refreshCallback) refreshCallback();
        if (dom.libraryModal.style.display === 'block') refreshLibrary();
        Nutrients.updateNutrientSuggestions();
    } catch (e) {
        console.error("Submission failed", e);
        alert(state.language === 'es' ? "Error al guardar el alimento: " + e.message : "Error saving food: " + e.message);
    }
}

export async function handlePasteFood(refreshCallback) {
    if (!state.user) return alert("Please login to import foods.");
    const text = dom.pasteArea.value.trim();
    if (!text) return;
    const parsed = Utils.parsePastedFood(text);
    if (parsed) {
        try {
            // Check for duplicate by name and owner
            const existing = state.foodList.find(f => 
                f.name.toLowerCase() === parsed.name.toLowerCase() && 
                f.ownerId === state.user.uid
            );

            if (existing) {
                const foodDocRef = FB.doc(FB.db, 'users', state.user.uid, 'foods', existing.id);
                await FB.updateDoc(foodDocRef, {
                    ...parsed,
                    updated_at: Date.now()
                }).catch(async () => {
                   const legacyRef = FB.doc(FB.db, 'foodList', existing.id);
                   await FB.updateDoc(legacyRef, { ...parsed, updated_at: Date.now() });
                });
            } else {
                const foodCollection = FB.collection(FB.db, 'users', state.user.uid, 'foods');
                await FB.addDoc(foodCollection, { 
                    ...parsed, 
                    ownerId: state.user.uid,
                    ownerName: state.displayName,
                    created_at: Date.now(), 
                    updated_at: Date.now() 
                });
            }
            
            dom.pasteModal.style.display = 'none';
            alert(t('pasted_success', state.language).replace('{name}', parsed.name));
            if (dom.libraryModal.style.display === 'block') refreshLibrary();
            Nutrients.updateNutrientSuggestions();
            if (refreshCallback) refreshCallback();
        } catch (e) {
            console.error("Paste failed", e);
        }
    }
}