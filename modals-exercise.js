import { t } from './i18n.js';
import { state } from './state.js';

export const exerciseModals = `
    <!-- Modal for prompting routine name -->
    <div id="routine-prompt-modal" class="modal">
        <div class="modal-content" style="max-width: 350px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); margin: 0;">
            <span class="close-btn">&times;</span>
            <h2 data-t="add_routine">Nueva Rutina</h2>
            <div class="form-group" style="margin-top: 1rem;">
                <label data-t="prompt_new_routine">Nombre de la rutina:</label>
                <input type="text" id="routine-prompt-input" placeholder="Ej: Empuje A">
            </div>
            <button id="confirm-routine-btn" class="primary-btn" style="width: 100%;">Crear</button>
        </div>
    </div>

    <!-- Modal for adding/editing exercises -->
    <div id="exercise-modal" class="modal">
        <div class="modal-content" style="max-width: 450px;">
            <span class="close-btn">&times;</span>
            <h2 id="ex-modal-title" data-t="add_exercise">${t('add_exercise', state.language)}</h2>
            <form id="exercise-form">
                <input type="hidden" id="ex-routine-id">
                <input type="hidden" id="ex-edit-id">
                <div class="form-group">
                    <label data-t="prompt_exercise_name">${t('prompt_exercise_name', state.language)}</label>
                    <input type="text" id="ex-name" required placeholder="Ej: Press de Banca">
                </div>
                <div class="stats-form-grid">
                    <div class="form-group">
                        <label data-t="sets">${t('sets', state.language)}</label>
                        <input type="number" id="ex-sets" value="3" min="1">
                    </div>
                    <div class="form-group">
                        <label data-t="reps">${t('reps', state.language)}</label>
                        <input type="number" id="ex-reps" value="10" min="1">
                    </div>
                    <div class="form-group">
                        <label data-t="weight">${t('weight', state.language)} (kg)</label>
                        <input type="number" id="ex-weight" value="0" step="any" min="0">
                    </div>
                </div>

                <div class="form-group">
                    <label data-t="load_mode_label">Cómo se cuenta el peso</label>
                    <select id="ex-load-mode" class="settings-select">
                        <option value="external_total" data-t="load_mode_total">Peso total (barra / máquina)</option>
                        <option value="external_single" data-t="load_mode_single">Peso por mano (mancuernas bilateral)</option>
                        <option value="bodyweight" data-t="load_mode_bodyweight">Peso corporal (solo reps)</option>
                    </select>
                </div>
                <div class="stats-form-grid">
                    <div class="form-group">
                        <label data-t="rest_between_sets">${t('rest_between_sets', state.language)}</label>
                        <input type="number" id="ex-rest-sets" value="60" min="0">
                    </div>
                    <div class="form-group">
                        <label data-t="rest_between_exercises">${t('rest_between_exercises', state.language)}</label>
                        <input type="number" id="ex-rest-exercises" value="120" min="0">
                    </div>
                </div>
                <button type="submit" id="ex-save-btn" class="primary-btn" style="width: 100%; margin-top: 10px;" data-t="confirm">${t('confirm', state.language)}</button>
            </form>
        </div>
    </div>

    <!-- Modal for replacing exercise -->
    <div id="replace-exercise-modal" class="modal">
        <div class="modal-content" style="max-width: 400px;">
            <span class="close-btn">&times;</span>
            <h2 data-t="replace_exercise">${t('replace_exercise', state.language)}</h2>
            <div class="form-group" style="margin-top: 1rem;">
                <label data-t="prompt_exercise_name">Nuevo nombre:</label>
                <input type="text" id="replace-ex-name" required>
            </div>
            <div class="form-group">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" id="replace-ex-keep-prog" checked>
                    <span data-t="keep_progression">${t('keep_progression', state.language)}</span>
                </label>
            </div>
            <button id="confirm-replace-btn" class="primary-btn" style="width: 100%;">Reemplazar</button>
        </div>
    </div>

    <!-- Modal for Active Workout Session -->
    <div id="workout-session-modal" class="modal">
        <div class="modal-content" style="max-width: 600px; height: 90vh; display: flex; flex-direction: column;">
            <span class="close-btn">&times;</span>
            <h2 id="workout-session-title">Entrenamiento</h2>
            <div id="workout-exercises-list" style="flex: 1; overflow-y: auto; margin: 1rem 0; border: 1px solid var(--border); border-radius: 8px; padding: 10px;">
                <!-- Current session exercises here -->
            </div>
            <div style="display: flex; gap: 10px;">
                <button id="cancel-workout-btn" class="secondary-btn" style="flex: 1;">Cancelar</button>
                <button id="finish-workout-btn" class="primary-btn" style="flex: 2;" data-t="finish_workout">${t('finish_workout', state.language)}</button>
            </div>
        </div>
    </div>

    <!-- Compact Set Editor Popup -->
    <div id="set-log-popup" class="modal" style="z-index: 1500; background: rgba(0,0,0,0.7);">
        <div class="modal-content" style="max-width: 320px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); margin: 0; padding: 1.5rem;">
            <div id="set-log-header" style="text-align: center; margin-bottom: 1rem;">
                <h3 id="set-log-title" style="color: var(--secondary); font-size: 1rem; margin-bottom: 4px;">Serie 1 de 3</h3>
                <div id="set-log-ex-name" style="font-size: 0.8rem; color: var(--text-light);">Press de Banca</div>
            </div>
            
            <div class="form-group">
                <label style="font-size: 0.75rem;">Peso (kg)</label>
                <div style="display: flex; gap: 5px; align-items: center;">
                    <button class="secondary-btn quick-adj" data-delta="-2.5" style="padding: 8px;">-2.5</button>
                    <input type="number" id="set-log-weight" step="0.5" style="text-align: center; font-size: 1.1rem; font-weight: bold; flex: 1;">
                    <button class="secondary-btn quick-adj" data-delta="2.5" style="padding: 8px;">+2.5</button>
                </div>
            </div>

            <div class="form-group">
                <label style="font-size: 0.75rem;">Repeticiones</label>
                <div style="display: flex; gap: 5px; align-items: center;">
                    <button class="secondary-btn quick-adj" data-delta="-1" style="padding: 8px;">-1</button>
                    <input type="number" id="set-log-reps" style="text-align: center; font-size: 1.1rem; font-weight: bold; flex: 1;">
                    <button class="secondary-btn quick-adj" data-delta="1" style="padding: 8px;">+1</button>
                </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 1.5rem;">
                <button id="set-log-save-btn" class="primary-btn" style="width: 100%; padding: 12px; font-size: 0.95rem;">Guardar y seguir</button>
                <button id="set-log-cancel-btn" class="secondary-btn" style="width: 100%; padding: 8px; opacity: 0.7; font-size: 0.8rem;">Cancelar</button>
            </div>
        </div>
    </div>

    <!-- Modal for Exercise Progression Charts -->
    <div id="progression-modal" class="modal">
        <div class="modal-content" style="max-width: 650px;">
            <span class="close-btn">&times;</span>
            <h2 data-t="progression_chart_title">${t('progression_chart_title', state.language)}</h2>
            <div class="form-group" style="margin-top: 1rem;">
                <label>Ejercicio / Grupo de Progresión</label>
                <select id="progression-group-select" class="settings-select"></select>
            </div>
            <div class="modal-tabs" style="margin-bottom: 10px;">
                <button class="tab-btn active" data-metric="topSet">Top Set</button>
                <button class="tab-btn" data-metric="volume">Volumen</button>
                <button class="tab-btn" data-metric="sets">Series</button>
            </div>
            <div style="height: 300px; position: relative;">
                <canvas id="progression-chart"></canvas>
            </div>
        </div>
    </div>
`;