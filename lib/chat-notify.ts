// Lightweight chat notification sound using the Web Audio API — no asset file needed.
// Plays a short, pleasant two-note "ping" for incoming messages.
let audioCtx: AudioContext | null = null;

export function playChatPing() {
    if (typeof window === 'undefined') return;
    try {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        if (!Ctx) return;
        if (!audioCtx) audioCtx = new Ctx();
        const ctx = audioCtx;
        if (ctx.state === 'suspended') ctx.resume();

        const now = ctx.currentTime;
        const notes = [
            { freq: 880, start: 0, dur: 0.12 },   // A5
            { freq: 1174.66, start: 0.1, dur: 0.16 }, // D6
        ];
        notes.forEach(({ freq, start, dur }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + start);
            gain.gain.setValueAtTime(0, now + start);
            gain.gain.linearRampToValueAtTime(0.18, now + start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + start);
            osc.stop(now + start + dur + 0.02);
        });
    } catch {
        /* audio not available — silently ignore */
    }
}
