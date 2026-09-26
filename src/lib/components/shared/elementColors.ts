import type { Element } from '../../game/types';

// Identity colours only - chip text stays in the normal text colour, so a
// hue never has to carry readability on the dark panels. Neutral (no icon)
// shows as a dot in its colour.
export const ELEMENT_COLOR: Record<Element, string> = {
  Fire: '#e8663d',
  Water: '#3a8fe8',
  Plant: '#3fae5a',
  Electric: '#e6c229',
  Earth: '#b08452',
  Wind: '#7fd1c7',
  Metal: '#9aa7b0',
  Light: '#f1e7b0',
  Dark: '#9a7be0',
  Neutral: '#6d878c',
};
