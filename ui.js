/**
 * UI Refactor: The logic previously in ui.js has been split into 
 * specific modules for better maintainability.
 */
import { renderMeals } from './ui-meals.js';
import { updateSummary } from './ui-summary.js';
import { renderLibraryList, renderFoodResults, renderRecipeLibraryList } from './ui-library.js';

// Tombstones:
// removed function renderMeals() {} (moved to ui-meals.js)
// removed function updateSummary() {} (moved to ui-summary.js)
// removed function renderStat() {} (moved to ui-summary.js)
// removed function renderLibraryList() {} (moved to ui-library.js)
// removed function renderFoodResults() {} (moved to ui-library.js)
// removed function renderRecipeLibraryList() {} (moved to ui-library.js)

export function renderAll(options) {
    renderMeals({ ...options, onRenderAll: () => renderAll(options) });
    updateSummary();
}

export { 
    renderMeals, 
    updateSummary, 
    renderLibraryList, 
    renderFoodResults, 
    renderRecipeLibraryList 
};