import { t } from './i18n.js';
import { state } from './state.js';

export const foodModals = `
    <!-- Modal for prompting meal name -->
    <div id="meal-prompt-modal" class="modal">
        <div class="modal-content" style="max-width: 350px; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); margin: 0;">
            <span class="close-btn">&times;</span>
            <h2 data-t="add_meal">Añadir Comida</h2>
            <div class="form-group" style="margin-top: 1rem;">
                <label data-t="prompt_new_meal">Nombre de la comida:</label>
                <input type="text" id="meal-prompt-input" placeholder="Ej: Merienda">
            </div>
            <button id="confirm-meal-btn" class="primary-btn" style="width: 100%;">Añadir</button>
        </div>
    </div>

    <!-- Modal for adding food to meal -->
    <div id="food-modal" class="modal">
        <div class="modal-content">
            <span class="close-btn">&times;</span>
            <h2 id="modal-title" data-t="modal_add_food_title">${t('modal_add_food_title', state.language)}</h2>
            <div id="food-search-section" class="food-selector">
                <div class="modal-tabs">
                    <button id="tab-btn-food" class="tab-btn active" data-t="tab_food">${t('tab_food', state.language)}</button>
                    <button id="tab-btn-recipes" class="tab-btn" data-t="tab_recipes">${t('tab_recipes', state.language)}</button>
                </div>
                <input type="text" id="food-search" placeholder="${t('search_placeholder', state.language)}" data-t-placeholder="search_placeholder">
                <div id="food-results" class="food-results"></div>
            </div>
            <div id="food-details-form" class="hidden">
                <button id="back-to-search-btn" class="secondary-btn" style="margin-bottom: 1rem; width: auto; padding: 4px 10px; font-size: 0.8rem;" data-t="back_to_search">${t('back_to_search', state.language)}</button>
                <p id="selected-food-display"><span data-t="selected_food">${t('selected_food', state.language)}</span> <strong id="selected-food-name"></strong></p>
                <p id="default-conv-hint" class="hidden" style="font-size: 0.7rem; color: var(--secondary); margin-bottom: 0.5rem; background: rgba(100, 181, 246, 0.1); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(100, 181, 246, 0.2);"></p>
                <div class="stats-form-grid">
                    <div class="form-group">
                        <label for="food-amount" id="food-amount-label" data-t="amount_label">${t('amount_label', state.language)}</label>
                        <input type="number" id="food-amount" value="100" step="any" min="0">
                    </div>
                    <div class="form-group">
                        <label data-t="unit_label">${t('unit_label', state.language)}</label>
                        <select id="food-unit-selector" class="settings-select" style="width: 100%; padding: 10px;"></select>
                    </div>
                </div>
                <button id="confirm-add-food" class="primary-btn" style="width:100%" data-t="confirm">${t('confirm', state.language)}</button>
            </div>
        </div>
    </div>

    <!-- Modal for pasting food text -->
    <div id="paste-modal" class="modal">
        <div class="modal-content">
            <span class="close-btn">&times;</span>
            <h2 data-t="paste_food">${t('paste_food', state.language)}</h2>
            <p style="font-size: 0.85rem; color: var(--text-light); margin-bottom: 0.5rem;">
                Pega el texto generado por una IA o desde una base de datos.
            </p>
            <button id="copy-prompt-btn" class="secondary-btn" style="width: 100%; margin-bottom: 1rem; font-size: 0.75rem; border: 1px solid var(--secondary); color: var(--secondary);" data-t="copy_prompt_btn">${t('copy_prompt_btn', state.language)}</button>
            <div class="paste-example-container" style="background: #111; padding: 10px; border-radius: 6px; margin-bottom: 1rem; border: 1px dashed #444;">
                <span style="font-size: 0.7rem; color: var(--secondary); display: block; margin-bottom: 4px;" data-t="paste_example_title">${t('paste_example_title', state.language)}:</span>
                <pre style="font-size: 0.7rem; color: #888; margin: 0; line-height: 1.2;">Arroz (cocido)
Proteína: 2.7
Carbohidratos: 28
Grasas: 0.3
Fibra: 0.4
Unidades:
g: 100
taza: 1
bolsa: 5
Vitaminas:
Vitamina B1: 0.02
Minerales:
Hierro: 0.4</pre>
            </div>
            <textarea id="paste-area" placeholder="Pegar aquí..." style="width: 100%; height: 180px; background: var(--input-bg); color: var(--text); border: 1px solid var(--border); border-radius: 6px; padding: 10px; margin-bottom: 1rem; font-family: monospace;"></textarea>
            <button id="confirm-paste-btn" class="primary-btn" style="width: 100%;" data-t="confirm">${t('confirm', state.language)}</button>
        </div>
    </div>
`;