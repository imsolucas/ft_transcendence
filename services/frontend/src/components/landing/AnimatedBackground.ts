import { effects } from '../../styles/theme';

export function createAnimatedBackground(): string {
  return `
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 ${effects.rounded['2xl']} ${effects.blur.xl} ${effects.animations.pulse}"></div>
      <div class="absolute top-3/4 right-1/4 w-96 h-96 bg-purple-500/10 ${effects.rounded['2xl']} ${effects.blur.xl} ${effects.animations.pulseDelay1000}"></div>
      <div class="absolute bottom-1/4 left-1/3 w-48 h-48 bg-pink-500/10 ${effects.rounded['2xl']} ${effects.blur.xl} ${effects.animations.pulseDelay500}"></div>
    </div>
  `;
}
