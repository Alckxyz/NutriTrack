import { t } from './i18n.js';
import { state } from './state.js';

export const settingsModals = `
    <!-- Modal for Settings -->
    <div id="settings-modal" class="modal">
        <div class="modal-content" style="max-width: 450px;">
            <span class="close-btn">&times;</span>
            <h2 data-t="settings_title">${t('settings_title', state.language)}</h2>
            
            <div class="settings-section">
                <h3 data-t="settings_preferences">${t('settings_preferences', state.language)}</h3>
                <div class="form-group">
                    <label data-t="display_name_label">${t('display_name_label', state.language)}</label>
                    <div style="display: flex; gap: 8px;">
                        <input type="text" id="display-name-input" placeholder="Tu nombre...">
                        <button id="save-profile-btn" class="primary-btn" data-t="save_profile">${t('save_profile', state.language)}</button>
                    </div>
                </div>
                <div class="form-group">
                    <label data-t="mode_label">${t('mode_label', state.language)}</label>
                    <select id="mode-selector" class="settings-select">
                        <option value="standard" data-t="mode_standard">${t('mode_standard', state.language)}</option>
                        <option value="daily" data-t="mode_daily">${t('mode_daily', state.language)}</option>
                    </select>
                </div>
            </div>

            <div class="settings-section">
                <h3 data-t="settings_data_management">${t('settings_data_management', state.language)}</h3>
                <div class="settings-grid">
                    <button id="export-db-btn" class="secondary-btn" data-t="export_db">${t('export_db', state.language)}</button>
                    <button id="import-db-btn" class="secondary-btn" data-t="import_db">${t('import_db', state.language)}</button>
                </div>
            </div>

            <div class="settings-section">
                <h3 data-t="daily_goals_title">${t('daily_goals_title', state.language)}</h3>
                <div class="stats-form-grid">
                    <div class="form-group">
                        <label data-t="protein">${t('protein', state.language)} (g)</label>
                        <input type="number" id="goal-protein" step="0.1" placeholder="150">
                    </div>
                    <div class="form-group">
                        <label data-t="carbs">${t('carbs', state.language)} (g)</label>
                        <input type="number" id="goal-carbs" step="0.1" placeholder="200">
                    </div>
                    <div class="form-group">
                        <label data-t="fat">${t('fat', state.language)} (g)</label>
                        <input type="number" id="goal-fat" step="0.1" placeholder="70">
                    </div>
                    <div class="form-group">
                        <label data-t="fiber">${t('fiber', state.language)} (g)</label>
                        <input type="number" id="goal-fiber" step="0.1" placeholder="30">
                    </div>
                    <div class="form-group" style="grid-column: span 2; text-align: center; background: #252525; padding: 10px; border-radius: 6px; border: 1px solid var(--border); margin-top: 5px;">
                        <div id="goal-calories-display" style="font-weight: bold; color: var(--primary); font-size: 0.95rem;">Calculated Calories: 0 kcal</div>
                        <input type="hidden" id="goal-calories">
                    </div>
                </div>
                <div class="settings-grid" style="margin-top: 10px;">
                    <button id="save-goals-btn" class="primary-btn" data-t="save_goals">${t('save_goals', state.language)}</button>
                    <button id="open-wizard-btn" class="secondary-btn" data-t="calculate_auto">${t('calculate_auto', state.language)}</button>
                </div>
            </div>

            <div class="settings-section">
                <h3 data-t="settings_plans">${t('settings_plans', state.language)}</h3>
                <div class="settings-grid">
                    <button id="export-plan-btn" class="primary-btn" data-t="export_plan">${t('export_plan', state.language)}</button>
                    <button id="import-plan-btn" class="primary-btn" data-t="import_plan">${t('import_plan', state.language)}</button>
                </div>
            </div>

            <div class="settings-section">
                <h3 data-t="settings_visible_micros">Micronutrientes Visibles</h3>
                <p style="font-size: 0.75rem; color: var(--text-light); margin-bottom: 10px;">Selecciona qué vitaminas y minerales quieres ver en el resumen diario.</p>
                <div id="visible-micros-selection" style="display: flex; flex-direction: column; gap: 8px; max-height: 180px; overflow-y: auto; padding: 10px; background: var(--input-bg); border-radius: 6px; border: 1px solid var(--border);">
                    <!-- Checkboxes will be injected here -->
                </div>
            </div>
        </div>
    </div>

    <!-- Goals Wizard Modal -->
    <div id="wizard-modal" class="modal">
        <div class="modal-content" style="max-width: 450px;">
            <span class="close-btn">&times;</span>
            <h2 data-t="wizard_title">${t('wizard_title', state.language)}</h2>
            <div class="form-group">
                <label data-t="sex_label">${t('sex_label', state.language)}</label>
                <select id="wiz-sex" class="settings-select">
                    <option value="male" data-t="sex_male">${t('sex_male', state.language)}</option>
                    <option value="female" data-t="sex_female">${t('sex_female', state.language)}</option>
                </select>
            </div>
            <div class="stats-form-grid">
                <div class="form-group">
                    <label data-t="age_label">${t('age_label', state.language)}</label>
                    <input type="number" id="wiz-age" placeholder="25">
                </div>
                <div class="form-group">
                    <label data-t="height_label">${t('height_label', state.language)}</label>
                    <input type="number" id="wiz-height" placeholder="175">
                </div>
            </div>
            <div class="form-group">
                <label data-t="weight_label">${t('weight_label', state.language)}</label>
                <input type="number" id="wiz-weight" placeholder="70" step="0.1">
            </div>
            <div class="form-group">
                <label data-t="activity_label">${t('activity_label', state.language)}</label>
                <p class="helper-text" data-t="wiz_activity_prompt" style="font-size: 0.75rem; color: var(--text-light); margin-bottom: 8px;">${t('wiz_activity_prompt', state.language)}</p>
                <div id="wiz-activity-list" class="activity-list">
                    <label class="activity-option">
                        <input type="radio" name="wiz-activity" value="1.2" checked>
                        <div class="option-content">
                            <strong data-t="act_sedentary">${t('act_sedentary', state.language)} (1.2)</strong>
                            <span data-t="act_sedentary_desc">${t('act_sedentary_desc', state.language)}</span>
                        </div>
                    </label>
                    <label class="activity-option">
                        <input type="radio" name="wiz-activity" value="1.375">
                        <div class="option-content">
                            <strong data-t="act_light">${t('act_light', state.language)} (1.375)</strong>
                            <span data-t="act_light_desc">${t('act_light_desc', state.language)}</span>
                        </div>
                    </label>
                    <label class="activity-option">
                        <input type="radio" name="wiz-activity" value="1.55">
                        <div class="option-content">
                            <strong data-t="act_moderate">${t('act_moderate', state.language)} (1.55)</strong>
                            <span data-t="act_moderate_desc">${t('act_moderate_desc', state.language)}</span>
                        </div>
                    </label>
                    <label class="activity-option">
                        <input type="radio" name="wiz-activity" value="1.725">
                        <div class="option-content">
                            <strong data-t="act_active">${t('act_active', state.language)} (1.725)</strong>
                            <span data-t="act_active_desc">${t('act_active_desc', state.language)}</span>
                        </div>
                    </label>
                    <label class="activity-option">
                        <input type="radio" name="wiz-activity" value="1.9">
                        <div class="option-content">
                            <strong data-t="act_very_active">${t('act_very_active', state.language)} (1.9)</strong>
                            <span data-t="act_very_active_desc">${t('act_very_active_desc', state.language)}</span>
                        </div>
                    </label>
                </div>
            </div>
            <div class="stats-form-grid">
                <div class="form-group">
                    <label data-t="goal_label">${t('goal_label', state.language)}</label>
                    <select id="wiz-goal" class="settings-select">
                        <option value="lose" data-t="goal_lose">${t('goal_lose', state.language)}</option>
                        <option value="maintain" data-t="goal_maintain">${t('goal_maintain', state.language)}</option>
                        <option value="gain" data-t="goal_gain">${t('goal_gain', state.language)}</option>
                    </select>
                </div>
                <div id="wiz-speed-group" class="form-group">
                    <label data-t="speed_label">${t('speed_label', state.language)}</label>
                    <select id="wiz-speed" class="settings-select">
                        <option value="slow" data-t="speed_slow">${t('speed_slow', state.language)}</option>
                        <option value="normal" data-t="speed_normal" selected>${t('speed_normal', state.language)}</option>
                        <option value="fast" data-t="speed_fast">${t('speed_fast', state.language)}</option>
                    </select>
                </div>
            </div>
            <div class="form-group" style="grid-column: 1 / -1;">
                <label data-t="wizard_training_label">${t('wizard_training_label', state.language)}</label>
                <div id="wiz-training-list" class="activity-list">
                    <label class="activity-option">
                        <input type="radio" name="wiz-training" value="light_cardio" checked>
                        <div class="option-content">
                            <strong data-t="train_light_cardio">${t('train_light_cardio', state.language)}</strong>
                            <span data-t="train_light_cardio_desc">${t('train_light_cardio_desc', state.language)}</span>
                        </div>
                    </label>
                    <label class="activity-option">
                        <input type="radio" name="wiz-training" value="intense_cardio">
                        <div class="option-content">
                            <strong data-t="train_intense_cardio">${t('train_intense_cardio', state.language)}</strong>
                            <span data-t="train_intense_cardio_desc">${t('train_intense_cardio_desc', state.language)}</span>
                        </div>
                    </label>
                    <label class="activity-option">
                        <input type="radio" name="wiz-training" value="strength">
                        <div class="option-content">
                            <strong data-t="train_strength">${t('train_strength', state.language)}</strong>
                            <span data-t="train_strength_desc">${t('train_strength_desc', state.language)}</span>
                        </div>
                    </label>
                    <label class="activity-option">
                        <input type="radio" name="wiz-training" value="mixed">
                        <div class="option-content">
                            <strong data-t="train_mixed">${t('train_mixed', state.language)}</strong>
                            <span data-t="train_mixed_desc">${t('train_mixed_desc', state.language)}</span>
                        </div>
                    </label>
                    <label class="activity-option">
                        <input type="radio" name="wiz-training" value="performance">
                        <div class="option-content">
                            <strong data-t="train_performance">${t('train_performance', state.language)}</strong>
                            <span data-t="train_performance_desc">${t('train_performance_desc', state.language)}</span>
                        </div>
                    </label>
                </div>
            </div>
            <div id="wizard-results" class="hidden" style="margin-top: 15px; padding: 12px; background: rgba(129, 199, 132, 0.1); border: 1px solid var(--primary); border-radius: 8px;">
                <h4 style="color: var(--primary); margin-bottom: 8px; font-size: 0.9rem;">Calculation Summary:</h4>
                <div id="wizard-summary-text" style="font-size: 0.8rem; line-height: 1.4; color: var(--text);"></div>
            </div>
            <div class="settings-grid" style="margin-top: 15px;">
                <button id="calculate-btn" class="secondary-btn" style="width: 100%;">Calculate</button>
                <button id="calculate-apply-btn" class="primary-btn hidden" style="width: 100%;" data-t="calculate_apply">${t('calculate_apply', state.language)}</button>
            </div>
        </div>
    </div>
`;