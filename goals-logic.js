import { state, saveState } from './state.js';
import { dom } from './dom-elements.js';

function updateCalculatedCalories() {
    const p = parseFloat(dom.goalProtein.value) || 0;
    const c = parseFloat(dom.goalCarbs.value) || 0;
    const f = parseFloat(dom.goalFat.value) || 0;
    const kcal = Math.round((p * 4) + (c * 4) + (f * 9));
    dom.goalCalories.value = kcal;
    
    const prefix = state.language === 'es' ? 'Calorías calculadas' : 'Calculated Calories';
    dom.goalCaloriesDisplay.textContent = `${prefix}: ${kcal} kcal`;
}

export function initGoalsUI(refreshCallback) {
    let currentCalculatedGoal = null;

    // Reset wizard results
    if (dom.wizardResults) dom.wizardResults.classList.add('hidden');
    if (dom.calculateApplyBtn) dom.calculateApplyBtn.classList.add('hidden');

    // Fill settings inputs with current goals
    dom.goalCalories.value = state.goals.calories || 0;
    dom.goalProtein.value = state.goals.protein || '';
    dom.goalCarbs.value = state.goals.carbs || '';
    dom.goalFat.value = state.goals.fat || '';
    
    updateCalculatedCalories();

    // Real-time calculation listeners
    [dom.goalProtein, dom.goalCarbs, dom.goalFat].forEach(input => {
        input.oninput = updateCalculatedCalories;
    });

    dom.saveGoalsBtn.onclick = () => {
        const p = parseFloat(dom.goalProtein.value) || 0;
        const c = parseFloat(dom.goalCarbs.value) || 0;
        const f = parseFloat(dom.goalFat.value) || 0;
        const kcal = Math.round((p * 4) + (c * 4) + (f * 9));

        state.goals = {
            ...state.goals,
            calories: kcal,
            protein: p,
            carbs: c,
            fat: f,
            mode: 'manual',
            lastUpdated: Date.now()
        };
        saveState(refreshCallback);
    };

    dom.openWizardBtn.onclick = () => {
        dom.wizardModal.style.display = 'block';
    };

    dom.wizGoal.onchange = () => {
        if (dom.wizGoal.value === 'maintain') {
            dom.wizSpeedGroup.classList.add('hidden');
        } else {
            dom.wizSpeedGroup.classList.remove('hidden');
        }
    };

    const performCalculation = () => {
        const sex = dom.wizSex.value;
        const age = parseInt(dom.wizAge.value);
        const height = parseFloat(dom.wizHeight.value);
        const weight = parseFloat(dom.wizWeight.value);
        const activityRadio = document.querySelector('input[name="wiz-activity"]:checked');
        const activityFactor = activityRadio ? parseFloat(activityRadio.value) : 1.2;
        const trainingRadio = document.querySelector('input[name="wiz-training"]:checked');
        const trainingType = trainingRadio ? trainingRadio.value : 'light_cardio';
        const goal = dom.wizGoal.value;
        const speed = dom.wizSpeed.value;

        if (!age || !height || !weight) {
            alert('Please fill all mandatory fields');
            return null;
        }

        // 1. Calculate BMR & TDEE (Mifflin-St Jeor)
        let bmr = (10 * weight) + (6.25 * height) - (5 * age);
        bmr += (sex === 'male' ? 5 : -161);
        const tdee = bmr * activityFactor;

        // 2. Adjust Calories for Goal
        let targetKcal = tdee;
        if (goal === 'lose') {
            const offsets = { slow: -250, normal: -500, fast: -750 };
            targetKcal += offsets[speed];
        } else if (goal === 'gain') {
            const offsets = { slow: 200, normal: 350, fast: 500 };
            targetKcal += offsets[speed];
        }

        // Safety Minimum
        const minSafetyKcal = (sex === 'male' ? 1500 : 1200);
        let appliedSafetyMin = false;
        if (targetKcal < minSafetyKcal) {
            targetKcal = minSafetyKcal;
            appliedSafetyMin = true;
        }

        // 3. Protein Calculation
        const baseProteinTable = {
            maintain: { "1.2": 1.4, "1.375": 1.4, "1.55": 1.6, "1.725": 1.8, "1.9": 1.8 },
            lose: { "1.2": 1.7, "1.375": 1.7, "1.55": 1.9, "1.725": 2.1, "1.9": 2.1 },
            gain: { "1.2": 1.7, "1.375": 1.7, "1.55": 1.9, "1.725": 2.0, "1.9": 2.0 }
        };
        const trainingProteinAdj = {
            light_cardio: -0.1, intense_cardio: 0.0, strength: 0.1, mixed: 0.1, performance: 0.0
        };

        let pFactor = (baseProteinTable[goal][activityFactor.toString()] || 1.4) + trainingProteinAdj[trainingType];
        pFactor = Math.max(1.2, Math.min(2.2, pFactor));
        let proteinG = weight * pFactor;

        // 4. Fat Calculation
        let fatG = weight * 0.8;
        const minFatG = weight * 0.6;

        // 5. Carb Calculation with Training Minimums
        const carbMinFactors = {
            light_cardio: 2.0, intense_cardio: 3.0, strength: 2.5, mixed: 3.0, performance: 3.5
        };
        const carbMinG = weight * carbMinFactors[trainingType];

        const calcRemainingCarbs = (kcal, p, f) => (kcal - (p * 4) - (f * 9)) / 4;
        let carbsG = calcRemainingCarbs(targetKcal, proteinG, fatG);

        let appliedFatMin = false;
        let appliedProteinRed = false;
        let appliedCarbMinFixed = false;

        // Adjustment loop
        if (carbsG < carbMinG) {
            fatG = minFatG;
            appliedFatMin = true;
            carbsG = calcRemainingCarbs(targetKcal, proteinG, fatG);
        }

        if (carbsG < carbMinG) {
            // Drop protein to min (1.2) if still short
            proteinG = weight * 1.2;
            appliedProteinRed = true;
            carbsG = calcRemainingCarbs(targetKcal, proteinG, fatG);
        }

        if (carbsG < carbMinG) {
            // Force carb minimum and recalculate total calories
            carbsG = carbMinG;
            appliedCarbMinFixed = true;
            targetKcal = (proteinG * 4) + (carbsG * 4) + (fatG * 9);
            if (targetKcal < minSafetyKcal) targetKcal = minSafetyKcal;
        }

        const finalKcal = Math.round((proteinG * 4) + (carbsG * 4) + (fatG * 9));

        return {
            calories: finalKcal,
            protein: parseFloat(proteinG.toFixed(1)),
            carbs: parseFloat(carbsG.toFixed(1)),
            fat: parseFloat(fatG.toFixed(1)),
            pFactorUsed: pFactor.toFixed(2),
            appliedSafetyMin, appliedFatMin, appliedProteinRed, appliedCarbMinFixed,
            inputs: { sex, age, height, weight, activityFactor, trainingType, goal, speed }
        };
    };

    dom.calculateBtn.onclick = () => {
        const result = performCalculation();
        if (!result) return;
        currentCalculatedGoal = result;
        
        dom.wizardResults.classList.remove('hidden');
        dom.calculateApplyBtn.classList.remove('hidden');

        let summary = `
            <strong>• Target:</strong> ${result.calories} kcal<br>
            <strong>• Protein:</strong> ${result.protein}g (${result.pFactorUsed} g/kg)${result.appliedProteinReduction ? ' [Reduced to min]' : ''}<br>
            <strong>• Carbs:</strong> ${result.carbs}g ${result.appliedCarbMin ? ' [Forced Minimum]' : ''}<br>
            <strong>• Fat:</strong> ${result.fat}g ${result.appliedFatMin ? ' [Reduced to min]' : ''}<br>
        `;
        if (result.appliedMinKcal) summary += `<span style="color:#ff8a80; font-size:0.7rem;">* Adjusted to safety calorie floor.</span>`;
        
        dom.wizardSummaryText.innerHTML = summary;
    };

    dom.calculateApplyBtn.onclick = () => {
        if (!currentCalculatedGoal) return;
        
        state.goals = {
            ...state.goals,
            calories: currentCalculatedGoal.calories,
            protein: currentCalculatedGoal.protein,
            carbs: currentCalculatedGoal.carbs,
            fat: currentCalculatedGoal.fat,
            mode: 'auto',
            calculatorInputs: currentCalculatedGoal.inputs,
            lastUpdated: Date.now()
        };

        dom.goalCalories.value = state.goals.calories;
        dom.goalProtein.value = state.goals.protein;
        dom.goalCarbs.value = state.goals.carbs;
        dom.goalFat.value = state.goals.fat;
        updateCalculatedCalories();

        dom.wizardModal.style.display = 'none';
        saveState(refreshCallback);
    };
}