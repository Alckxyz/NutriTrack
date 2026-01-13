import { state } from './state.js';

export function parsePastedFood(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    let name = "New Food";
    let protein = 0, carbs = 0, fat = 0;
    let vitamins = {}, minerals = {};
    
    let currentSection = null;

    lines.forEach((line, index) => {
        if (index === 0 && !line.includes(':')) {
            name = line;
            return;
        }
        
        const lowerLine = line.toLowerCase();
        
        if (lowerLine.startsWith('protein:')) protein = parseFloat(line.split(':')[1]) || 0;
        else if (lowerLine.startsWith('carbs:')) carbs = parseFloat(line.split(':')[1]) || 0;
        else if (lowerLine.startsWith('fat:')) fat = parseFloat(line.split(':')[1]) || 0;
        else if (lowerLine.includes('vitamin')) currentSection = 'vitamins';
        else if (lowerLine.includes('mineral')) currentSection = 'minerals';
        else if (line.includes(':')) {
            const [k, v] = line.split(':').map(s => s.trim());
            const val = parseFloat(v);
            if (k && !isNaN(val)) {
                if (currentSection === 'vitamins') vitamins[k] = val;
                else if (currentSection === 'minerals') minerals[k] = val;
            } else if (lowerLine.startsWith('name:')) {
                name = v;
            }
        }
    });

    return { name, protein, carbs, fat, vitamins, minerals };
}

export function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

export function updateNutrientSuggestions() {
    const suggestionsList = document.getElementById('nutrient-suggestions');
    if (!suggestionsList) return;

    const nutrientNames = new Set();
    state.foodList.forEach(food => {
        if (food.vitamins) Object.keys(food.vitamins).forEach(n => nutrientNames.add(n));
        if (food.minerals) Object.keys(food.minerals).forEach(n => nutrientNames.add(n));
    });

    suggestionsList.innerHTML = '';
    Array.from(nutrientNames).sort().forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        suggestionsList.appendChild(option);
    });
}

export function getDynamicNutrientsFromContainer(containerId) {
    const container = document.getElementById(containerId);
    const rows = container.querySelectorAll('.nutrient-input-row');
    const data = {};
    rows.forEach(row => {
        const name = row.querySelector('.nutrient-name').value.trim();
        const value = parseFloat(row.querySelector('.nutrient-value').value);
        if (name && !isNaN(value)) {
            data[name] = value;
        }
    });
    return data;
}

