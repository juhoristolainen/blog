//Apuna käytetty https://svelte.dev/tutorial/readable-stores

import { readable } from 'svelte/store';

export const pvm = readable(new Date(), function start(set) {
  const interval = setInterval(() => {
    set(new Date());
  }, 1000);

  return function stop() {
    clearInterval(interval);
  };
});
