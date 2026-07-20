import { useGame } from '../game/store';
import { useUiSettings } from './uiSettings';
import { useUi } from './uiStore';

let ctx: AudioContext | null = null;

function blip(freq: number, dur: number, type: OscillatorType, vol = 0.15) {
  if (useGame.getState().muted) return;
  if (useUi.getState().adPlaying) return; // CrazyGames: game audio muted during ads
  const settings = useUiSettings.getState();
  const gain = vol * settings.masterVolume * settings.sfxVolume;
  if (gain <= 0) return;
  try {
    if (!ctx) ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + dur);
  } catch {
    // audio unavailable — stay silent
  }
}

export const sfx = {
  pick: () => blip(160 + Math.random() * 80, 0.08, 'square'),
  coin: () => {
    blip(900, 0.12, 'triangle', 0.2);
    setTimeout(() => blip(1300, 0.18, 'triangle', 0.2), 60);
  },
  burp: () => blip(75, 0.3, 'sawtooth', 0.25),
};
