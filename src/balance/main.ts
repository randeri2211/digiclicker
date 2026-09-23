import { mount } from 'svelte';
import '../app.css';
import BalanceLab from './BalanceLab.svelte';

// Dev-only tool page (served at /balance.html by `npm run dev`) - not part
// of the production build, which only bundles index.html.
const lab = mount(BalanceLab, {
  target: document.getElementById('lab')!,
});

export default lab;
