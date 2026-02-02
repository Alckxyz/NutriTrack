import { state } from './state.js';
import * as FB from './firebase-config.js';
import * as Utils from './utils.js';

/**
 * Handles the persistence of a completed workout session to Firestore.
 */
export async function saveWorkout() {
    if (!state.user || !state.user.uid) {
        alert(state.language === 'es' ? "Debes iniciar sesión antes de guardar el entrenamiento" : "You must be logged in before saving the workout");
        return false;
    }

    const uid = state.user.uid;
    if (!state.activeWorkout) return false;
    
    try {
        const colRef = FB.collection(FB.db, 'users', uid, 'workoutLogs');
        
        // Clean up: filter out nulls, convert types, handle undefineds to prevent Firestore errors
        const filteredExercises = (state.activeWorkout.exercises || [])
            .filter(ex => ex && ex.sets && ex.sets.length > 0)
            .map(ex => {
                const cleanSets = (ex.sets || [])
                    .filter(s => s !== null && s !== undefined)
                    .map(s => ({
                        weightKg: Number(s.weightKg) || 0,
                        reps: Number(s.reps) || 0,
                        setIndex: Number(s.setIndex) || 0,
                        createdAt: s.createdAt || FB.Timestamp.now()
                    }))
                    .filter(s => s.reps > 0 || s.weightKg > 0); // Remove empty sets

                if (cleanSets.length === 0) return null;

                return {
                    exerciseId: String(ex.exerciseId || ''),
                    exerciseName: String(ex.exerciseName || 'Ejercicio'),
                    exerciseGroupId: String(ex.exerciseGroupId || ex.exerciseId || ''),
                    loadMode: String(ex.loadMode || 'external_total'),
                    loadMultiplier: Number(ex.loadMultiplier) || 1,
                    createdAt: ex.createdAt || FB.Timestamp.now(),
                    notes: String(ex.notes || ''),
                    sets: cleanSets
                };
            })
            .filter(ex => ex !== null);
        
        const workoutData = {
            routineId: String(state.activeWorkout.routineId || ''),
            routineName: String(state.activeWorkout.routineName || 'Rutina'),
            exercises: filteredExercises,
            startedAt: state.activeWorkout.startedAt,
            createdAt: FB.serverTimestamp()
        };

        console.log("Saving Workout Data:", workoutData);

        await FB.addDoc(colRef, workoutData);
        
        // Update routine with final dominant weights (handles cases where weights were manually edited in the final modal)
        const routineId = state.activeWorkout.routineId;
        for (const exSession of filteredExercises) {
            const exerciseId = exSession.exerciseId;
            const weightCounts = {};
            exSession.sets.forEach(s => {
                weightCounts[s.weightKg] = (weightCounts[s.weightKg] || 0) + 1;
            });
            let dominantWeight = exSession.sets[0].weightKg;
            let maxCount = 0;
            for (const [w, count] of Object.entries(weightCounts)) {
                const weightNum = parseFloat(w);
                if (count > maxCount || (count === maxCount && weightNum > dominantWeight)) {
                    dominantWeight = weightNum;
                    maxCount = count;
                }
            }
            
            const exDocRef = FB.doc(FB.db, 'users', uid, 'routines', routineId, 'exercises', exerciseId);
            await FB.updateDoc(exDocRef, { weight: dominantWeight }).catch(err => console.warn("Could not update base weight", err));
        }

        // Update last finished routine indicator
        state.lastFinishedRoutineId = state.activeWorkout.routineId;
        await import('./state.js').then(m => m.saveState());

        Utils.showToast("✅ " + (state.language === 'es' ? "Entrenamiento guardado" : "Workout saved"));
        return true;
    } catch (error) {
        console.error("Error saving workout log:", error);
        if (error.code === 'permission-denied') {
            alert(state.language === 'es' ? "Error de permisos: Asegúrate de estar autenticado correctamente." : "Permission denied: Ensure you are logged in correctly.");
        } else {
            alert(state.language === 'es' ? "Error al guardar: " + (error.message || error) : "Error saving: " + (error.message || error));
        }
        return false;
    }
}