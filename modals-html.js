import { foodModals } from './modals-food.js';
import { libraryModals } from './modals-library.js';
import { recipeModals } from './modals-recipe.js';
import { settingsModals } from './modals-settings.js';
import { weightModals } from './modals-weight.js';
import { exerciseModals } from './modals-exercise.js';

export const modalsHtml = `
    ${foodModals}
    ${libraryModals}
    ${recipeModals}
    ${settingsModals}
    ${weightModals}
    ${exerciseModals}

    <!-- Custom Confirmation Modal -->
    <div id="confirm-modal" class="modal" style="z-index: 9999;">
        <div class="modal-content" style="max-width: 350px; text-align: center; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); margin: 0;">
            <h2 id="confirm-modal-title" style="margin-bottom: 1rem; color: var(--text); font-size: 1.2rem;">Confirmar</h2>
            <p id="confirm-modal-message" style="margin-bottom: 2rem; color: var(--text-light); font-size: 0.9rem; line-height: 1.4;"></p>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button id="confirm-cancel-btn" class="secondary-btn" style="flex: 1; padding: 10px;">Cancelar</button>
                <button id="confirm-ok-btn" class="primary-btn" style="flex: 1; padding: 10px;">Confirmar</button>
            </div>
        </div>
    </div>
`;