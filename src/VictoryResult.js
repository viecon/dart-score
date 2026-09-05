import {ref,computed,onMounted,onUnmounted} from 'vue';

export default {
 props:{game:Object,stats:Array,modeLabel:String,averageLabel:String},
 emits:['new-game','undo'],
 setup(props,{emit}){
  const dialog=ref(null),progress=ref(0),reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const winners=computed(()=>props.game.winners.map(i=>({index:i,player:props.game.players[i],stats:props.stats[i]})));
  const scoreLabel=computed(()=>props.game.mode==='x01'?'完成分數':props.game.mode==='clock'?'完成目標':'總分');
  const value=p=>props.game.mode==='x01'?props.game.initial:props.game.mode==='clock'?20:p.score;
  const count=n=>Math.round(n*progress.value).toLocaleString();
  const pieces=Array.from({length:48},(_,i)=>({left:(i*37%101)+'%',delay:((i*17%13)*.07)+'s',duration:(2.8+(i%7)*.17)+'s',drift:((i%2?1:-1)*(30+i%9*12))+'px',rotation:(i*71)+'deg',color:['#c1f76c','#eef7df','#839e65','#d7be79'][i%4]}));
  let frame=0;
  function finishMotion(){cancelAnimationFrame(frame);progress.value=1;}
  function close(){finishMotion();dialog.value?.close();}
  function open(){dialog.value?.showModal();}
  function newGame(){close();emit('new-game');}
  function undo(){close();emit('undo');}
  onMounted(()=>{
   open();
   if(reduced.matches){progress.value=1;return;}
   let started;
   const tick=time=>{started??=time;const t=Math.min(1,(time-started)/1000);progress.value=1-Math.pow(1-t,4);if(t<1)frame=requestAnimationFrame(tick);};
   frame=requestAnimationFrame(tick);
   reduced.addEventListener('change',finishMotion);
  });
  onUnmounted(()=>{cancelAnimationFrame(frame);reduced.removeEventListener('change',finishMotion);dialog.value?.close();});
  return{dialog,winners,scoreLabel,value,count,pieces,close,open,newGame,undo};
 },
 template:`
 <div class="result-inline"><span>{{game.winners.map(i=>game.players[i].name).join('、')}} {{game.winners.length>1?'並列獲勝':'獲勝'}}</span><button class="outline" @click="open">查看結算</button><button class="primary" @click="newGame">新比賽 <kbd>Enter</kbd></button></div>
 <dialog ref="dialog" class="result-dialog" aria-labelledby="result-title" @cancel="close" @close="close">
  <div class="confetti" aria-hidden="true"><i v-for="(piece,i) in pieces" :key="i" :style="{'--left':piece.left,'--delay':piece.delay,'--duration':piece.duration,'--drift':piece.drift,'--rotation':piece.rotation,'--color':piece.color}"></i></div>
  <div class="result-stage">
   <div class="result-topline"><span>{{modeLabel}}</span><button class="result-close" @click="close" aria-label="關閉結算">Esc <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div>
   <div class="result-heading"><div class="award-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 3h8v6a4 4 0 0 1-8 0V3ZM8 5H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4M12 13v5m-4 3h8m-7-3h6v3"/></svg></div><h2 id="result-title">{{game.winners.length>1?'並列獲勝':'獲勝'}}</h2></div>
   <div class="result-winners" :class="{'multiple':winners.length>1}">
    <article v-for="winner in winners" :key="winner.index" class="winner-result">
     <h3>{{winner.player.name}}</h3>
     <div class="result-score"><span>{{scoreLabel}}</span><strong aria-hidden="true">{{count(value(winner.player))}}</strong><span class="sr-only">{{value(winner.player)}}</span></div>
     <dl class="result-metrics"><div><dt>回合</dt><dd>{{winner.stats.rounds}}</dd></div><div><dt>{{averageLabel}}</dt><dd>{{winner.stats.average}}</dd></div><div><dt>最高回合</dt><dd>{{winner.stats.best}}</dd></div></dl>
    </article>
   </div>
   <div class="result-actions"><button class="result-secondary" @click="undo">撤銷最後回合 <kbd>Ctrl / ⌘ Z</kbd></button><button class="result-next" @click="newGame" autofocus>再來一局 <kbd>Enter</kbd><span aria-hidden="true">↗</span></button></div>
  </div>
 </dialog>`
};
