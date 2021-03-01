<script>
import TopBar from './TopBar.svelte';
import Sidebar from './Sidebar.svelte';
import OnScreen from './OnScreen.svelte';

let kirjautunutSisaan = false;

function kirjauduSisaan(){
  kirjautunutSisaan = true;
}

</script>

<TopBar on:kirjaudu={kirjauduSisaan} kirjautunut={kirjautunutSisaan}/>
<Sidebar />
<OnScreen />

<style> 

</style>