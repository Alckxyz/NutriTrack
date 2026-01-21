import { t } from './i18n.js';
import { state } from './state.js';

export const weightModals = `
    <!-- Modal for Body Weight Tracking -->
    <div id="weight-modal" class="modal">
        <div class="modal-content" style="max-width: 650px;">
            <span class="close-btn">&times;</span>
            <h2 data-t="weight_modal_title">${t('weight_modal_title', state.language)}</h2>
            
            <div class="weight-entry-section" style="background: #252525; padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem; border: 1px solid var(--border);">
                <div class="stats-form-grid" style="align-items: flex-end;">
                    <div class="form-group" style="margin-bottom: 0;">
                        <label data-t="weight_label_input">${t('weight_label_input', state.language)}</label>
                        <div style="display: flex; gap: 8px;">
                            <input type="number" id="weight-input" step="0.1" placeholder="70.0" style="flex: 1;">
                            <select id="weight-unit-select" class="settings-select" style="width: 80px;">
                                <option value="kg">kg</option>
                                <option value="lb">lb</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                         <label data-t="weight_note_placeholder">${t('weight_note_placeholder', state.language)}</label>
                         <input type="text" id="weight-note" placeholder="...">
                    </div>
                    <button id="save-weight-btn" class="primary-btn" style="height: 42px;">${t('save_weight_btn', state.language)}</button>
                </div>
            </div>

            <div class="weight-dashboard-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                <div class="weight-chart-container">
                    <div class="section-header-mini" style="margin-top:0">
                        <h3 data-t="weight_trend_title">${t('weight_trend_title', state.language)}</h3>
                        <div class="chart-ranges" style="display: flex; gap: 4px;">
                             <button class="add-mini-btn range-btn" data-range="7">7d</button>
                             <button class="add-mini-btn range-btn active" data-range="30">30d</button>
                             <button class="add-mini-btn range-btn" data-range="all">All</button>
                        </div>
                    </div>
                    <div style="height: 220px; position: relative;">
                        <canvas id="weight-chart"></canvas>
                    </div>
                    <div id="weight-analysis-panel" style="margin-top: 1rem; font-size: 0.8rem; line-height: 1.5; color: var(--text-light); border-top: 1px solid var(--border); padding-top: 1rem;">
                        <!-- AI analysis tips here -->
                    </div>
                </div>

                <div class="weight-history-container">
                    <div class="section-header-mini" style="margin-top:0">
                        <h3 data-t="weight_history_title">${t('weight_history_title', state.language)}</h3>
                    </div>
                    <div id="weight-history-list" class="library-list" style="max-height: 350px;">
                        <!-- Entries list here -->
                    </div>
                </div>
            </div>
        </div>
    </div>
`;