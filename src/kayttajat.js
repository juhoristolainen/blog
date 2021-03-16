import { afterUpdate } from 'svelte';
import { writable } from 'svelte/store';
let kayttajat = [];
let fbUrl =
  'https://blogi-b5d8f-default-rtdb.europe-west1.firebasedatabase.app/';

const kayttaja = writable({});

const haeKayttajat = async () => {
  const response = await fetch(`${fbUrl}kayttajat.json`);
  if (!response.ok) {
    throw new Error('Dataa ei saatu');
  }
  const data = await response.json();
  for (const key in data) {
    kayttajat.push({ id: key, ...data[key] });
  }
  kayttajat = kayttajat;
  kayttaja.set(kayttajat);
};

haeKayttajat();
export default kayttaja;
