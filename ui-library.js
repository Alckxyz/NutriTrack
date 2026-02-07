import { state, calculateCalories } from './state.js';
import { t } from './i18n.js';
import { normalizeString } from './utils.js';

export function renderLibraryList(container, searchInput, sortSelect, onEdit, onDelete) {
    if (!container) return;
    const query = normalizeString(searchInput.value);
    const sortVal = sortSelect.value;
    // Exclude recipes from the general food list library
    let filtered = state.foodList.filter(f => f && f.type !== 'recipe' && f.name && normalizeString(f.name).includes(query));
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
        const creatorName = food.ownerName ? ` <small style="color:var(--text-light); opacity:0.7">(${t('created_by', state.language)} ${food.ownerName})</small>` : '';
        const brandDisplay = food.brand ? ` <span style="color:var(--secondary); font-size:0.75rem;">[${food.brand}]</span>` : '';
        item.innerHTML = `
            <div class="library-item-info">
                <strong>${food.name}</strong>${brandDisplay} ${isRecipe ? `<small style="color:var(--secondary); border:1px solid var(--secondary); padding:0 2px; border-radius:2px; font-size:0.6rem;">${t('recipe_badge', state.language)}</small>` : ''}${creatorName}<br>
                <small>${foodKcal} kcal | P: ${food.protein.toFixed(1)}g | C: ${food.carbs.toFixed(1)}g | G: ${food.fat.toFixed(1)}g | Fib: ${(food.fiber || 0).toFixed(1)}g</small>
            </div>
            <div class="library-item-actions">
                <button class="conv-btn secondary-btn" style="padding: 4px 8px; font-size: 0.7rem; color: var(--secondary);">${t('conv_btn_short', state.language)}</button>
                <button class="edit-btn ${isOwner ? '' : 'hidden'}">${t('edit_btn', state.language)}</button>
                <button class="delete-btn ${isOwner ? '' : 'hidden'}">${t('delete_btn', state.language)}</button>
            </div>
        `;
        item.querySelector('.conv-btn').onclick = () => onEdit(food.id);
        const editBtn = item.querySelector('.edit-btn');
        if (editBtn) editBtn.onclick = () => onEdit(food.id);
        const delBtn = item.querySelector('.delete-btn');
        if (delBtn) delBtn.onclick = () => onDelete(food.id);
        container.appendChild(item);
    });
}

export function renderFoodResults(container, query, activeTab, onSelect) {
    if (!container) return;
    container.innerHTML = '';
    const normalizedQuery = normalizeString(query);
    const results = state.foodList.filter(f => f && f.name && normalizeString(f.name).includes(normalizedQuery));
    
    if (activeTab === 'recipes') {
        const recipes = results.filter(f => f.type === 'recipe');
        recipes.forEach(recipe => {
            const creator = recipe.ownerName ? `<br><small style="color:var(--text-light); font-size:0.65rem;">${t('created_by', state.language)} ${recipe.ownerName}</small>` : '';
            const div = document.createElement('div');
            div.className = 'food-result-item';
            div.style.borderLeft = '3px solid var(--secondary)';
            div.style.flexDirection = 'column';
            div.style.alignItems = 'flex-start';
            div.innerHTML = `<div><strong>${recipe.name}</strong> <small style="color:var(--secondary)">(${t('recipe_badge', state.language)})</small> <span style="font-size:0.8rem; color:#888">(${Math.round(calculateCalories(recipe))} kcal/${t('portions_unit', state.language)})</span></div>${creator}`;
            div.onclick = () => onSelect(recipe);
            container.appendChild(div);
        });
    } else {
        const standardFoods = results.filter(f => f.type !== 'recipe');
        standardFoods.forEach(food => {
            const creator = food.ownerName ? `<br><small style="color:var(--text-light); font-size:0.65rem;">${t('created_by', state.language)} ${food.ownerName}</small>` : '';
            const brandDisplay = food.brand ? ` <small style="color:var(--secondary)">[${food.brand}]</small>` : '';
            const div = document.createElement('div');
            div.className = 'food-result-item';
            div.style.flexDirection = 'column';
            div.style.alignItems = 'flex-start';
            div.innerHTML = `<div><strong>${food.name}</strong>${brandDisplay} <span style="font-size:0.8rem; color:#888">(${Math.round(calculateCalories(food))} kcal/100g)</span></div>${creator}`;
            div.onclick = () => onSelect(food);
            container.appendChild(div);
        });
    }
}

export function renderRecipeLibraryList(container, query, onEdit, onDelete) {
    if (!container) return;
    const normalizedQuery = normalizeString(query);
    let filtered = state.foodList.filter(f => f && f.type === 'recipe' && f.name && normalizeString(f.name).includes(normalizedQuery));
    container.innerHTML = '';
    filtered.forEach(recipe => {
        const item = document.createElement('div');
        item.className = 'library-item';
        const kcal = Math.round(calculateCalories(recipe));
        const isOwner = state.user && recipe.ownerId === state.user.uid;
        const creatorName = recipe.ownerName ? ` <small style="color:var(--text-light); opacity:0.7">(${t('created_by', state.language)} ${recipe.ownerName})</small>` : '';
        item.innerHTML = `
            <div class="library-item-info">
                <strong>${recipe.name}</strong>${creatorName}<br>
                <small>${kcal} kcal/${t('portions_unit', state.language)} | P: ${recipe.protein.toFixed(1)}g | C: ${recipe.carbs.toFixed(1)}g | G: ${recipe.fat.toFixed(1)}g</small>
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