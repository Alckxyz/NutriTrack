import { state } from './state-base.js';
import * as FB from './firebase-config.js';
import { defaultFoods } from './food-data.js';

export const _rawFoods = {
    global: [],
    users: [],
    personal: []
};

let _refreshUICallback = null;

export const updateMergedFoodList = () => {
    const uniqueFoods = new Map();

    const processFood = (food) => {
        if (!food || !food.name) return;
        const ownerKey = food.ownerId || food.source || 'system';
        const key = `${food.name.trim().toLowerCase()}_${ownerKey}`;
        
        const existing = uniqueFoods.get(key);
        if (!existing) {
            uniqueFoods.set(key, food);
        } else {
            const foodTime = food.updated_at || food.created_at || 0;
            const existingTime = existing.updated_at || existing.created_at || 0;
            if (foodTime > existingTime) {
                uniqueFoods.set(key, food);
            }
        }
    };

    defaultFoods.forEach(f => processFood({ ...f, source: 'default' }));
    _rawFoods.global.forEach(f => processFood(f));
    _rawFoods.users.forEach(f => processFood(f));
    _rawFoods.personal.forEach(f => processFood(f));

    state.foodList = Array.from(uniqueFoods.values());
    if (_refreshUICallback) _refreshUICallback();
};

export async function fetchFoodConversions(foodId, refreshUI) {
    try {
        const convCol = FB.collection(FB.db, 'foodList', foodId, 'conversions');
        const snapshot = await FB.getDocs(convCol);
        const conversions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        state.foodConversions[foodId] = conversions;
        if (refreshUI) refreshUI();
        return conversions;
    } catch (e) {
        console.error("Error fetching public conversions for food:", foodId, e);
        return [];
    }
}

export function initSharedConversionsSync(refreshUI) {
    const convGroup = FB.collectionGroup(FB.db, 'conversions');
    return FB.onSnapshot(convGroup, (snapshot) => {
        const tempMap = {};
        snapshot.docs.forEach(doc => {
            const foodId = doc.ref.parent.parent.id;
            if (!tempMap[foodId]) tempMap[foodId] = [];
            tempMap[foodId].push({ id: doc.id, ...doc.data() });
        });
        
        state.foodConversions = tempMap;
        if (refreshUI) refreshUI();
    }, (err) => console.error("Global conversions sync error:", err));
}

export function initSharedFoodSync(refreshUI) {
    _refreshUICallback = refreshUI;
    initSharedConversionsSync(refreshUI);

    const globalCol = FB.collection(FB.db, 'foodList');
    FB.onSnapshot(globalCol, (snapshot) => {
        _rawFoods.global = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), source: 'global' }));
        updateMergedFoodList();
    }, (err) => console.error("Global foods sync error:", err));

    const userFoodsGroup = FB.collectionGroup(FB.db, 'foods');
    FB.onSnapshot(userFoodsGroup, (snapshot) => {
        _rawFoods.users = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(), 
            source: 'user' 
        }));
        updateMergedFoodList();
    }, (err) => {
        console.error("User foods sync (collectionGroup) failed.", err);
        updateMergedFoodList();
    });
}