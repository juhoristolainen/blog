<script>
import { createEventDispatcher, onMount } from 'svelte';
const dispatch = createEventDispatcher();

  import kayttaja from './kayttajat.js';
  import { pvm } from './paivamaara.js';

  let nimi;
  let salasana;
  export let kirjautunut;
  let vaaratunnus = false;


//Tarkistaa mikäli syötetty nimi ja salasana ovat oikein. Jos ovat, niin lähettää juurikomponentille 'kirjaudu'-dispatchin.
function kirjaudu(){
  for(let i = 0; i < $kayttaja.length; i++){
    if(nimi === $kayttaja[i].nimi){
      if(salasana === $kayttaja[i].salasana){
        kirjautunut = true;
      }else{
        vaaratunnus = true;
      }
    }else{
      vaaratunnus = true;
    }
  }
}

function kirjauduUlos(){
  kirjautunut = false;
  nimi = '';
  salasana = '';
  vaaratunnus = false;
}

//Apuna käytetty https://svelte.dev/tutorial/readable-stores
const muuntaja = new Intl.DateTimeFormat('fi',{
  hour12: false,
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  day: '2-digit',
  month: '2-digit',
});



</script>
<div class="palkki">
  {#if !kirjautunut}
<div class="kirjautuminen">
  {#if vaaratunnus}
  <span class ="vaaratunnus">Väärä käyttäjätunnus tai salasana</span>
  {/if}
  <label for="nimi">Nimi</label>
  <input type="text" id="nimi" bind:value={nimi}>
  <button class="rekisteroidy" on:click={(()=>dispatch('rekisteroidy'))}>Rekisteröidy</button>
  <label for="salasana">Salasana</label>
  <input type="password" id="salasana" bind:value={salasana}>  
  <button on:click={kirjaudu}>Kirjaudu sisään!</button>
</div>
{:else}
<div class="kirjautunut">
  <button class="uusipostaus" on:click={(()=> dispatch('uusipostaus'))}>Uusi postaus</button>
  <div class="tervehdys">
    <h2>Moikka {nimi}!</h2>
  </div>
<button class="kirjauduUlos" on:click={kirjauduUlos}>Kirjaudu ulos!</button>
</div>
{/if}
<h1>{muuntaja.format($pvm)}</h1>
</div>

<style>
  .palkki{
    background-color: #14213d;
    display: flex;
    position: fixed;
    top: 0;
    left:0;
    height: 8em;
    width: 100%;
    color: white;
    border-radius: 0 0 10px 10px;
    box-shadow: 0 2px 15px #14213d;
    z-index: 10;
    justify-content: flex-end;
    align-items: center;
  }

label{
  position: relative;
  /* top: 37%;
  left: 65%; */
}

 input, button{
  position: relative;
  display: inline;
  /* top: 30%;
  left: 65%; */
  z-index: 12;
  height: 2.5rem;
  margin: 0 0.1em;
}

.kirjauduUlos{
  position: relative;
  left: 0%;
  z-index: 10;
}

.tervehdys{
  position: absolute;
  left: 80%;
  top: 1em;
  height: 1em;
  width: 10em;
}

h1{
  z-index: 10;
  color: #edf2f4;
  position: absolute;
  left: 1%;
}

.vaaratunnus{
  position: absolute;
  left: 87%;
  top: 50%;
  color: red;
}

.uusipostaus{
  position: absolute;
  left: 70%;
}

button:hover{
  background-color: rgb(207, 207, 207);
}

.rekisteroidy{
  background-color: #8d99ae;
  color: #edf2f4;
}

</style>

