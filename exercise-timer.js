import { state } from './state.js';
import { t } from './i18n.js';

let timerInterval = null;
let remainingSeconds = 0;
let isPaused = false;
let onTimerComplete = null;
let skipResolver = null;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playBeep() {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.1);
    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.5);
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 1.5);
}

/**
 * Starts a sequenced timer logic.
 * @param {number|object} config Seconds or object { duration, mode: 'single'|'unilateral' }
 */
export function startTimer(config, type = 'sets', onFinishCallback = null) {
    if (!state.timerEnabled && type !== 'exercise') return;
    
    const timerUI = document.getElementById('rest-timer-ui');
    const display = document.getElementById('timer-display');
    const label = document.getElementById('timer-type-label');
    const toggleBtn = document.getElementById('timer-toggle-btn');

    if (!timerUI || !display || !label) return;

    clearInterval(timerInterval);
    isPaused = false;
    onTimerComplete = onFinishCallback;
    timerUI.classList.remove('hidden');
    toggleBtn.textContent = '⏸';

    if (type !== 'exercise') {
        // Standard rest timer logic
        remainingSeconds = typeof config === 'number' ? config : config.duration;
        label.textContent = type === 'sets' ? t('timer_set_rest', state.language) : t('timer_ex_rest', state.language);
        updateDisplay();
        startInternalInterval();
    } else {
        // Complex exercise timer logic with 5s prep
        const duration = typeof config === 'number' ? config : config.duration;
        const mode = typeof config === 'object' ? config.mode : 'single';
        
        runExerciseSequence(duration, mode, label);
    }
}

async function runExerciseSequence(duration, mode, label) {
    // 1. First Preparation (10s)
    label.textContent = `[1/1] ${t('prep_countdown', state.language)}`;
    if (mode === 'unilateral') label.textContent = `[1/2] ${t('prep_countdown', state.language)}`;
    
    await countdown(10);
    
    // 2. First Side / Single Side
    label.textContent = mode === 'unilateral' ? t('limb_left', state.language) : t('timer_exercise', state.language);
    await countdown(duration);
    
    if (mode === 'unilateral') {
        // 3. Second Preparation (10s)
        label.textContent = `[2/2] ${t('prep_countdown', state.language)}`;
        await countdown(10);
        
        // 4. Second Side
        label.textContent = t('limb_right', state.language);
        await countdown(duration);
    }
    
    finishTimer();
}

function countdown(seconds) {
    return new Promise((resolve) => {
        remainingSeconds = seconds;
        updateDisplay();
        
        skipResolver = () => {
            clearInterval(timerInterval);
            skipResolver = null;
            resolve();
        };

        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            if (!isPaused) {
                remainingSeconds--;
                updateDisplay();
                if (remainingSeconds <= 0) {
                    clearInterval(timerInterval);
                    skipResolver = null;
                    playBeep();
                    resolve();
                }
            }
        }, 1000);
    });
}

function startInternalInterval() {
    timerInterval = setInterval(() => {
        if (!isPaused) {
            remainingSeconds--;
            updateDisplay();
            if (remainingSeconds <= 0) {
                finishTimer();
            }
        }
    }, 1000);
}

function updateDisplay() {
    const display = document.getElementById('timer-display');
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    display.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function finishTimer() {
    clearInterval(timerInterval);
    playBeep();
    if (onTimerComplete) {
        onTimerComplete();
        onTimerComplete = null;
    }
    // Keep UI visible at 00:00 for a moment or hide
    setTimeout(() => {
        const timerUI = document.getElementById('rest-timer-ui');
        if (timerUI) timerUI.classList.add('hidden');
    }, 2000);
}

export function initTimerUI() {
    const toggleBtn = document.getElementById('timer-toggle-btn');
    const skipBtn = document.getElementById('timer-skip-btn');
    const resetBtn = document.getElementById('timer-reset-btn');
    const closeBtn = document.getElementById('timer-close-btn');

    toggleBtn.onclick = () => {
        isPaused = !isPaused;
        toggleBtn.textContent = isPaused ? '▶' : '⏸';
    };

    if (skipBtn) {
        skipBtn.onclick = () => {
            if (skipResolver) {
                skipResolver();
            } else if (remainingSeconds > 0) {
                finishTimer();
            }
        };
    }

    resetBtn.onclick = () => {
        // Just hide for now on reset or we could restart with previous val
        clearInterval(timerInterval);
        const timerUI = document.getElementById('rest-timer-ui');
        if (timerUI) timerUI.classList.add('hidden');
    };

    closeBtn.onclick = () => {
        clearInterval(timerInterval);
        const timerUI = document.getElementById('rest-timer-ui');
        if (timerUI) timerUI.classList.add('hidden');
    };
}