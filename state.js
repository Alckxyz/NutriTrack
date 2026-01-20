import { defaultFoods } from './food-data.js';
import * as FB from './firebase-config.js';

export const state = {
    user: null,
    mode: 'standard', // 'standard' or 'daily'
    language: 'es', // 'en' or 'es'
    currentDate: new Date().toISOString().split('T')[0],
    foodList: defaultFoods.map(f => ({
        ...f,
        created_at: f.created_at || Date.now(),
        updated_at: f.updated_at || Date.now()
    })),
    meals: [
        { id: 'm1', name: 'Breakfast', items: [] },
        { id: 'm2', name: 'Lunch', items: [] },
        { id: 'm3', name: 'Dinner', items: [] }
    ],
    dailyPlans: {}, // Format: { "YYYY-MM-DD": [meals...] }
    librarySort: 'name',
    clipboard: null,
    goals: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        mode: 'manual'
    }
};

let userDataListener = null;
let sharedFoodListener = null;

export function getCurrentMeals() {
    if (state.mode === 'standard') {
        return state.meals;
    } else {
        const date = state.currentDate;
        if (!state.dailyPlans[date]) {
            const breakfast = state.language === 'es' ? 'Desayuno' : 'Breakfast';
            const lunch = state.language === 'es' ? 'Almuerzo' : 'Lunch';
            const dinner = state.language === 'es' ? 'Cena' : 'Dinner';
            
            state.dailyPlans[date] = [
                { id: 'm1-' + date, name: breakfast, items: [] },
                { id: 'm2-' + date, name: lunch, items: [] },
                { id: 'm3-' + date, name: dinner, items: [] }
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
    if (sharedFoodListener) return;
    const foodCollection = FB.collection(FB.db, 'foodList');
    sharedFoodListener = FB.onSnapshot(foodCollection, (snapshot) => {
        if (!snapshot.empty) {
            state.foodList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } else {
            state.foodList = defaultFoods;
        }
        if (refreshUI) refreshUI();
    });
}

export async function loadUserData(user, refreshUI) {
    state.user = user;
    if (!user) {
        if (userDataListener) {
            userDataListener(); // Unsubscribe from Firestore snapshot
            userDataListener = null;
        }
        return;
    }

    const userDocRef = FB.doc(FB.db, 'users', user.uid);
    userDataListener = FB.onSnapshot(userDocRef, (snapshot) => {
        const data = snapshot.data();
        if (data) {
            state.mode = data.mode || state.mode;
            state.language = data.language || state.language;
            
            if (data.meals) {
                state.meals = data.meals;
            }
            
            if (data.dailyPlans) {
                state.dailyPlans = data.dailyPlans;
            }

            if (data.goals) {
                state.goals = data.goals;
            }
            
            if (refreshUI) refreshUI();
        }
    });
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
        if (!food) return;
        
        // If it's a recipe, nutrients are stored per portion.
        // For standard foods, ratio depends on the unit and its reference baseAmount:
        // By default g/ml are per 100, others per 1, unless defined otherwise in food.baseAmount
        const isRecipe = food.type === 'recipe';
        const unit = item.unit || food.defaultUnit || 'g';
        const defaultBase = (unit === 'g' || unit === 'ml') ? 100 : 1;
        const baseAmount = food.baseAmount || defaultBase;
        const ratio = isRecipe ? (item.amount || 0) : (item.amount / baseAmount);
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