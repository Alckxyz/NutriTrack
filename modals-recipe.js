import { t } from './i18n.js';
import { state } from './state.js';

export const recipeModals = `
    <!-- Modal for viewing recipe ingredients -->
    <div id="recipe-details-modal" class="modal">
        <div class="modal-content" style="max-width: 450px;">
            <span class="close-btn">&times;</span>
            <h2 id="recipe-details-title" style="margin-bottom: 1rem;">Recipe Ingredients</h2>
            <div id="recipe-details-list" class="meal-items" style="max-height: 400px; overflow-y: auto; border: 1px solid var(--border); border-radius: 6px;">
                <!-- Ingredients will be listed here -->
            </div>
            <button class="primary-btn close-details-btn" style="width: 100%; margin-top: 1.5rem;">Cerrar</button>
        </div>
    </div>

    <!-- Modal for managing recipes -->
    <div id="recipe-library-modal" class="modal">
        <div class="modal-content" style="max-width: 600px;">
            <span class="close-btn">&times;</span>
            <h2 data-t="recipe_library_title">${t('recipe_library_title', state.language)}</h2>
            <div class="library-controls">
                <input type="text" id="recipe-library-search" placeholder="${t('search_recipes_placeholder', state.language)}" data-t-placeholder="search_recipes_placeholder" style="flex: 1; padding:10px; border-radius:6px; border:1px solid var(--border); background:var(--input-bg); color:var(--text);">
                <button id="create-new-recipe-btn" class="primary-btn" data-t="create_recipe">${t('create_recipe', state.language)}</button>
            </div>
            <div id="recipe-library-list" class="library-list"></div>
        </div>
    </div>

    <!-- Modal for editing a specific recipe -->
    <div id="recipe-editor-modal" class="modal">
        <div class="modal-content" style="max-width: 600px;">
            <span class="close-btn">&times;</span>
            <h2 id="recipe-editor-title" data-t="recipe_editor_title">${t('recipe_editor_title', state.language)}</h2>
            <div class="stats-form-grid">
                <div class="form-group">
                    <label data-t="recipe_name_label">${t('recipe_name_label', state.language)}</label>
                    <input type="text" id="recipe-name-input" placeholder="e.g. Grandma's Lasagna">
                </div>
                <div class="form-group">
                    <label data-t="recipe_portions_label">${t('recipe_portions_label', state.language)}</label>
                    <input type="number" id="recipe-portions-input" value="1" min="1" step="1">
                </div>
            </div>
            <div class="section-header-mini">
                <h3 data-t="recipe_ingredients">${t('recipe_ingredients', state.language)}</h3>
                <button id="recipe-add-ingredient-btn" class="add-mini-btn" data-t="add_food_btn">${t('add_food_btn', state.language)}</button>
            </div>
            <div id="recipe-ingredients-list" class="meal-items" style="max-height: 300px; overflow-y: auto; border: 1px solid var(--border); border-radius: 6px; margin-bottom: 1rem;"></div>
            <div id="recipe-summary-preview" class="meal-nutrients-grid" style="margin-bottom: 1.5rem; padding: 10px; background: #252525; border-radius: 6px;"></div>
            <button id="save-recipe-btn" class="primary-btn" style="width: 100%;" data-t="save_recipe">${t('save_recipe', state.language)}</button>
        </div>
    </div>
`;