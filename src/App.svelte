<script>
import TopBar from './TopBar.svelte';
import OnScreen from './OnScreen.svelte';
import Kirjoittaminen from './UusiPostaus.svelte';
import Rekisteroityminen from './Register.svelte';

let kirjautunutSisaan = false;
let bloginLuonti = false;
let rekisteroityminen = false;




</script>
<div class="sivu">
<TopBar on:kirjaudu={(()=> kirjautunutSisaan = true)} kirjautunut={kirjautunutSisaan} on:uusipostaus={(() => bloginLuonti = true)} on:rekisteroidy={(()=> rekisteroityminen = true)}/>
<OnScreen />
{#if bloginLuonti}
<Kirjoittaminen on:peruuta={(()=>bloginLuonti = false)} on:luotu={(()=> bloginLuonti = false)}/>
{/if}
{#if rekisteroityminen}
<Rekisteroityminen on:peruuta={(()=> rekisteroityminen = false)} on:rekisteroidytty={(()=>rekisteroityminen = false)}/>
{/if}
</div>


<style> 
.sivu{
  max-width: 100%;
}
</style>