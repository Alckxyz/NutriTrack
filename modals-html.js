import { foodModals } from './modals-food.js';
import { libraryModals } from './modals-library.js';
import { recipeModals } from './modals-recipe.js';
import { settingsModals } from './modals-settings.js';

// removed giant string literal containing all modals (moved to separate files)

export const modalsHtml = `
    ${foodModals}
    ${libraryModals}
    ${recipeModals}
    ${settingsModals}
`;