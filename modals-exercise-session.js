import { t } from './i18n.js';
import { state } from './state.js';

export const sessionModals = `
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
                <label id="set-log-weight-label" style="font-size: 0.75rem;">Peso (kg)</label>
                <div style="display: flex; gap: 5px; align-items: center;">
                    <button class="secondary-btn quick-adj" data-delta="-2.5" style="padding: 8px;">-2.5</button>
                    <input type="number" id="set-log-weight" step="0.5" style="text-align: center; font-size: 1.1rem; font-weight: bold; flex: 1;">
                    <button class="secondary-btn quick-adj" data-delta="2.5" style="padding: 8px;">+2.5</button>
                </div>
                <div id="set-log-total-weight-display" class="hidden" style="font-size: 0.7rem; color: var(--primary); text-align: center; margin-top: 4px; font-weight: bold;"></div>
            </div>

            <div class="form-group">
                <label style="font-size: 0.75rem;">Repeticiones</label>
                <div style="display: flex; gap: 5px; align-items: center;">
                    <button class="secondary-btn quick-adj" data-delta="-1" style="padding: 8px;">-1</button>
                    <input type="number" id="set-log-reps" style="text-align: center; font-size: 1.1rem; font-weight: bold; flex: 1;">
                    <button class="secondary-btn quick-adj" data-delta="1" style="padding: 8px;">+1</button>
                </div>
            </div>

            <div id="set-log-partial-reps-container" class="form-group hidden">
                <label style="font-size: 0.75rem;" data-t="partial_reps_label">Repeticiones Parciales</label>
                <div style="display: flex; gap: 5px; align-items: center;">
                    <button class="secondary-btn quick-adj" data-delta="-1" style="padding: 8px;">-1</button>
                    <input type="number" id="set-log-partial-reps" style="text-align: center; font-size: 1.1rem; font-weight: bold; flex: 1;">
                    <button class="secondary-btn quick-adj" data-delta="1" style="padding: 8px;">+1</button>
                </div>
            </div>

            <div id="set-log-notes-container" class="form-group hidden" style="margin-top: 1rem; border-top: 1px dashed var(--border); padding-top: 1rem;">
                <label style="font-size: 0.75rem;" data-t="exercise_notes_label">Notas del ejercicio (opcional)</label>
                <textarea id="set-log-notes" rows="2" style="width: 100%; background: var(--input-bg); color: var(--text); border: 1px solid var(--border); border-radius: 6px; padding: 8px; font-size: 0.85rem; resize: none;" data-t-placeholder="exercise_notes_placeholder" placeholder="¿Cómo te sentiste?"></textarea>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 1.5rem;">
                <button id="set-log-save-btn" class="primary-btn" style="width: 100%; padding: 12px; font-size: 0.95rem;">Guardar y seguir</button>
                <button id="set-log-cancel-btn" class="secondary-btn" style="width: 100%; padding: 8px; opacity: 0.7; font-size: 0.8rem;">Cancelar</button>
            </div>
        </div>
    </div>

    <!-- Modal for Exercise Suggestions -->
    <div id="suggestion-modal" class="modal" style="z-index: 1550;">
        <div class="modal-content" style="max-width: 350px; text-align: center; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); margin: 0;">
            <span class="close-btn">&times;</span>
            <div style="font-size: 2.5rem; margin-bottom: 10px;">✨</div>
            <h2 id="suggestion-modal-title" style="margin-bottom: 1rem; color: var(--secondary); font-size: 1.2rem;">Sugerencia de la IA</h2>
            <div id="suggestion-target-info" style="font-weight: bold; font-size: 1.1rem; margin-bottom: 15px; color: var(--text);"></div>
            <p id="suggestion-modal-message" style="margin-bottom: 1.5rem; color: var(--text-light); font-size: 0.9rem; line-height: 1.4;"></p>
            <button class="primary-btn close-suggestion-btn" style="width: 100%; padding: 12px;">Entendido</button>
        </div>
    </div>
`;