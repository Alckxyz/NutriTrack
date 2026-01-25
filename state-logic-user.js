import { state } from './state-base.js';
import * as FB from './firebase-config.js';
import { _rawFoods, updateMergedFoodList } from './state-logic-sync.js';

let userDataListener = null;
let userFoodsListener = null;
let weightEntriesListener = null;
let routinesListener = null;
let exerciseListeners = {};

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
        goals: state.goals,
        visibleMicros: state.visibleMicros || [],
        selectedRoutineId: state.selectedRoutineId || null
    };

    try {
        const userDocRef = FB.doc(FB.db, 'users', uid);
        await FB.setDoc(userDocRef, dataToSave, { merge: true });
        if (callback) callback();
    } catch (error) {
        console.error("Firestore save failed:", error);
    }
};

export async function loadUserData(user, refreshUI) {
    state.user = user;
    
    if (userDataListener) userDataListener();
    if (userFoodsListener) userFoodsListener();
    if (weightEntriesListener) weightEntriesListener();
    
    if (!user) {
        userDataListener = null;
        userFoodsListener = null;
        weightEntriesListener = null;
        
        if (routinesListener) routinesListener();
        routinesListener = null;
        Object.values(exerciseListeners).forEach(unsub => unsub());
        exerciseListeners = {};

        _rawFoods.personal = [];
        updateMergedFoodList();
        return;
    }

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
            state.visibleMicros = data.visibleMicros || [];
            state.selectedRoutineId = data.selectedRoutineId || null;
            updateMergedFoodList();
            if (refreshUI) refreshUI();
        } else {
            state.displayName = user.displayName || '';
        }
    });

    const userFoodsCol = FB.collection(FB.db, 'users', user.uid, 'foods');
    userFoodsListener = FB.onSnapshot(userFoodsCol, (snapshot) => {
        _rawFoods.personal = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), source: 'user' }));
        snapshot.docs.forEach(async (docSnap) => {
            const data = docSnap.data();
            if (data.conversions && Array.isArray(data.conversions) && data.conversions.length > 0) {
                for (const c of data.conversions) {
                    const convCol = FB.collection(FB.db, 'foodList', docSnap.id, 'conversions');
                    await FB.addDoc(convCol, { ...c, ownerId: user.uid, createdAt: Date.now() });
                }
                const foodRef = FB.doc(FB.db, 'users', user.uid, 'foods', docSnap.id);
                await FB.updateDoc(foodRef, { conversions: FB.deleteField() });
            }
        });
        updateMergedFoodList();
        if (refreshUI) refreshUI();
    }, (err) => console.error("Personal foods sync error:", err));

    const routinesCol = FB.collection(FB.db, 'users', user.uid, 'routines');
    routinesListener = FB.onSnapshot(routinesCol, (snapshot) => {
        const newRoutines = snapshot.docs.map(doc => {
            const existing = state.routines.find(r => r.id === doc.id);
            return { id: doc.id, ...doc.data(), exercises: existing ? existing.exercises : [] };
        });
        // Client-side sorting based on 'order' field
        newRoutines.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

        const activeRoutineIds = new Set(newRoutines.map(r => r.id));
        Object.keys(exerciseListeners).forEach(rid => {
            if (!activeRoutineIds.has(rid)) {
                exerciseListeners[rid]();
                delete exerciseListeners[rid];
            }
        });

        newRoutines.forEach(routine => {
            if (!exerciseListeners[routine.id]) {
                const exCol = FB.collection(FB.db, 'users', user.uid, 'routines', routine.id, 'exercises');
                exerciseListeners[routine.id] = FB.onSnapshot(exCol, (exSnapshot) => {
                    const exercises = exSnapshot.docs.map(edoc => ({ id: edoc.id, ...edoc.data() }));
                    // Client-side sorting based on 'order' field
                    exercises.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
                    const idx = state.routines.findIndex(r => r.id === routine.id);
                    if (idx !== -1) state.routines[idx].exercises = exercises;
                    const localR = newRoutines.find(r => r.id === routine.id);
                    if (localR) localR.exercises = exercises;
                    if (refreshUI) refreshUI();
                });
            }
        });
        state.routines = newRoutines;
        if (refreshUI) refreshUI();
    }, (err) => console.error("Routines sync error:", err));

    const weightCol = FB.collection(FB.db, 'users', user.uid, 'weightEntries');
    const weightQuery = FB.query(weightCol, FB.orderBy('createdAt', 'desc'));
    weightEntriesListener = FB.onSnapshot(weightQuery, (snapshot) => {
        state.weightEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (refreshUI) refreshUI();
    }, (err) => console.error("Weight entries sync error:", err));

    const logsCol = FB.collection(FB.db, 'users', user.uid, 'workoutLogs');
    const logsQuery = FB.query(logsCol, FB.orderBy('createdAt', 'desc'));
    FB.onSnapshot(logsQuery, (snapshot) => {
        state.workoutLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (refreshUI) refreshUI();
    }, (err) => console.error("Workout logs sync error:", err));
}

export async function loadDailyPlanForDate(date, refreshUI) {
    if (refreshUI) refreshUI();
}