import { t } from './i18n.js';
import { state } from './state.js';

export const editorModals = `
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
                    <input type="text" id="ex-name" required placeholder="Ej: Press de Banca" list="exercise-names-list">
                    <datalist id="exercise-names-list"></datalist>
                </div>
                <div class="stats-form-grid">
                    <div class="form-group">
                        <label data-t="sets">${t('sets', state.language)}</label>
                        <input type="number" id="ex-sets" value="3" min="1">
                    </div>
                    <div class="form-group">
                        <label id="ex-reps-label" data-t="reps">${t('reps', state.language)}</label>
                        <div style="display: flex; gap: 4px; align-items: center;">
                            <input type="number" id="ex-reps" value="10" min="1" placeholder="Objetivo" style="flex: 1;">
                            <div style="display: flex; flex-direction: column; gap: 2px;">
                                <input type="number" id="ex-min-reps" placeholder="Min" style="font-size: 0.75rem; padding: 4px; width: 60px; height: 26px;">
                                <input type="number" id="ex-max-reps" placeholder="Max" style="font-size: 0.75rem; padding: 4px; width: 60px; height: 26px;">
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label data-t="weight">${t('weight', state.language)}</label>
                        <div style="display: flex; gap: 4px;">
                            <input type="number" id="ex-weight" value="0" step="any" min="0" style="flex: 1;">
                            <select id="ex-weight-unit" class="settings-select" style="width: 85px; padding: 10px;">
                                <option value="kg">kg</option>
                                <option value="plates" data-t="unit_plates">${t('unit_plates', state.language)}</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div id="ex-weight-per-plate-group" class="form-group hidden">
                    <label data-t="weight_per_plate_label">Peso por placa (opcional)</label>
                    <input type="number" id="ex-weight-per-plate" placeholder="Ej: 5" step="0.5" min="0">
                </div>

                <div class="stats-form-grid">
                    <div class="form-group">
                        <label data-t="tracking_mode_label">Modo seguimiento</label>
                        <select id="ex-tracking-mode" class="settings-select">
                            <option value="reps" data-t="tracking_mode_reps">Repeticiones</option>
                            <option value="time" data-t="tracking_mode_time">Tiempo</option>
                        </select>
                    </div>
                    <div id="time-mode-group" class="form-group hidden">
                        <label data-t="time_mode_label">Modo cronómetro</label>
                        <select id="ex-time-mode" class="settings-select">
                            <option value="single" data-t="time_mode_single">Un solo cronómetro</option>
                            <option value="unilateral" data-t="time_mode_unilateral">Dos (Unilateral)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label data-t="load_mode_label">Peso</label>
                        <select id="ex-load-mode" class="settings-select">
                            <option value="external_total" data-t="load_mode_total">Total</option>
                            <option value="external_single" data-t="load_mode_single">Por mano</option>
                            <option value="bodyweight" data-t="load_mode_bodyweight">Corporal</option>
                        </select>
                    </div>
                </div>
                <div class="stats-form-grid">
                    <div class="form-group">
                        <label data-t="rest_between_sets">${t('rest_between_sets', state.language)}</label>
                        <input type="number" id="ex-rest-sets" value="1" min="0" step="0.1">
                    </div>
                    <div class="form-group">
                        <label data-t="rest_between_exercises">${t('rest_between_exercises', state.language)}</label>
                        <input type="number" id="ex-rest-exercises" value="2" min="0" step="0.1">
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
`;