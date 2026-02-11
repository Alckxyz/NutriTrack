export { state } from './state-base.js';
export * from './state-logic-calc.js';
export * from './state-logic-sync.js';
export * from './state-logic-user.js';
export { deleteField } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Tombstone comments for refactored functions
// removed function updateMergedFoodList() {} (moved to state-logic-sync.js)
// removed function getCurrentMeals() {} (moved to state-logic-user.js)
// removed function setCurrentMeals() {} (moved to state-logic-user.js)
// removed function saveState() {} (moved to state-logic-user.js)
// removed function fetchFoodConversions() {} (moved to state-logic-sync.js)
// removed function initSharedConversionsSync() {} (moved to state-logic-sync.js)
// removed function initSharedFoodSync() {} (moved to state-logic-sync.js)
// removed function loadUserData() {} (moved to state-logic-user.js)
// removed function loadDailyPlanForDate() {} (moved to state-logic-user.js)
// removed function calculateCalories() {} (moved to state-logic-calc.js)
// removed function calculateMealNutrients() {} (moved to state-logic-calc.js)