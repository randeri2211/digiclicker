import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { unlockAudio } from './lib/game/audio/sfx.svelte'

// Browsers only allow audio after a user gesture - start it on the first one.
for (const event of ['pointerdown', 'keydown']) {
  window.addEventListener(event, unlockAudio, { capture: true, passive: true })
}

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
