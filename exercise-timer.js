import { state } from './state.js';
import { t } from './i18n.js';

let timerInterval = null;
let remainingSeconds = 0;
let isPaused = false;

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

export function startTimer(seconds, type = 'sets') {
    if (!state.timerEnabled) return;
    const timerUI = document.getElementById('rest-timer-ui');
    const display = document.getElementById('timer-display');
    const label = document.getElementById('timer-type-label');
    const toggleBtn = document.getElementById('timer-toggle-btn');

    if (!timerUI || !display || !label) return;

    clearInterval(timerInterval);
    remainingSeconds = seconds;
    isPaused = false;
    timerUI.classList.remove('hidden');
    label.textContent = type === 'sets' ? t('timer_set_rest', state.language) : t('timer_ex_rest', state.language);
    toggleBtn.textContent = '⏸';

    updateDisplay();

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
    // Keep UI visible at 00:00 for a moment or hide
    setTimeout(() => {
        const timerUI = document.getElementById('rest-timer-ui');
        if (timerUI) timerUI.classList.add('hidden');
    }, 2000);
}

export function initTimerUI() {
    const toggleBtn = document.getElementById('timer-toggle-btn');
    const resetBtn = document.getElementById('timer-reset-btn');
    const closeBtn = document.getElementById('timer-close-btn');

    toggleBtn.onclick = () => {
        isPaused = !isPaused;
        toggleBtn.textContent = isPaused ? '▶' : '⏸';
    };

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