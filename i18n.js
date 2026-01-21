import { translations } from './translations.js';

export function t(key, lang = 'es') {
    return (translations['es'] && translations['es'][key]) || key;
}

export function tUnit(unitCode, lang = 'es', isRecipe = false) {
    if (isRecipe && unitCode === 'unit') return t('portions_unit', 'es');
    const key = 'unit_' + unitCode;
    const translated = t(key, lang);
    // If translation key is returned, it means no translation was found, so use the raw unitCode
    return (translated === key) ? unitCode : translated;
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