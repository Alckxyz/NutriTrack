import { state } from './state.js';
import { dom } from './dom-elements.js';
import * as FB from './firebase-config.js';
import { t } from './i18n.js';
import * as Utils from './utils.js';
import * as Nutrients from './nutrient-utils.js';

export const AI_PROMPT = `Vas a ayudarme a sacar nutrientes promedio de alimentos.

Primero responde solo con:
Estoy listo

Después de eso, cuando yo te mande un alimento, dame los nutrientes promedio con este formato exacto (sin agregar nada extra, sin explicaciones, sin emojis, sin corchetes, sin comillas, sin paréntesis extra, y sin unidades de medida en los valores: solo números).
Los valores deben ser un promedio.

✅ Regla CLAVE (muy importante):
- TODOS los valores de Protein, Carbs, Fat, Vitamins y Minerals deben corresponder EXACTAMENTE a la cantidad indicada en Units.
- Si usas datos por 100 g (o 100 ml), debes convertirlos proporcionalmente a los gramos/ml indicados en Units.
- Nunca uses nutrientes de 100 g si en Units aparece otra cantidad.

✅ Regla del nombre (primera línea):
- La primera línea debe ser solo el nombre del alimento, sin cantidad, sin peso y sin empaque.
- NO escribas “bolsa”, “paquete”, “porción”, “unidad”, “gramos”, etc.

✅ Regla del estado del alimento (crudo/frito/horneado/etc):
- Si el usuario menciona un estado (frito, horneado, cocido, hervido, a la plancha, asado, al vapor, etc.),
  entonces agrégalo en el nombre entre paréntesis y usa nutrientes de ESE estado.
  Ejemplo: "trucha frita" → Trucha (frita)

- Si el usuario SOLO pone el nombre y NO menciona estado:
  - Si es un alimento que normalmente se come crudo (ej: manzana, pera, plátano, uvas, zanahoria, lechuga),
    NO agregues paréntesis.
  - Si NO es de esos (ej: carnes, pescados, pollo, arroz, pasta, papa),
    entonces agrega (crudo) o (cruda) según corresponda y usa nutrientes del alimento crudo.
    Ejemplo: "trucha" → Trucha (cruda)

✅ Regla de Units (obligatoria y en minúscula):
- Units debe aparecer siempre.
- La PRIMERA unidad siempre debe ser:
  - Si es sólido: g: X
  - Si es líquido: ml: X

- Si el usuario menciona gramos o mililitros, usa ese número.
- Si NO menciona gramos o mililitros:
  - Si es sólido, usa g: 100
  - Si es líquido, usa ml: 100

- Después de la primera unidad (g o ml), agrega unidades extra si aparecen en la descripción:
  - “una bolsa” → bolsa: 1
  - “un paquete” → paquete: 1
  - “una porción” → porción: 1
  - “una unidad” → unidad: 1
  - “una lata” → lata: 1
  - “una botella” → botella: 1
  - “un vaso” → vaso: 1
  - “una taza” → taza: 1

✅ Micronutrientes:
- SIEMPRE incluye Vitamins y Minerals.
- Incluye solo los micronutrientes MÁS IMPORTANTES según ese alimento.
- Pon entre 2 y 5 vitaminas y entre 2 y 5 minerales (elige los más relevantes).
- Sus valores también deben corresponder a la cantidad indicada en Units.

Formato obligatorio:

Nombre del alimento
Protein: X
Carbs: X
Fat: X
Units:
g: X
unidad_extra: X
Vitamins:
Vit X: X
Minerals:
Mineral X: X

Reglas:
- Protein, Carbs y Fat son obligatorios.
- Vitamins y Minerals son obligatorios.
- Usa solo números (decimales permitidos).
- No pongas “g”, “mg”, “kcal”, etc. (solo las etiquetas g: y ml: en Units)`;

export async function handlePasteFood(refreshCallback, refreshLibrary) {
    if (!state.user) return alert("Please login to import foods.");
    const text = dom.pasteArea.value.trim();
    if (!text) return;

    const btn = dom.confirmPasteBtn;
    btn.disabled = true;
    btn.style.opacity = '0.6';

    const parsed = Utils.parsePastedFood(text);
    if (parsed) {
        try {
            const { conversions, ...foodData } = parsed;
            
            const existing = state.foodList.find(f => 
                f.name.toLowerCase() === foodData.name.toLowerCase() && 
                f.ownerId === state.user.uid
            );

            let savedId;
            if (existing) {
                savedId = existing.id;
                const foodDocRef = FB.doc(FB.db, 'users', state.user.uid, 'foods', existing.id);
                await FB.updateDoc(foodDocRef, {
                    ...foodData,
                    updated_at: Date.now()
                }).catch(async () => {
                   const legacyRef = FB.doc(FB.db, 'foodList', existing.id);
                   await FB.updateDoc(legacyRef, { ...foodData, updated_at: Date.now() });
                });
            } else {
                const foodCollection = FB.collection(FB.db, 'users', state.user.uid, 'foods');
                const newDoc = await FB.addDoc(foodCollection, { 
                    ...foodData, 
                    ownerId: state.user.uid,
                    ownerName: state.displayName,
                    created_at: Date.now(), 
                    updated_at: Date.now() 
                });
                savedId = newDoc.id;
            }

            if (conversions && Array.isArray(conversions)) {
                for (const c of conversions) {
                    const convCol = FB.collection(FB.db, 'foodList', savedId, 'conversions');
                    await FB.addDoc(convCol, { 
                        ...c, 
                        ownerId: state.user.uid,
                        createdAt: Date.now()
                    });
                }
                await import('./state.js').then(m => m.fetchFoodConversions(savedId));
            }
            
            Utils.showToast("✅ " + t('paste_success_msg', state.language));
            dom.pasteArea.value = '';
            
            setTimeout(() => {
                if (refreshLibrary) refreshLibrary();
                Nutrients.updateNutrientSuggestions();
                if (refreshCallback) refreshCallback();
            }, 500); 

        } catch (e) {
            console.error("Paste failed", e);
            Utils.showToast("❌ " + t('paste_error_msg', state.language));
        } finally {
            setTimeout(() => {
                btn.disabled = false;
                btn.style.opacity = '1';
            }, 2000);
        }
    } else {
        btn.disabled = false;
        btn.style.opacity = '1';
    }
}