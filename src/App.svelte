<script>
import TopBar from './TopBar.svelte';
import Sidebar from './Sidebar.svelte';
import OnScreen from './OnScreen.svelte';
import Kirjoittaminen from './UusiBlogi.svelte';

let kirjautunutSisaan = false;
let bloginLuonti = false;


</script>
<div class="sivu">
<TopBar on:kirjaudu={(()=> kirjautunutSisaan = true)} kirjautunut={kirjautunutSisaan} on:uusipostaus={(() => bloginLuonti = true)}/>
<Sidebar />
<OnScreen />
{#if bloginLuonti}
<Kirjoittaminen on:luotu={(()=>bloginLuonti = false)} on:peruuta={(()=>bloginLuonti = false)}/>
{/if}
</div>


<style> 
.sivu{
  max-width: 100%;
}
</style>