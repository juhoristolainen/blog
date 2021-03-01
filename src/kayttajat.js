import { writable } from 'svelte/store';

const kayttaja = writable({ ktun: 'Juho', salasana: 1234 });

export default kayttaja;