const translations = {
    en: {
        mode_standard: "Standard Mode",
        mode_daily: "Daily Mode",
        manage_db: "🍎 Food List",
        paste_food: "Paste Food from Text",
        export_db: "📋 Export List",
        import_db: "📋 Import List",
        export_standard: "Export Standard",
        import_standard: "Import Standard",
        export_daily: "Export Daily",
        import_daily: "Import Daily",
        daily_summary: "Daily Summary",
        calories: "Calories",
        protein: "Protein",
        carbs: "Carbs",
        fat: "Fat",
        total_micros: "Total Micronutrients",
        meals: "Meals",
        add_meal: "+ Add Meal",
        modal_add_food_title: "Add Food to Meal",
        search_placeholder: "Search food database...",
        selected_food: "Selected:",
        amount_label: "Amount (g or ml):",
        confirm: "Confirm",
        db_modal_title_add: "Add New Food to List",
        db_modal_title_edit: "Edit Food Information",
        name_label: "Name*",
        vitamins: "Vitamins",
        minerals: "Minerals",
        add_btn: "+ Add",
        save_to_list: "Save to Food List",
        update_food: "Update Food",
        library_title: "Food List Manager",
        search_library_placeholder: "Search your food list...",
        sort_name: "A-Z Name",
        sort_newest: "Newest Added",
        sort_edited: "Last Edited",
        rename_btn: "Rename",
        copy_btn: "Copy",
        paste_btn: "Paste",
        delete_btn: "Delete",
        edit_btn: "Edit",
        add_food_btn: "+ Add Food",
        prompt_new_meal: "Meal name (e.g. Afternoon Snack):",
        prompt_rename_meal: "Enter new meal name:",
        confirm_delete_meal: "Delete this meal?",
        confirm_delete_food: "Are you sure you want to delete \"{name}\"?",
        import_success: "Import successful!",
        import_error: "Error parsing JSON.",
        pasted_success: "Successfully imported \"{name}\"",
        standard_title: "Standard Plan",
        daily_title: "Daily Planner",
        breakfast: "Breakfast",
        lunch: "Lunch",
        dinner: "Dinner",
        manage_recipes: "📖 Recipes",
        settings_btn: "⚙️ Settings",
        settings_title: "Settings & Tools",
        settings_preferences: "Preferences",
        settings_data_management: "Data Management",
        settings_plans: "Plan Import/Export",
        language_label: "Language",
        mode_label: "Planner Mode",
        recipe_library_title: "Recipe Manager",
        search_recipes_placeholder: "Search recipes...",
        create_recipe: "Create Recipe",
        recipe_editor_title: "Recipe Editor",
        recipe_name_label: "Recipe Name",
        recipe_ingredients: "Ingredients",
        save_recipe: "Save Recipe",
        recipe_badge: "RECIPE",
        recipe_portions_label: "Portions",
        portions_unit: "portion(s)",
        amount_label_generic: "Amount:",
        export_plan: "Export Plan",
        import_plan: "Import Plan"
    },
    es: {
        mode_standard: "Modo Estándar",
        mode_daily: "Modo Diario",
        manage_db: "🍎 Alimentos",
        paste_food: "Pegar alimento",
        export_db: "📋 Exportar",
        import_db: "📋 Importar",
        export_standard: "Exportar Estándar",
        import_standard: "Importar Estándar",
        export_daily: "Exportar Diario",
        import_daily: "Importar Diario",
        daily_summary: "Resumen Diario",
        calories: "Calorías",
        protein: "Proteína",
        carbs: "Carbohidratos",
        fat: "Grasas",
        total_micros: "Micronutrientes Totales",
        meals: "Comidas",
        add_meal: "+ Añadir Comida",
        modal_add_food_title: "Añadir Alimento a Comida",
        search_placeholder: "Buscar en la base de datos...",
        selected_food: "Seleccionado:",
        amount_label: "Cantidad (g o ml):",
        confirm: "Confirmar",
        db_modal_title_add: "Añadir Nuevo Alimento",
        db_modal_title_edit: "Editar Información del Alimento",
        name_label: "Nombre*",
        vitamins: "Vitaminas",
        minerals: "Minerales",
        add_btn: "+ Añadir",
        save_to_list: "Guardar en Lista",
        update_food: "Actualizar Alimento",
        library_title: "Gestor de Lista de Alimentos",
        search_library_placeholder: "Buscar en tu lista...",
        sort_name: "Nombre A-Z",
        sort_newest: "Más reciente",
        sort_edited: "Última edición",
        rename_btn: "Renombrar",
        copy_btn: "Copiar",
        paste_btn: "Pegar",
        delete_btn: "Borrar",
        edit_btn: "Editar",
        add_food_btn: "+ Añadir Alimento",
        prompt_new_meal: "Nombre de la comida (ej: Merienda):",
        prompt_rename_meal: "Nuevo nombre para la comida:",
        confirm_delete_meal: "¿Borrar esta comida?",
        confirm_delete_food: "¿Seguro que quieres borrar \"{name}\"?",
        import_success: "¡Importación exitosa!",
        import_error: "Error al leer el archivo JSON.",
        pasted_success: "Importado con éxito: \"{name}\"",
        standard_title: "Plan Estándar",
        daily_title: "Planificador Diario",
        breakfast: "Desayuno",
        lunch: "Almuerzo",
        dinner: "Cena",
        manage_recipes: "📖 Recetas",
        settings_btn: "⚙️ Ajustes",
        settings_title: "Ajustes y Herramientas",
        settings_preferences: "Preferencias",
        settings_data_management: "Gestión de Datos",
        settings_plans: "Importar/Exportar Planes",
        language_label: "Idioma",
        mode_label: "Modo de Planificador",
        recipe_library_title: "Gestor de Recetas",
        search_recipes_placeholder: "Buscar recetas...",
        create_recipe: "Crear Receta",
        recipe_editor_title: "Editor de Recetas",
        recipe_name_label: "Nombre de la Receta",
        recipe_ingredients: "Ingredientes",
        save_recipe: "Guardar Receta",
        recipe_badge: "RECETA",
        recipe_portions_label: "Porciones",
        portions_unit: "porción(es)",
        amount_label_generic: "Cantidad:",
        export_plan: "Exportar Plan",
        import_plan: "Importar Plan"
    }
};

export function t(key, lang = 'en') {
    return translations[lang][key] || key;
}

export function updateUILanguage(lang) {
    document.querySelectorAll('[data-t]').forEach(el => {
        const key = el.getAttribute('data-t');
        el.textContent = t(key, lang);
    });
    document.querySelectorAll('[data-t-placeholder]').forEach(el => {
        const key = el.getAttribute('data-t-placeholder');
        el.placeholder = t(key, lang);
    });
}

export function addNutrientRowToContainer(containerId, name = '', value = '') {
    const container = document.getElementById(containerId);
    const row = document.createElement('div');
    row.className = 'nutrient-input-row';
    row.innerHTML = `
        <input type="text" placeholder="Name (e.g. Vit B12)" value="${name}" required class="nutrient-name" list="nutrient-suggestions">
        <input type="number" step="0.001" placeholder="Value" value="${value}" required class="nutrient-value">
        <button type="button" class="remove-row-btn">×</button>
    `;
    row.querySelector('.remove-row-btn').onclick = () => row.remove();
    container.appendChild(row);
}