import { state } from './state.js';
import * as UI from './ui.js';
import { dom } from './dom-elements.js';
import { t } from './i18n.js';
import * as Nutrients from './nutrient-utils.js';
import { handleNewFoodSubmit, deleteFromDatabase } from './database-actions.js';
import { handlePasteFood, AI_PROMPT } from './database-paste-logic.js';

export function initDatabaseUI(refreshUI) {
    dom.openDbModalBtn.onclick = () => openDbModalForAdd();
    dom.newFoodForm.onsubmit = (e) => handleNewFoodSubmit(e, refreshLibrary, refreshUI);

    dom.pasteFoodBtn.onclick = () => {
        dom.pasteArea.value = '';
        dom.pasteModal.style.display = 'block';
        setTimeout(() => { dom.pasteArea.focus(); dom.pasteArea.select(); }, 10);
    };

    dom.confirmPasteBtn.onclick = () => handlePasteFood(refreshUI, refreshLibrary);

    dom.copyPromptBtn.onclick = () => {
        navigator.clipboard.writeText(AI_PROMPT).then(() => {
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

    dom.librarySearchInput.oninput = () => refreshLibrary();
    dom.librarySortSelect.onchange = (e) => {
        state.librarySort = e.target.value;
        refreshLibrary();
    };

    document.getElementById('manage-db-btn').onclick = () => {
        dom.libraryModal.style.display = 'block';
        setTimeout(() => dom.librarySearchInput.focus(), 10);
        dom.librarySearchInput.value = '';
        dom.librarySortSelect.value = state.librarySort;
        refreshLibrary();
    };

    const unitInput = document.getElementById('db-default-unit');
    if (unitInput) {
        unitInput.addEventListener('input', (e) => {
            const unit = e.target.value.toLowerCase();
            if (unit === 'g' || unit === 'ml') {
                dom.dbBaseAmount.value = 100;
            } else if (unit) {
                dom.dbBaseAmount.value = 1;
            }
        });
    }
}

export function openDbModalForAdd() {
    const dbModalTitleEl = document.getElementById('db-modal-title');
    if (dbModalTitleEl) dbModalTitleEl.textContent = t('db_modal_title_add', state.language);
    if (dom.pasteFoodBtn) dom.pasteFoodBtn.classList.remove('hidden');
    dom.dbSaveBtn.textContent = t('save_to_list', state.language);
    dom.dbEditId.value = '';
    
    if (dom.newFoodForm) {
        dom.newFoodForm.reset();
        // Re-enable all inputs that might have been disabled in "Edit/Conversions" mode
        const unitInput = document.getElementById('db-default-unit');
        [dom.dbName, dom.dbBrand, dom.dbBaseAmount, dom.dbProtein, dom.dbCarbs, dom.dbFat, dom.dbFiber, unitInput].forEach(el => {
            if (el) el.disabled = false;
        });
    }

    dom.addVitaminBtn.style.display = '';
    dom.addMineralBtn.style.display = '';
    
    dom.dbBaseAmount.value = 100;
    const unitInput = document.getElementById('db-default-unit');
    if (unitInput) unitInput.value = 'g';
    
    dom.dbVitaminsContainer.innerHTML = '';
    dom.dbMineralsContainer.innerHTML = '';
    const convContainer = document.getElementById('db-conversions-container');
    if (convContainer) convContainer.innerHTML = '';
    
    dom.dbModal.style.display = 'block';
    setTimeout(() => dom.dbName.focus(), 10);
}

export async function openDbModalForEdit(foodId) {
    const food = state.foodList.find(f => f.id === foodId);
    if (!food) return;
    const isOwner = state.user && food.ownerId === state.user.uid;
    const dbModalTitleEl = document.getElementById('db-modal-title');
    if (dbModalTitleEl) dbModalTitleEl.textContent = isOwner ? t('db_modal_title_edit', state.language) : t('conversions_title', state.language);
    if (dom.pasteFoodBtn) dom.pasteFoodBtn.classList.add('hidden');
    
    dom.dbSaveBtn.textContent = isOwner ? t('update_food', state.language) : t('save_conversions', state.language);
    dom.dbEditId.value = food.id;
    
    // Set values
    dom.dbName.value = food.name;
    dom.dbBrand.value = food.brand || '';
    dom.dbBaseAmount.value = food.baseAmount || ((food.defaultUnit === 'g' || food.defaultUnit === 'ml') ? 100 : 1);
    dom.dbProtein.value = food.protein;
    dom.dbCarbs.value = food.carbs;
    dom.dbFat.value = food.fat;
    dom.dbFiber.value = food.fiber || 0;
    const unitInput = document.getElementById('db-default-unit');
    if (unitInput) unitInput.value = food.defaultUnit || 'g';

    // Toggle editability based on ownership
    [dom.dbName, dom.dbBrand, dom.dbBaseAmount, dom.dbProtein, dom.dbCarbs, dom.dbFat, dom.dbFiber, unitInput].forEach(el => {
        if (el) el.disabled = !isOwner;
    });
    dom.addVitaminBtn.style.display = isOwner ? '' : 'none';
    dom.addMineralBtn.style.display = isOwner ? '' : 'none';

    dom.dbVitaminsContainer.innerHTML = '';
    dom.dbMineralsContainer.innerHTML = '';
    const convContainer = document.getElementById('db-conversions-container');
    if (convContainer) convContainer.innerHTML = '';

    if (food.vitamins) Object.entries(food.vitamins).forEach(([n, v]) => Nutrients.addNutrientRowToContainer('db-vitamins-container', n, v, 'vitamin-suggestions'));
    if (food.minerals) Object.entries(food.minerals).forEach(([n, v]) => Nutrients.addNutrientRowToContainer('db-minerals-container', n, v, 'mineral-suggestions'));
    
    // Load conversions from the shared state.foodConversions
    // Also trigger an explicit public fetch to ensure we see all community contributions
    import('./state.js').then(m => m.fetchFoodConversions(foodId, () => {
        const convContainer = document.getElementById('db-conversions-container');
        if (convContainer) {
            convContainer.innerHTML = '';
            const updatedConversions = state.foodConversions[foodId] || [];
            updatedConversions.forEach(c => {
                const qty = c.originalQty || 1;
                const weight = c.totalWeight || (c.grams * qty);
                Nutrients.addConversionRow('db-conversions-container', c.name, qty, weight, c.id, c.ownerId);
            });
        }
    }));

    const conversions = state.foodConversions[foodId] || [];
    conversions.forEach(c => {
        const qty = c.originalQty || 1;
        const weight = c.totalWeight || (c.grams * qty);
        Nutrients.addConversionRow('db-conversions-container', c.name, qty, weight, c.id, c.ownerId);
    });

    dom.dbModal.style.display = 'block';
    setTimeout(() => dom.dbName.focus(), 10);
}

export function refreshLibrary() {
    UI.renderLibraryList(dom.libraryList, dom.librarySearchInput, dom.librarySortSelect, openDbModalForEdit, deleteFromDatabase);
}

// removed function deleteFromDatabase() {}
// removed function handleNewFoodSubmit() {}
// removed function handlePasteFood() {}