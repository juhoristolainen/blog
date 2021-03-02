<script>
import { afterUpdate } from 'svelte';

  import Footer from './Footer.svelte';
  import postaukset from './postaukset.js'; 

  let postauksia = false;
  

afterUpdate(()=>{

  if($postaukset.length > 1){
  postauksia = true;
}else{
  postauksia = false;
}

});

console.log($postaukset.length);
</script>

<div>
  {#if postauksia}
  <h1>{$postaukset[$postaukset.length-1].otsikko}</h1>
  <p>{$postaukset[$postaukset.length -1].teksti}</p>
  {/if}
</div>
<Footer />
<style>
  div{
    background-color: #edf2f4;
    position: absolute;
    top:7em;
    left: 0px;
    min-width: 100%;
    min-height: 100%;
    max-width: 100%;
  }

  div p{
    position: absolute;
    left: 25em;
    max-width: 50%;
  }

  div h1, h2, h3, h4{
    text-align:center;
  }

</style>