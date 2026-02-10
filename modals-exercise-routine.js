import { t } from './i18n.js';
import { state } from './state.js';

export const routineModals = `
    <!-- Modal for prompting routine name -->
    <div id="routine-prompt-modal" class="modal">
        <div class="modal-content" style="max-width: 350px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); margin: 0;">
            <span class="close-btn">&times;</span>
            <h2 id="routine-prompt-title" data-t="add_routine">Nueva Rutina</h2>
            <div class="form-group" style="margin-top: 1rem;">
                <label id="routine-prompt-label" data-t="prompt_new_routine">Nombre de la rutina:</label>
                <input type="text" id="routine-prompt-input" placeholder="Ej: Empuje A">
            </div>
            <button id="confirm-routine-btn" class="primary-btn" style="width: 100%;">Crear</button>
        </div>
    </div>

    <!-- Modal for Managing Exercise Plans -->
    <div id="exercise-plans-modal" class="modal">
        <div class="modal-content" style="max-width: 400px;">
            <span class="close-btn">&times;</span>
            <h2 data-t="manage_exercise_plans_title">Gestionar Planes de Entrenamiento</h2>
            <div id="exercise-plans-list" class="library-list" style="margin: 1rem 0; max-height: 300px;">
                <!-- List of exercise plans with rename/delete -->
            </div>
            <button id="add-exercise-plan-btn" class="add-btn" style="width: 100%;">+ Nuevo Plan</button>
        </div>
    </div>

    <!-- Modal for Managing Routines -->
    <div id="manage-routines-modal" class="modal">
        <div class="modal-content" style="max-width: 400px;">
            <span class="close-btn">&times;</span>
            <h2 data-t="manage_routines_title">Gestionar Rutinas</h2>
            <div id="manage-routines-list" class="library-list" style="margin: 1rem 0; max-height: 300px;">
                <!-- List of routines with rename/delete -->
            </div>
            <button id="add-routine-modal-btn" class="add-btn" style="width: 100%;">+ Nueva Rutina</button>
        </div>
    </div>

    <!-- Modal for Editing Exercises within a Routine (Reordering) -->
    <div id="routine-editor-modal" class="modal">
        <div class="modal-content" style="max-width: 450px;">
            <span class="close-btn">&times;</span>
            <h2 id="routine-editor-title">Editar Ejercicios</h2>
            <p style="font-size: 0.85rem; color: var(--text-light); margin: 0.5rem 0 1rem 0;">Arrastra los ejercicios para cambiar su orden en la rutina.</p>
            <div id="routine-editor-exercises-list" class="library-list" style="margin: 1rem 0; max-height: 400px; overflow-y: auto; background: rgba(0,0,0,0.2);">
                <!-- Exercises with drag handles -->
            </div>
            <button class="primary-btn close-routine-editor-btn" style="width: 100%; margin-top: 10px;">Hecho</button>
        </div>
    </div>
`;