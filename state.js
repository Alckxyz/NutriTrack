import { defaultFoods } from './food-data.js';
import * as FB from './firebase-config.js';

export const state = {
    user: null,
    displayName: '',
    mode: 'standard', // 'standard' or 'daily'
    language: 'es',
    currentDate: new Date().toISOString().split('T')[0],
    foodList: defaultFoods.map(f => ({
        ...f,
        created_at: f.created_at || Date.now(),
        updated_at: f.updated_at || Date.now()
    })),
    meals: [
        { id: 'm1', name: 'Desayuno', items: [] },
        { id: 'm2', name: 'Almuerzo', items: [] },
        { id: 'm3', name: 'Cena', items: [] }
    ],
    dailyPlans: {}, // Format: { "YYYY-MM-DD": [meals...] }
    librarySort: 'name',
    clipboard: null,
    weightEntries: [],
    goals: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        mode: 'manual'
    }
};

let userDataListener = null;
let userFoodsListener = null;
let globalFoodListener = null;
let userFoodGroupListener = null;
let weightEntriesListener = null;

const _rawFoods = {
    global: [],
    users: [],
    personal: []
};

let _refreshUICallback = null;

const updateMergedFoodList = () => {
    // We want to show all foods from all users. 
    // To keep it clean, we deduplicate by (Name + Owner).
    // This allows different users to have their own "Apple" entry visible to others.
    const uniqueFoods = new Map();

    const processFood = (food) => {
        if (!food || !food.name) return;
        // Unique key: Name + OwnerID (or 'global' for defaults)
        const ownerKey = food.ownerId || food.source || 'system';
        const key = `${food.name.trim().toLowerCase()}_${ownerKey}`;
        
        const existing = uniqueFoods.get(key);
        if (!existing) {
            uniqueFoods.set(key, food);
        } else {
            // If same name from same owner, keep the newest one
            const foodTime = food.updated_at || food.created_at || 0;
            const existingTime = existing.updated_at || existing.created_at || 0;
            if (foodTime > existingTime) {
                uniqueFoods.set(key, food);
            }
        }
    };

    // 1. Start with defaults
    defaultFoods.forEach(f => processFood({ ...f, source: 'default' }));
    
    // 2. Add global shared pool
    _rawFoods.global.forEach(f => processFood(f));

    // 3. Add all user contributions (from collectionGroup)
    _rawFoods.users.forEach(f => processFood(f));

    // 4. Add personal foods (direct fetch, highest reliability)
    _rawFoods.personal.forEach(f => processFood(f));

    state.foodList = Array.from(uniqueFoods.values());
    if (_refreshUICallback) _refreshUICallback();
};

export function getCurrentMeals() {
    if (state.mode === 'standard') {
        return state.meals;
    } else {
        const date = state.currentDate;
        if (!state.dailyPlans[date]) {
            state.dailyPlans[date] = [
                { id: 'm1-' + date, name: 'Desayuno', items: [] },
                { id: 'm2-' + date, name: 'Almuerzo', items: [] },
                { id: 'm3-' + date, name: 'Cena', items: [] }
            ];
        }
        return state.dailyPlans[date];
    }
}

export function setCurrentMeals(newMeals) {
    if (state.mode === 'standard') {
        state.meals = newMeals;
    } else {
        state.dailyPlans[state.currentDate] = newMeals;
    }
}

export const saveState = async (callback) => {
    if (!state.user) {
        if (callback) callback();
        return;
    }

    const uid = state.user.uid;
    const dataToSave = {
        mode: state.mode,
        language: state.language,
        displayName: state.displayName,
        meals: state.meals,
        dailyPlans: state.dailyPlans,
        goals: state.goals
    };

    try {
        const userDocRef = FB.doc(FB.db, 'users', uid);
        await FB.setDoc(userDocRef, dataToSave, { merge: true });
        if (callback) callback();
    } catch (error) {
        console.error("Firestore save failed:", error);
    }
};

export function initSharedFoodSync(refreshUI) {
    if (globalFoodListener || userFoodGroupListener) return;
    _refreshUICallback = refreshUI;

    // 1. Listen to Global Foods (the shared pool)
    const globalCol = FB.collection(FB.db, 'foodList');
    globalFoodListener = FB.onSnapshot(globalCol, (snapshot) => {
        _rawFoods.global = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), source: 'global' }));
        console.log("global foods:", _rawFoods.global.length);
        updateMergedFoodList();
    }, (err) => console.error("Global foods sync error:", err));

    // 2. Listen to all User Foods (community contributions)
    // This allows any user to see foods created by others (Read: All)
    const userFoodsGroup = FB.collectionGroup(FB.db, 'foods');
    userFoodGroupListener = FB.onSnapshot(userFoodsGroup, (snapshot) => {
        _rawFoods.users = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(), 
            source: 'user' 
        }));
        console.log("user foods:", _rawFoods.users.length);
        updateMergedFoodList();
    }, (err) => {
        console.error("User foods sync (collectionGroup) failed.", err);
        if (err.code === 'permission-denied') {
            console.error("ERROR: Permisos denegados para collectionGroup('foods'). Asegúrate de haber publicado las reglas correctas.");
        } else if (err.code === 'failed-precondition') {
            console.error("ERROR: Falta un índice para collectionGroup('foods'). Revisa el link en el mensaje de error de la consola.");
        }
        // Fallback: update list anyway with what we have (defaults + global)
        updateMergedFoodList();
    });
}

