import { state, saveState } from './state.js';
import * as Utils from './utils.js';
import * as UI from './ui.js';
import { dom } from './dom-elements.js';
import * as FB from './firebase-config.js';

export function openDbModalForAdd() {
    dom.dbModalTitle = document.getElementById('db-modal-title'); // Re-selecting for direct access if needed
    dom.dbModalTitle.textContent = Utils.t('db_modal_title_add', state.language);
    dom.dbSaveBtn.textContent = Utils.t('save_to_list', state.language);
    dom.dbEditId.value = '';
    dom.newFoodForm.reset();
    dom.dbVitaminsContainer.innerHTML = '';
    dom.dbMineralsContainer.innerHTML = '';
    dom.dbModal.style.display = 'block';
    setTimeout(() => dom.dbName.focus(), 10);
}

export function openDbModalForEdit(foodId) {
    const food = state.foodList.find(f => f.id === foodId);
    if (!food) return;
    const dbModalTitle = document.getElementById('db-modal-title');
    dbModalTitle.textContent = Utils.t('db_modal_title_edit', state.language);
    dom.dbSaveBtn.textContent = Utils.t('update_food', state.language);
    dom.dbEditId.value = food.id;
    dom.dbName.value = food.name;
    dom.dbProtein.value = food.protein;
    dom.dbCarbs.value = food.carbs;
    dom.dbFat.value = food.fat;
    dom.dbVitaminsContainer.innerHTML = '';
    dom.dbMineralsContainer.innerHTML = '';
    if (food.vitamins) Object.entries(food.vitamins).forEach(([n, v]) => Utils.addNutrientRowToContainer('db-vitamins-container', n, v));
    if (food.minerals) Object.entries(food.minerals).forEach(([n, v]) => Utils.addNutrientRowToContainer('db-minerals-container', n, v));
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

    if (confirm(Utils.t('confirm_delete_food', state.language).replace('{name}', food.name))) {
        try {
            const foodDocRef = FB.doc(FB.db, 'foodList', foodId);
            await FB.deleteDoc(foodDocRef);
            refreshLibrary();
            if (refreshCallback) refreshCallback();
        } catch (e) {
            console.error("Delete failed", e);
        }
    }
}

export async function handleNewFoodSubmit(event, refreshCallback) {
    event.preventDefault();
    const editId = dom.dbEditId.value;
    const foodData = {
        name: dom.dbName.value,
        protein: parseFloat(dom.dbProtein.value),
        carbs: parseFloat(dom.dbCarbs.value),
        fat: parseFloat(dom.dbFat.value),
        vitamins: Utils.getDynamicNutrientsFromContainer('db-vitamins-container'),
        minerals: Utils.getDynamicNutrientsFromContainer('db-minerals-container'),
        updated_at: Date.now()
    };

    if (!state.user) return alert("Please login to save foods.");

    try {
        if (editId) {
            const food = state.foodList.find(f => f.id === editId);
            // Ownership check for editing
            if (food && food.ownerId === state.user.uid) {
                const foodDocRef = FB.doc(FB.db, 'foodList', editId);
                await FB.updateDoc(foodDocRef, foodData);
            } else {
                return alert(state.language === 'es' ? "No tienes permiso para editar este alimento." : "No permission to edit this food.");
            }
        } else {
            const foodCollection = FB.collection(FB.db, 'foodList');
            // Attach ownerId to the new document
            await FB.addDoc(foodCollection, { ...foodData, ownerId: state.user.uid, created_at: Date.now() });
        }
        dom.dbModal.style.display = 'none';
        dom.newFoodForm.reset();
        if (refreshCallback) refreshCallback();
        if (dom.libraryModal.style.display === 'block') refreshLibrary();
        Utils.updateNutrientSuggestions();
    } catch (e) {
        console.error("Submission failed", e);
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
                const foodDocRef = FB.doc(FB.db, 'foodList', existing.id);
                await FB.updateDoc(foodDocRef, {
                    ...parsed,
                    updated_at: Date.now()
                });
            } else {
                const foodCollection = FB.collection(FB.db, 'foodList');
                await FB.addDoc(foodCollection, { 
                    ...parsed, 
                    ownerId: state.user.uid, 
                    created_at: Date.now(), 
                    updated_at: Date.now() 
                });
            }
            
            dom.pasteModal.style.display = 'none';
            alert(Utils.t('pasted_success', state.language).replace('{name}', parsed.name));
            if (dom.libraryModal.style.display === 'block') refreshLibrary();
            Utils.updateNutrientSuggestions();
            if (refreshCallback) refreshCallback();
        } catch (e) {
            console.error("Paste failed", e);
        }
    }
}