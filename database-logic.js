import { state, saveState } from './state.js';
import * as Utils from './utils.js';
import * as UI from './ui.js';
import { dom } from './dom-elements.js';
import * as FB from './firebase-config.js';
import { t } from './i18n.js';
import * as Nutrients from './nutrient-utils.js';

export function initDatabaseUI(refreshUI) {
    dom.openDbModalBtn.onclick = () => openDbModalForAdd();
    dom.newFoodForm.onsubmit = (e) => handleNewFoodSubmit(e, refreshUI);

    dom.pasteFoodBtn.onclick = () => {
        dom.pasteArea.value = '';
        dom.pasteModal.style.display = 'block';
        setTimeout(() => { dom.pasteArea.focus(); dom.pasteArea.select(); }, 10);
    };

    dom.confirmPasteBtn.onclick = () => handlePasteFood(refreshUI);

    dom.copyPromptBtn.onclick = () => {
        const aiPrompt = `Vas a ayudarme a sacar nutrientes promedio de alimentos.

Primero responde solo con:
Estoy listo

Después de eso, cuando yo te mande un alimento, dame los nutrientes promedio con este formato exacto (sin agregar nada extra, sin explicaciones, sin emojis, sin corchetes, sin comillas, sin paréntesis extra, y sin unidades de medida en los valores: solo números).
Los valores deben ser un promedio.

✅ Regla del nombre (primera línea):
- La primera línea debe ser solo el nombre del alimento, sin cantidad, sin peso y sin empaque.
- NO escribas “bolsa”, “paquete”, “porción”, “unidad”, “gramos”, etc.

✅ Regla del estado del alimento (crudo/frito/horneado/etc):
- Si el usuario menciona un estado (frito, horneado, cocido, hervido, a la plancha, asado, al vapor, etc.),
  entonces agrégalo en el nombre entre paréntesis y usa nutrientes de ESE estado.
  Ejemplo: "trucha frita" → Trucha (frita)

- Si el usuario SOLO pone el nombre y NO menciona estado:
  - Si es un alimento que normalmente se come crudo (ej: manzana, pera, plátano, uvas, zanahoria, lechuga),
    NO agregues paréntesis.
  - Si NO es de esos (ej: carnes, pescados, pollo, arroz, pasta, papa),
    entonces agrega (crudo) o (cruda) según corresponda y usa nutrientes del alimento crudo.
    Ejemplo: "trucha" → Trucha (cruda)

✅ Regla de Units (obligatoria y en minúscula):
- Units debe aparecer siempre.
- La PRIMERA unidad siempre debe ser:
  - Si es sólido: g: X
  - Si es líquido: ml: X

- Si el usuario menciona gramos o mililitros, usa ese número.
- Si NO menciona gramos o mililitros, agrega un aproximado.

- Después de la primera unidad (g o ml), agrega unidades extra si aparecen en la descripción:
  - “una bolsa” → bolsa: 1
  - “un paquete” → paquete: 1
  - “una porción” → porción: 1
  - “una unidad” → unidad: 1
  - “una lata” → lata: 1
  - “una botella” → botella: 1
  - “un vaso” → vaso: 1
  - “una taza” → taza: 1

✅ Micronutrientes:
- SIEMPRE incluye Vitamins y Minerals.
- Incluye solo los micronutrientes MÁS IMPORTANTES según ese alimento.
- Pon entre 2 y 5 vitaminas y entre 2 y 5 minerales (elige los más relevantes).

Formato obligatorio:

Nombre del alimento
Protein: X
Carbs: X
Fat: X
Units:
g: X
unidad_extra: X
Vitamins:
Vit X: X
Minerals:
Mineral X: X

Reglas:
- Protein, Carbs y Fat son obligatorios.
- Vitamins y Minerals son obligatorios.
- Usa solo números (decimales permitidos).
- No pongas “g”, “mg”, “kcal”, etc. (solo las etiquetas g: y ml: en Units)`;

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
    if (dom.pasteFoodBtn) dom.pasteFoodBtn.classList.add('hidden');
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
    const btn = dom.dbSaveBtn;
    
    btn.disabled = true;
    btn.style.opacity = '0.7';

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
        if (editId) {
            dom.dbModal.style.display = 'none';
        } else {
            // When adding a new food, keep the modal open but clear all inputs
            dom.newFoodForm.reset();
            dom.dbBaseAmount.value = 100;
            const unitInput = document.getElementById('db-default-unit');
            if (unitInput) unitInput.value = 'g';
            dom.dbVitaminsContainer.innerHTML = '';
            dom.dbMineralsContainer.innerHTML = '';
            const convContainer = document.getElementById('db-conversions-container');
            if (convContainer) convContainer.innerHTML = '';
            setTimeout(() => dom.dbName.focus(), 50);
        }
        
        Utils.showToast("✅ " + t('paste_success_msg', state.language));
        
        if (refreshCallback) refreshCallback();
        if (dom.libraryModal.style.display === 'block') refreshLibrary();
        Nutrients.updateNutrientSuggestions();
    } catch (e) {
        console.error("Submission failed", e);
        Utils.showToast("❌ " + t('paste_error_msg', state.language));
    } finally {
        btn.disabled = false;
        btn.style.opacity = '1';
    }
}

export async function handlePasteFood(refreshCallback) {
    if (!state.user) return alert("Please login to import foods.");
    const text = dom.pasteArea.value.trim();
    if (!text) return;

    const btn = dom.confirmPasteBtn;
    btn.disabled = true;
    const originalBtnText = btn.textContent;
    btn.style.opacity = '0.6';

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
            
            Utils.showToast("✅ " + t('paste_success_msg', state.language));
            dom.pasteArea.value = '';
            
            setTimeout(() => {
                // Keep the modal open to allow adding more foods sequentially
                if (dom.libraryModal.style.display === 'block') refreshLibrary();
                Nutrients.updateNutrientSuggestions();
                if (refreshCallback) refreshCallback();
            }, 500); 

        } catch (e) {
            console.error("Paste failed", e);
            Utils.showToast("❌ " + t('paste_error_msg', state.language));
        } finally {
            // Ensure button is re-enabled even after the timeout for successful flow
            setTimeout(() => {
                btn.disabled = false;
                btn.style.opacity = '1';
            }, 2000); // Keep disabled during toast duration
        }
    } else {
        btn.disabled = false;
        btn.style.opacity = '1';
    }
}