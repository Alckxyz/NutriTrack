import { defaultFoods } from './food-data.js';

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
    foodConversions: {}, // Format: { foodId: [{name, grams, originalQty, totalWeight}, ...] }
    routines: [], // Array of routine objects
    workoutLogs: [], // Historical workout sessions
    activeWorkout: null, // Current session data if active
    selectedRoutineId: null, // ID of the currently active routine
    visibleMicros: [], // Array of names of micronutrients to show in summary
    goals: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        mode: 'manual'
    }
};