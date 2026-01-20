import { state, calculateCalories } from './state.js';
import { t } from './utils.js';

export function renderLibraryList(container, searchInput, sortSelect, onEdit, onDelete) {
    if (!container) return;
    const query = searchInput.value.toLowerCase();
    const sortVal = sortSelect.value;
    // Exclude recipes from the general food list library
    let filtered = state.foodList.filter(f => f && f.type !== 'recipe' && f.name && f.name.toLowerCase().includes(query));
    filtered.sort((a, b) => {
        if (sortVal === 'name') return a.name.localeCompare(b.name);
        if (sortVal === 'newest') return (b.created_at || 0) - (a.created_at || 0);
        if (sortVal === 'edited') return (b.updated_at || 0) - (a.updated_at || 0);
        return 0;
    });
    container.innerHTML = '';
    filtered.forEach(food => {
        const item = document.createElement('div');
        item.className = 'library-item';
        const foodKcal = Math.round(calculateCalories(food));
        const isRecipe = food.type === 'recipe';
        const isOwner = state.user && food.ownerId === state.user.uid;
        item.innerHTML = `
            <div class="library-item-info">
                <strong>${food.name}</strong> ${isRecipe ? `<small style="color:var(--secondary); border:1px solid var(--secondary); padding:0 2px; border-radius:2px; font-size:0.6rem;">${t('recipe_badge', state.language)}</small>` : ''}<br>
                <small>${foodKcal} kcal | P: ${food.protein.toFixed(1)}g | C: ${food.carbs.toFixed(1)}g | F: ${food.fat.toFixed(1)}g</small>
            </div>
            <div class="library-item-actions ${isOwner ? '' : 'hidden'}">
                <button class="edit-btn">${t('edit_btn', state.language)}</button>
                <button class="delete-btn">${t('delete_btn', state.language)}</button>
            </div>
        `;
        item.querySelector('.edit-btn').onclick = () => onEdit(food.id);
        item.querySelector('.delete-btn').onclick = () => onDelete(food.id);
        container.appendChild(item);
    });
}

export function renderFoodResults(container, query, activeTab, onSelect) {
    if (!container) return;
    container.innerHTML = '';
    const queryLower = query.toLowerCase();
    const results = state.foodList.filter(f => f && f.name && f.name.toLowerCase().includes(queryLower));
    
    if (activeTab === 'recipes') {
        const recipes = results.filter(f => f.type === 'recipe');
        recipes.forEach(recipe => {
            const div = document.createElement('div');
            div.className = 'food-result-item';
            div.style.borderLeft = '3px solid var(--secondary)';
            div.innerHTML = `<strong>${recipe.name}</strong> <small style="color:var(--secondary)">(${t('recipe_badge', state.language)})</small> <span style="font-size:0.8rem; color:#888">(${Math.round(calculateCalories(recipe))} kcal/${t('portions_unit', state.language)})</span>`;
            div.onclick = () => onSelect(recipe);
            container.appendChild(div);
        });
    } else {
        const standardFoods = results.filter(f => f.type !== 'recipe');
        standardFoods.forEach(food => {
            const div = document.createElement('div');
            div.className = 'food-result-item';
            div.innerHTML = `<strong>${food.name}</strong> <span style="font-size:0.8rem; color:#888">(${Math.round(calculateCalories(food))} kcal/100g)</span>`;
            div.onclick = () => onSelect(food);
            container.appendChild(div);
        });
    }
}

export function renderRecipeLibraryList(container, query, onEdit, onDelete) {
    if (!container) return;
    const queryLower = query.toLowerCase();
    let filtered = state.foodList.filter(f => f && f.type === 'recipe' && f.name && f.name.toLowerCase().includes(queryLower));
    container.innerHTML = '';
    filtered.forEach(recipe => {
        const item = document.createElement('div');
        item.className = 'library-item';
        const kcal = Math.round(calculateCalories(recipe));
        const isOwner = state.user && recipe.ownerId === state.user.uid;
        item.innerHTML = `
            <div class="library-item-info">
                <strong>${recipe.name}</strong><br>
                <small>${kcal} kcal/${t('portions_unit', state.language)} | P: ${recipe.protein.toFixed(1)}g | C: ${recipe.carbs.toFixed(1)}g | F: ${recipe.fat.toFixed(1)}g</small>
            </div>
            <div class="library-item-actions ${isOwner ? '' : 'hidden'}">
                <button class="edit-btn">${t('edit_btn', state.language)}</button>
                <button class="delete-btn">${t('delete_btn', state.language)}</button>
            </div>
        `;
        item.querySelector('.edit-btn').onclick = () => onEdit(recipe.id);
        item.querySelector('.delete-btn').onclick = () => onDelete(recipe.id);
        container.appendChild(item);
    });
}