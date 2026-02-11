import { state } from './state.js';
import * as FB from './firebase-config.js';
import { t } from './i18n.js';
import * as Utils from './utils.js';
import { dom } from './dom-elements.js';
import * as Nutrients from './nutrient-utils.js';

export async function deleteFromDatabase(foodId, refreshLibrary, refreshCallback) {
    if (!state.user) return alert("Please login to manage the food list.");
    const food = state.foodList.find(f => f.id === foodId);
    if (!food) return;
    
    if (food.ownerId !== state.user.uid) {
        return alert(state.language === 'es' ? "No tienes permiso para borrar este alimento." : "You don't have permission to delete this food.");
    }

    if (await Utils.confirmAction(
        t('confirm_delete_food', state.language).replace('{name}', food.name),
        t('confirm', state.language),
        { okText: t('delete_btn', state.language), isDanger: true }
    )) {
        try {
            const foodDocRef = FB.doc(FB.db, 'users', state.user.uid, 'foods', foodId);
            await FB.deleteDoc(foodDocRef);

            const convDocRef = FB.doc(FB.db, 'users', state.user.uid, 'foodConversions', foodId);
            await FB.deleteDoc(convDocRef).catch(() => {});

            if (refreshLibrary) refreshLibrary();
            if (refreshCallback) refreshCallback();
        } catch (e) {
            console.error("Delete failed", e);
            try {
                const globalDocRef = FB.doc(FB.db, 'foodList', foodId);
                await FB.deleteDoc(globalDocRef);
            } catch(e2) {}
        }
    }
}

export async function handleNewFoodSubmit(event, refreshLibrary, refreshCallback) {
    event.preventDefault();
    const editId = dom.dbEditId.value;
    const btn = dom.dbSaveBtn;
    
    if (!state.user) return alert("Please login to save foods.");

    btn.disabled = true;
    btn.style.opacity = '0.7';

    try {
        const foodData = {
            name: dom.dbName.value,
            brand: dom.dbBrand.value.trim() || '',
            baseAmount: parseFloat(dom.dbBaseAmount.value) || 100,
            protein: parseFloat(dom.dbProtein.value) || 0,
            carbs: parseFloat(dom.dbCarbs.value) || 0,
            fat: parseFloat(dom.dbFat.value) || 0,
            fiber: parseFloat(dom.dbFiber.value) || 0,
            defaultUnit: document.getElementById('db-default-unit').value || 'g',
            vitamins: Nutrients.getDynamicNutrientsFromContainer('db-vitamins-container'),
            minerals: Nutrients.getDynamicNutrientsFromContainer('db-minerals-container'),
            ownerName: state.displayName,
            updated_at: FB.serverTimestamp()
        };

        const conversions = Nutrients.getConversionsFromContainer('db-conversions-container');

        // If editing, close modal immediately for better UX
        if (editId) dom.dbModal.style.display = 'none';

        let savedId = editId;
        if (editId) {
            const food = state.foodList.find(f => f.id === editId);
            const isOwner = food && food.ownerId === state.user.uid;
            
            if (isOwner) {
                if (food.source === 'user') {
                    const foodDocRef = FB.doc(FB.db, 'users', state.user.uid, 'foods', editId);
                    await FB.updateDoc(foodDocRef, foodData);
                } else {
                    const legacyRef = FB.doc(FB.db, 'foodList', editId);
                    await FB.updateDoc(legacyRef, foodData);
                }
            }
        } else {
            const foodCollection = FB.collection(FB.db, 'users', state.user.uid, 'foods');
            const newDoc = await FB.addDoc(foodCollection, { 
                ...foodData, 
                ownerId: state.user.uid, 
                created_at: FB.serverTimestamp(),
                source: 'user'
            });
            savedId = newDoc.id;
        }

        for (const conv of conversions) {
            const { id, ownerId, ...convData } = conv;
            const convCol = FB.collection(FB.db, 'foodList', savedId, 'conversions');
            
            if (!id) {
                await FB.addDoc(convCol, { 
                    ...convData, 
                    ownerId: state.user.uid,
                    createdAt: FB.serverTimestamp()
                });
            } else if (ownerId === state.user.uid) {
                const convDocRef = FB.doc(FB.db, 'foodList', savedId, 'conversions', id);
                await FB.updateDoc(convDocRef, convData);
            }
        }

        if (editId) {
            // Reset form and re-enable inputs to ensure the next "Add" operation isn't blocked
            const unitInput = document.getElementById('db-default-unit');
            [dom.dbName, dom.dbBrand, dom.dbBaseAmount, dom.dbProtein, dom.dbCarbs, dom.dbFat, dom.dbFiber, unitInput].forEach(el => {
                if (el) el.disabled = false;
            });
            dom.newFoodForm.reset();
            // Trigger fetch in background
            import('./state.js').then(m => m.fetchFoodConversions(editId));
        } else {
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
        
        const successKey = editId ? 'edit_success_msg' : 'paste_success_msg';
        Utils.showToast("✅ " + t(successKey, state.language));
        
        if (refreshCallback) refreshCallback();
        if (refreshLibrary) refreshLibrary();
        Nutrients.updateNutrientSuggestions();
    } catch (e) {
        console.error("Submission failed", e);
        Utils.showToast("❌ " + t('paste_error_msg', state.language));
    } finally {
        btn.disabled = false;
        btn.style.opacity = '1';
    }
}