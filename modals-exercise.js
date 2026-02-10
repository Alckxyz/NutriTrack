/**
 * Refactored exercise modals. 
 * Individual templates have been moved to specialized files for better manageability.
 */
import { routineModals } from './modals-exercise-routine.js';
import { editorModals } from './modals-exercise-editor.js';
import { sessionModals } from './modals-exercise-session.js';
import { statsModals } from './modals-exercise-stats.js';
import { exerciseSettingsModals } from './modals-exercise-settings.js';

// removed template for routine-prompt-modal, exercise-plans-modal, manage-routines-modal -> Moved to modals-exercise-routine.js
// removed template for exercise-modal, replace-exercise-modal -> Moved to modals-exercise-editor.js
// removed template for workout-session-modal, set-log-popup, suggestion-modal -> Moved to modals-exercise-session.js
// removed template for progression-modal, manual-log-modal -> Moved to modals-exercise-stats.js
// removed template for exercise-settings-modal -> Moved to modals-exercise-settings.js

export const exerciseModals = `
    ${routineModals}
    ${editorModals}
    ${sessionModals}
    ${statsModals}
    ${exerciseSettingsModals}
`;