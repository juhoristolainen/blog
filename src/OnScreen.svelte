<script>
import { afterUpdate } from 'svelte';


  import kirjautunutKayttaja from './kirjautunut.js';
  let postaus = [];
  let fbUrl = 'https://blogi-b5d8f-default-rtdb.europe-west1.firebasedatabase.app/';
  let kirjautunut;
afterUpdate(()=>{
  if($kirjautunutKayttaja.length > 1){
    kirjautunut = true;
  }else{
    kirjautunut = false;
  }
});

  
//Hakee postaukset firebasesta. Kopioitu frontend kurssin materiaaleista ja säädetty toimimaan oikealla tavalla
  const haePostaus = async() => {
		postaus = [];
		const response = await fetch(
			`${fbUrl}postaukset.json`
		);
		if (!response.ok){
			throw new Error('Dataa ei saatu');
		}
		const data = await response.json();
		for(const key in data){
			postaus.push({id: key, ...data[key]});
		}
		postaus = postaus;
	}

haePostaus();

//Poistaa postauksen firebasesta. Kopioitu frontend kurssin materiaaleista ja säädetty toimimaan oikealla tavalla
  const poistaPostaus = (id) => {
		fetch(`${fbUrl}postaukset/${id}.json`,{
			method: 'DELETE',
		})
		.then((response) => {
			if (!response.ok){
				throw new Error('Ei voi poistaa');
			}
			haePostaus();
		})
		.catch((err) => {
			console.log(err);
		});
	};


</script>

<div>
    <!-- Julkaisee postaukset -->
    {#each postaus as posti(posti.id)}
    <div class="postaus">
      <h1>{posti.otsikko}</h1>
      <div class="kirjoittaja">Kirjoittaja: {posti.kirjoittaja}</div>
      <div class="tekstikentta">
      <span class="teksti">{posti.postaus}</span>
    </div>
    {#if kirjautunut}
      <img class="poista" on:click={(()=> poistaPostaus(posti.id))} width="60px" src="data:image/png;base64,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" alt="Poista teksti">
      {/if}
    </div>
    {/each}
    <button class="paivita" on:click={(()=> haePostaus())}>Päivitä</button>
</div>
<!-- <Footer /> -->
<style>
  .postaus{
    background-color: #edf2f4;
    position: relative;
    top:8em;
    left: 8%;
    min-width: 50%;
    min-height: 100%;
    max-width: 83%;
  }

  div .teksti{
    position: relative;
    left: 2em;
    width: 5em;
    word-wrap: break-word;
  }

  div h1, h2, h3, h4{
    text-align:center;
  }

  .paivita{
    position: fixed;
    left: 0.5em;
    top: 8em;
    z-index: 11;
    width: 8%;
    height: 8%
  }

  .postaus{
    /* background-color: beige; */
    margin: 2em 0;
    padding: 1em 0;
    box-shadow: 1px 1px 15px gray;
  }

  .poista{
    position: absolute;
    right: 1em;
    bottom: 1em;
  }


  .tekstikentta{
    width: 90%;
    margin: 2em 3%;
  }

  .kirjoittaja{
    text-align: center;
    margin-bottom: 2em;
  }
</style>