<script>
import { createEventDispatcher, onMount } from 'svelte';
const dispatch = createEventDispatcher();

let fbUrl = 'https://blogi-b5d8f-default-rtdb.europe-west1.firebasedatabase.app/';
let uusiNimi;
let uusiSalasana;
let validiNimi = true;
let validiSalasana = true;

const luoKayttaja = function(kayttaja){
  if(kayttaja.nimi.length > 3){
    validiNimi = true;
  }else{
    validiNimi = false;
  }
  if (kayttaja.salasana.length > 3){
    validiSalasana = true;
  }else{
    validiSalasana = false;
  }
    if(validiNimi && validiSalasana){
      dispatch('rekisteroidytty');
  fetch(`${fbUrl}kayttajat.json`, {
			method : 'POST',
			body: JSON.stringify(kayttaja),
			headers:{
				'Content-Type': 'application/json',
			},
		})
		.then((response) => {
			if(!response.ok){
				throw new Error('Lisääminen ei onnistu');
			}
		})
		.catch((err)=>{
			console.log(err);
		})
  }
}

const peruuta = function(){
  dispatch('peruuta');
  uusiNimi = '';
  uusiSalasana = '';
}


</script>
//Modali tehty Tikokaupan modalin mukaan.
<div class="modal">
  <div class="rekisteroidy">
    <h2>REKISTERÖIDY</h2>
    <label for="uusinimi">Nimi</label>
    <input type="text" bind:value={uusiNimi} id="uusinimi" placeholder="Syötä nimesi">
    {#if !validiNimi}
    <span class="virhe">Käyttäjätunnuksessa täytyy olla vähintään neljä merkkiä!</span>
    {/if}
    <label for="uusisalasana">Salasana</label>
    <input type="password" bind:value={uusiSalasana} id="uusisalasana" placeholder="Syötä salasana">
    {#if !validiSalasana}
    <span class="virhe">Salasanassa täytyy olla vähintään neljä merkkiä!</span>
    {/if}
    <div>
    </div>
    <button on:click={peruuta}>Peruuta</button>
    <button on:click={(()=> luoKayttaja({nimi: uusiNimi, salasana: uusiSalasana}))}>Rekisteröidy</button>
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
    z-index: 15;
  }

  .rekisteroidy{
    background-color: #edf2f4;
    left: 20%;
    top: 20%;
    width: 60%;
    height: 30%;
    z-index: 12;
    position: absolute;
    overflow: scroll;
    text-align: center;
    padding-top: 2em;
  }
.virhe{
  position: absolute;
  color: red;
}

</style>