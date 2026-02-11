import { t } from './i18n.js';
import { state } from './state.js';

export const statsModals = `
    <!-- Modal for Exercise Progression Charts -->
    <div id="progression-modal" class="modal">
        <div class="modal-content" style="max-width: 650px;">
            <span class="close-btn">&times;</span>
            <h2 data-t="progression_chart_title">${t('progression_chart_title', state.language)}</h2>
            
            <div style="display: flex; gap: 10px; align-items: flex-end; margin-top: 1rem;">
                <div class="form-group" style="flex: 1; margin-bottom: 0;">
                    <label>Ejercicio / Grupo de Progresión</label>
                    <select id="progression-group-select" class="settings-select"></select>
                </div>
                <button id="add-manual-log-btn" class="add-mini-btn" style="height: 38px; padding: 0 12px; border-color: var(--secondary); color: var(--secondary);">+ Añadir sesión pasada</button>
            </div>

            <div class="modal-tabs" style="margin-top: 15px; margin-bottom: 10px;">
                <button class="tab-btn active" data-metric="topSet">Top Set</button>
                <button class="tab-btn" data-metric="volume">Volumen</button>
                <button class="tab-btn" data-metric="sets">Series</button>
            </div>
            <div style="height: 250px; position: relative;">
                <canvas id="progression-chart"></canvas>
            </div>
            <div id="progression-history-container" style="margin-top: 1.5rem; border-top: 1px solid var(--border); padding-top: 1rem;">
                <h3 style="font-size: 0.85rem; color: var(--text-light); margin-bottom: 0.5rem; text-transform: uppercase;">Historial de Notas y Sesiones</h3>
                <div id="progression-history-list" class="library-list" style="max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.2);">
                    <!-- History and notes will be injected here -->
                </div>
            </div>
        </div>
    </div>

    <!-- Modal for Manual Log Entry (Past data) -->
    <div id="manual-log-modal" class="modal" style="z-index: 1600;">
        <div class="modal-content" style="max-width: 400px;">
            <span class="close-btn">&times;</span>
            <h2 id="manual-log-title">Registrar Sesión Pasada</h2>
            <input type="hidden" id="manual-log-id">
            
            <div class="form-group" style="margin-top: 1rem;">
                <label>Fecha</label>
                <input type="date" id="manual-log-date" class="settings-select">
            </div>

            <div id="manual-log-sets-container" style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 8px; font-size: 0.85rem; color: var(--text-light);">Series</label>
                <div style="display: flex; gap: 8px; margin-bottom: 4px; font-size: 0.65rem; color: var(--text-light); font-weight: bold; text-transform: uppercase; padding-left: 2px;">
                    <div style="width: 58px; text-align: center;">Peso</div>
                    <div style="width: 10px;"></div>
                    <div style="width: 58px; text-align: center;">Reps</div>
                </div>
                <div id="manual-log-sets-list" style="display: flex; flex-direction: column; gap: 8px;">
                    <!-- Manual sets go here -->
                </div>
                <button id="manual-log-add-set" class="add-mini-btn" style="margin-top: 10px; width: 100%;">+ Añadir Serie</button>
            </div>

            <div class="form-group">
                <label>Notas</label>
                <textarea id="manual-log-notes" rows="2" style="width: 100%; background: var(--input-bg); color: var(--text); border: 1px solid var(--border); border-radius: 6px; padding: 8px; font-size: 0.85rem; resize: none;"></textarea>
            </div>

            <button id="manual-log-save-btn" class="primary-btn" style="width: 100%; margin-top: 10px;">Guardar Registro</button>
        </div>
    </div>
`;