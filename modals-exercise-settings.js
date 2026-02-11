import { t } from './i18n.js';
import { state } from './state.js';

export const exerciseSettingsModals = `
    <!-- Modal for Exercise Settings -->
    <div id="exercise-settings-modal" class="modal">
        <div class="modal-content" style="max-width: 400px;">
            <span class="close-btn">&times;</span>
            <h2 data-t="exercise_settings_title">Ajustes de Entrenamiento</h2>
            
            <div class="settings-section" style="margin-top: 1.5rem;">
                <h3 data-t="settings_preferences">Preferencias</h3>
                <div class="form-group" style="display: flex; justify-content: space-between; align-items: center; background: var(--input-bg); padding: 12px; border-radius: 8px; border: 1px solid var(--border);">
                    <label data-t="enable_timer_label" style="margin-bottom: 0;">Temporizador de descanso</label>
                    <label class="switch">
                        <input type="checkbox" id="timer-enabled-checkbox">
                        <span class="slider round"></span>
                    </label>
                </div>
            </div>

            <div class="settings-section">
                <h3 data-t="settings_data_management">Gestión de Datos</h3>
                <div class="settings-grid">
                    <button id="export-routines-btn" class="secondary-btn" data-t="export_routines">Exportar Rutinas</button>
                    <button id="import-routines-btn" class="secondary-btn" data-t="import_routines">Importar Rutinas</button>
                </div>
            </div>
        </div>
    </div>
`;