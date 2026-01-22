import { t } from './i18n.js';
import { state } from './state.js';

export const libraryModals = `
    <!-- Modal for adding/editing food in Food List -->
    <div id="db-modal" class="modal">
        <div class="modal-content">
            <span class="close-btn">&times;</span>
            <h2 id="db-modal-title" data-t="db_modal_title_add">${t('db_modal_title_add', state.language)}</h2>
            <button id="paste-food-btn" class="secondary-btn" data-t="paste_food" style="width: 100%; margin-bottom: 1.5rem; border: 1px dashed var(--secondary); color: var(--secondary);">${t('paste_food', state.language)}</button>
            <form id="new-food-form">
                <input type="hidden" id="db-edit-id">
                <div class="form-group">
                    <label data-t="name_label">${t('name_label', state.language)}</label>
                    <input type="text" id="db-name" required>
                </div>
                <div class="stats-form-grid">
                    <div class="form-group">
                        <label data-t="base_amount_label">${t('base_amount_label', state.language)}</label>
                        <input type="number" id="db-base-amount" step="any" min="0.001" value="100" required>
                    </div>
                    <div class="form-group">
                        <label data-t="default_unit_label">${t('default_unit_label', state.language)}</label>
                        <input type="text" id="db-default-unit" class="settings-select" list="default-units-list" placeholder="e.g. g, ml, cup, glass...">
                        <datalist id="default-units-list">
                            <option value="g">
                            <option value="ml">
                            <option value="unit">
                            <option value="cup">
                            <option value="tbsp">
                            <option value="tsp">
                            <option value="oz">
                        </datalist>
                    </div>
                </div>
                <div class="stats-form-grid">
                    <div class="form-group">
                        <label><span data-t="protein">${t('protein', state.language)}</span> (g)*</label>
                        <input type="number" id="db-protein" step="0.1" required>
                    </div>
                    <div class="form-group">
                        <label><span data-t="carbs">${t('carbs', state.language)}</span> (g)*</label>
                        <input type="number" id="db-carbs" step="0.1" required>
                    </div>
                    <div class="form-group">
                        <label><span data-t="fat">${t('fat', state.language)}</span> (g)*</label>
                        <input type="number" id="db-fat" step="0.1" required>
                    </div>
                </div>

                <div class="dynamic-nutrients-section">
                    <div class="section-header-mini">
                        <h3 data-t="vitamins">${t('vitamins', state.language)}</h3>
                        <button type="button" class="add-mini-btn" id="add-vitamin-btn" data-t="add_btn">${t('add_btn', state.language)}</button>
                    </div>
                    <div id="db-vitamins-container" class="nutrients-input-list"></div>

                    <div class="section-header-mini">
                        <h3 data-t="minerals">${t('minerals', state.language)}</h3>
                        <button type="button" class="add-mini-btn" id="add-mineral-btn" data-t="add_btn">${t('add_btn', state.language)}</button>
                    </div>
                    <div id="db-minerals-container" class="nutrients-input-list"></div>
                </div>

                <div class="conversions-section">
                    <div class="section-header-mini">
                        <h3 data-t="conversions_title">${t('conversions_title', state.language)}</h3>
                        <button type="button" class="add-mini-btn" id="add-conversion-btn" data-t="add_unit_conversion">${t('add_unit_conversion', state.language)}</button>
                    </div>
                    <div id="db-conversions-container" class="nutrients-input-list"></div>
                </div>

                <button type="submit" id="db-save-btn" class="primary-btn" style="width: 100%; margin-top: 20px;" data-t="save_to_list">${t('save_to_list', state.language)}</button>
            </form>
        </div>
    </div>

    <!-- Modal for managing the food list -->
    <div id="library-modal" class="modal">
        <div class="modal-content" style="max-width: 600px;">
            <span class="close-btn">&times;</span>
            <h2 data-t="library_title">${t('library_title', state.language)}</h2>
            <div class="library-controls">
                <input type="text" id="library-search-input" placeholder="${t('search_library_placeholder', state.language)}" data-t-placeholder="search_library_placeholder" style="flex: 1; padding:10px; border-radius:6px; border:1px solid var(--border); background:var(--input-bg); color:var(--text);">
                <select id="library-sort-select" style="padding:10px; border-radius:6px; border:1px solid var(--border); background:var(--input-bg); color:var(--text); cursor:pointer;">
                    <option value="name" data-t="sort_name">${t('sort_name', state.language)}</option>
                    <option value="newest" data-t="sort_newest">${t('sort_newest', state.language)}</option>
                    <option value="edited" data-t="sort_edited">${t('sort_edited', state.language)}</option>
                </select>
            </div>
            <div id="library-list" class="library-list"></div>
        </div>
    </div>
`;