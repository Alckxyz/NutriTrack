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
    meals: [], // Legacy/Temporary for migration
    standardPlans: [
        { 
            id: 'p1', 
            name: 'Plan Principal', 
            meals: [
                { id: 'm1', name: 'Desayuno', items: [] },
                { id: 'm2', name: 'Almuerzo', items: [] },
                { id: 'm3', name: 'Cena', items: [] }
            ]
        }
    ],
    currentStandardPlanId: 'p1',
    dailyPlans: {}, // Format: { "YYYY-MM-DD": [meals...] }
    librarySort: 'name',
    clipboard: null,
    weightEntries: [],
    foodConversions: {}, // Format: { foodId: [{name, grams, originalQty, totalWeight}, ...] }
    routines: [], // Array of routine objects
    exercisePlans: [
        { id: 'ep1', name: 'Plan Principal' }
    ],
    currentExercisePlanId: 'ep1',
    workoutLogs: [], // Historical workout sessions
    activeWorkout: null, // Current session data if active
    selectedRoutineId: null, // ID of the currently active routine
    lastFinishedRoutineId: null, // ID of the routine that was just completed
    visibleMicros: [], // Array of names of micronutrients to show in summary
    timerEnabled: true,
    goals: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        mode: 'manual'
    }
};