<script>
import TopBar from './TopBar.svelte';
import Sidebar from './Sidebar.svelte';
import OnScreen from './OnScreen.svelte';
import Kirjoittaminen from './UusiBlogi.svelte';

let kirjautunutSisaan = false;
let bloginLuonti = false;

function kirjauduSisaan(){
  kirjautunutSisaan = true;
}

</script>

<TopBar on:kirjaudu={kirjauduSisaan} kirjautunut={kirjautunutSisaan}/>
<Sidebar />
<OnScreen />
{#if bloginLuonti}
<Kirjoittaminen />
{/if}

<style> 

</style>