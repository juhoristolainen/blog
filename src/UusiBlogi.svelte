<script>
  import kayttaja from './kayttajat.js';
  import postaus from './postaukset.js';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  class Blogi{

    constructor(kirjoittaja, otsikko, tagit, teksti){
      this.kirjoittaja = kirjoittaja;
      this.otsikko = otsikko;
      this.tagit = tagit;
      this.teksti = teksti;
    }

  }

  let kirjoitus = '';
  let otsikko = '';

  const luoPostaus = function() {
    const uusiPostaus = new Blogi($kayttaja.ktun, otsikko, ['on', 'jees'], kirjoitus)
    postaus.update((p) => [...p, uusiPostaus]);
    dispatch('luotu');
  }

</script>

<div class="modal">
<div class="kirjoitus">
<h2>Luo uusi postaus</h2>
<div>Otsikko</div>
<input class="otsikko" type="text" bind:value={otsikko}>
<div>Teksti</div>
<textarea name="" id="" cols="151" rows="20" bind:value={kirjoitus}></textarea>
<div class="napit">
  <button on:click={(()=>dispatch('peruuta'))}>Peruuta</button>
  <button on:click={luoPostaus}>Lähetä</button>
</div>
</div>
</div>

<style>
  .modal{
    background-color: rgba(1, 1, 1, 0.7);
    top: 0%;
    left: 0%;
    height: 100%;
    width: 100%;
    position: fixed;
    z-index: 11;
  }

  .kirjoitus{
    background-color: #edf2f4;
    left: 20%;
    top: 20%;
    width: 60%;
    height: 70%;
    z-index: 12;
    position: absolute;
    overflow: scroll;
    text-align: center;
  }

  .kirjoitus textarea{
    margin: 1em;
  }

  .otsikko{
    width: 75%;
    font-size: 30px;
  }

  button:hover{
  background-color: rgb(207, 207, 207);
}

</style>