export async function loadUserData(user, refreshUI) {
    state.user = user;
    
    // Cleanup existing listeners if any
    if (userDataListener) userDataListener();
    if (userFoodsListener) userFoodsListener();
    if (weightEntriesListener) weightEntriesListener();
    
    if (!user) {
        userDataListener = null;
        userFoodsListener = null;
        weightEntriesListener = null;
        _rawFoods.personal = [];
        updateMergedFoodList();
        return;
    }

    // 1. User preferences listener
    const userDocRef = FB.doc(FB.db, 'users', user.uid);
    userDataListener = FB.onSnapshot(userDocRef, (snapshot) => {
        const data = snapshot.data();
        if (data) {
            state.mode = data.mode || state.mode;
            state.language = data.language || state.language;
            state.displayName = data.displayName || user.displayName || '';
            
            if (data.meals) state.meals = data.meals;
            if (data.dailyPlans) state.dailyPlans = data.dailyPlans;
            if (data.goals) state.goals = data.goals;
            
            // Re-merge to prioritize this specific user's foods now that state.user is set
            updateMergedFoodList();
            if (refreshUI) refreshUI();
        } else {
            // First time user, set default display name from auth
            state.displayName = user.displayName || '';
        }
    });

    // 2. Personal Foods listener (users/{uid}/foods)
    // This ensures your own foods always load even if collectionGroup has issues
    const userFoodsCol = FB.collection(FB.db, 'users', user.uid, 'foods');
    userFoodsListener = FB.onSnapshot(userFoodsCol, (snapshot) => {
        _rawFoods.personal = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), source: 'user' }));
        updateMergedFoodList();
        if (refreshUI) refreshUI();
    }, (err) => console.error("Personal foods sync error:", err));

    // 3. Weight entries listener
    const weightCol = FB.collection(FB.db, 'users', user.uid, 'weightEntries');
    const weightQuery = FB.query(weightCol, FB.orderBy('createdAt', 'desc'));
    
    weightEntriesListener = FB.onSnapshot(weightQuery, (snapshot) => {
        state.weightEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (refreshUI) refreshUI();
    }, (err) => console.error("Weight entries sync error:", err));
}

export async function loadDailyPlanForDate(date, refreshUI) {
    // Since we are using a real-time listener on the whole caloriesData, 
    // daily plans for specific dates are already synced in state.dailyPlans.
    if (refreshUI) refreshUI();
}

export function calculateCalories(food) {
    if (!food) return 0;
    const p = food.protein || 0;
    const c = food.carbs || 0;
    const f = food.fat || 0;
    return (p * 4) + (c * 4) + (f * 9);
}

export function calculateMealNutrients(meal) {
    const summary = { 
        calories: 0, protein: 0, carbs: 0, fat: 0, 
        vitamins: {}, minerals: {} 
    };

    if (!meal || !meal.items) return summary;

    meal.items.forEach(item => {
        if (!item || !item.foodId) return;
        let food = state.foodList.find(f => f && f.id === item.foodId);
        
        // Fallback to snapshot if food was deleted from global list
        if (!food) {
            if (item.snapshot) {
                food = item.snapshot;
            } else {
                return;
            }
        }
        
        // If it's a recipe, nutrients are stored per portion.
        // For standard foods, ratio depends on the unit and its reference baseAmount:
        // By default g/ml are per 100, others per 1, unless defined otherwise in food.baseAmount
        const isRecipe = food.type === 'recipe';
        const unit = item.unit || food.defaultUnit || 'g';
        
        let ratio;
        if (unit.startsWith('custom:')) {
            const [_, grams, label] = unit.split(':');
            const weightPerUnit = parseFloat(grams) || 0;
            // For custom units, amount is "how many units"
            // We need to calculate how many grams that is, then divide by the food's baseAmount
            const defaultBase = (food.defaultUnit === 'g' || food.defaultUnit === 'ml') ? 100 : 1;
            const baseAmount = food.baseAmount || defaultBase;
            ratio = (item.amount * weightPerUnit) / baseAmount;
        } else {
            const defaultBase = (unit === 'g' || unit === 'ml') ? 100 : 1;
            const baseAmount = food.baseAmount || defaultBase;
            ratio = isRecipe ? (item.amount || 0) : (item.amount / baseAmount);
        }
        const foodKcal = calculateCalories(food);
        
        summary.calories += (foodKcal * ratio);
        summary.protein += ((food.protein || 0) * ratio);
        summary.carbs += ((food.carbs || 0) * ratio);
        summary.fat += ((food.fat || 0) * ratio);

        if (food.vitamins) {
            Object.entries(food.vitamins).forEach(([name, val]) => {
                summary.vitamins[name] = (summary.vitamins[name] || 0) + (val * ratio);
            });
        }
        if (food.minerals) {
            Object.entries(food.minerals).forEach(([name, val]) => {
                summary.minerals[name] = (summary.minerals[name] || 0) + (val * ratio);
            });
        }
    });

    return summary;
}