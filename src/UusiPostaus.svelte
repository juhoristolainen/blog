<script>
  import kirjautunutKayttaja from './kirjautunut.js';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  let fbUrl = 'https://blogi-b5d8f-default-rtdb.europe-west1.firebasedatabase.app/';

  let kirjoitus = '';
  let otsikko = '';
  let nimi;
//Luo uuden postauksen firebaseen. Kopioitu frontend kurssin materiaaleista ja säädetty toimimaan oikealla tavalla
  const uusiPostaus = (postaus) => {
		fetch(`${fbUrl}postaukset.json`, {
			method : 'POST',
			body: JSON.stringify(postaus),
			headers:{
				'Content-Type': 'application/json',
			},
		})
		.then((response) => {
			if(!response.ok){
				throw new Error('Lisääminen ei onnistu');
			}
      dispatch('luotu');
		})
		.catch((err)=>{
			console.log(err);
		})
		
	}



</script>
//Modali tehty Tikokaupan modalin mukaan.
<div class="modal">
<div class="kirjoitus">
<h2>Luo uusi postaus</h2>
<div>Otsikko</div>
<input class="otsikko" type="text" bind:value={otsikko}>
<div>Teksti</div>
<textarea name="" id="" cols="151" rows="20" bind:value={kirjoitus}></textarea>
<div class="napit">
  <button on:click={(()=>dispatch('peruuta'))}>Peruuta</button>
  <button on:click={(() => uusiPostaus({kirjoittaja: $kirjautunutKayttaja,otsikko: otsikko, postaus: kirjoitus }))}>Lähetä</button>
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