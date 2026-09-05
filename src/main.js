import { createApp, ref, computed, toRaw, watch, nextTick } from 'vue';
import { createGame, throwDart, statistics } from './game.js';
import './style.css';

createApp({
 setup() {
  const game=ref(createGame(['玩家 1','玩家 2'])), undoStack=ref([]), multiplier=ref(1), editing=ref(false), names=ref(['玩家 1','玩家 2']), initial=ref(501), doubleOut=ref(false), notice=ref(''), selected=ref(null);
  const current=computed(()=>game.value.players[game.value.current]);
  const stats=computed(()=>game.value.players.map((_,i)=>statistics(game.value,i)));
  const selectedIndex=computed(()=>selected.value??game.value.current);
  const activeStats=computed(()=>stats.value[selectedIndex.value]);
  const round=computed(()=>Math.floor(game.value.history.length/game.value.players.length)+1);
  function score(base,m=multiplier.value) {
   if(game.value.winner!==null)return;
   const before=structuredClone(toRaw(game.value));
   game.value=throwDart(before,base,m); undoStack.value.push(before); multiplier.value=1;
   const last=game.value.history.at(-1);
   notice.value=game.value.winner!==null?`${current.value.name} 贏得比賽！`:game.value.history.length>before.history.length?(last.bust?'爆鏢！本回合不計分，換下一位。':`回合得分 ${last.score}，換 ${current.value.name}。`):'';
  }
  function undo(){ if(undoStack.value.length){game.value=undoStack.value.pop();notice.value='已撤銷上一鏢';multiplier.value=1;} }
  function configure(){names.value=game.value.players.map(p=>p.name);initial.value=game.value.initial;doubleOut.value=game.value.doubleOut;editing.value=true;}
  function start(){game.value=createGame(names.value.map((n,i)=>n.trim()||`玩家 ${i+1}`),Number(initial.value),doubleOut.value);undoStack.value=[];editing.value=false;selected.value=null;multiplier.value=1;notice.value='新比賽開始';}
  function countPlayers(e){const count=Math.max(1,Math.min(16,Number(e.target.value)||1));names.value=Array.from({length:count},(_,i)=>names.value[i]??`玩家 ${i+1}`);}
  let previousFocus;
  const trapFocus=e=>{if(e.key!=='Tab')return;const items=[...document.querySelectorAll('.modal button, .modal input, .modal select')];const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}};
  watch(editing,async open=>{if(open){previousFocus=document.activeElement;await nextTick();document.querySelector('.modal button')?.focus();document.addEventListener('keydown',trapFocus);}else{document.removeEventListener('keydown',trapFocus);previousFocus?.focus();}});
  const context=document.modelContext;
  if(context?.registerTool){
   const lifecycle=new AbortController();
   const register=tool=>{try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
   register({name:'read_dart_game',description:'Read the current darts scores, players, and statistics.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({game:structuredClone(toRaw(game.value)),statistics:stats.value})});
   register({name:'record_dart',description:'Record one dart in the active game. base is 0 (miss), 1–20, or 25. multiplier is 1–3; bull permits only 1 or 2.',inputSchema:{type:'object',properties:{base:{type:'integer',enum:[0,...Array.from({length:20},(_,i)=>i+1),25]},multiplier:{type:'integer',enum:[1,2,3]}},required:['base','multiplier'],additionalProperties:false},annotations:{readOnlyHint:false},execute:async input=>{if(editing.value)throw new Error('請先完成比賽設定');if(game.value.winner!==null)throw new Error('比賽已結束');throwDart(structuredClone(toRaw(game.value)),input.base,input.multiplier);score(input.base,input.multiplier);await nextTick();return {current:game.value.current,players:structuredClone(toRaw(game.value.players)),winner:game.value.winner};}});
   window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
  }
  return {game, multiplier, editing,names,initial,doubleOut,notice,selected,current,stats,selectedIndex,activeStats,round,score,undo,configure,start,countPlayers,undoStack};
 },
 template: `
 <div class="shell">
  <header class="topbar"><a href="./" class="brand"><span class="brand-mark">◎</span> DART CLUB<span class="brand-sub">飛鏢計分</span></a><div class="header-actions"><span class="live"><i></i> LOCAL GAME</span><button class="outline" @click="configure">比賽設定 <span>↗</span></button></div></header>
  <main><div class="page-heading"><div><div class="eyebrow">THE SCOREBOARD</div><h1>每一鏢，都算數<span>.</span></h1></div><div class="game-meta"><b>{{game.initial}}</b><span>{{game.doubleOut?'雙倍結鏢':'一般結鏢'}}<br>{{game.players.length}} 位玩家 · 第 {{round}} 回合</span></div></div>
  <section class="players" aria-label="玩家分數"><article v-for="(p,i) in game.players" :key="i" class="player" :class="{active:i===game.current, winner:game.winner===i}"><div class="player-top"><span class="avatar">{{String(i+1).padStart(2,'0')}}</span><h2>{{p.name}}</h2><span class="player-status">{{game.winner===i?'WINNER':i===game.current?'投擲中':'等待中'}}</span></div><div class="player-score">{{p.remaining}}<small>剩餘分數</small></div><div class="progress"><i :style="{width: (game.initial-p.remaining)/game.initial*100+'%'}"></i></div><div class="player-bottom"><span>三鏢平均 <b>{{stats[i].average}}</b></span><span>已投 <b>{{stats[i].darts}}</b> 鏢</span></div></article></section>
  <div class="workspace"><section class="scoring panel"><div class="section-heading"><h2><span class="dot"></span> {{current.name}} <small>{{game.winner!==null?'完成比賽':'輪到你了'}}</small></h2><button class="text-button" @click="undo" :disabled="!undoStack.length">↶ 撤銷上一鏢</button></div>
   <div v-if="game.winner!==null" class="victory"><div class="eyebrow">NICE FINISH</div><h2>{{current.name}} 獲勝！</h2><p>用 {{stats[game.winner].darts}} 鏢完成 {{game.initial}} 分</p><button class="primary" @click="configure">再來一場 ↗</button></div>
   <template v-else><div class="turn"><div v-for="i in 3" :key="i" class="dart" :class="{next:game.turn.length===i-1}"><span>第 {{i}} 鏢</span><b>{{game.turn[i-1]?.label??'—'}}</b></div><div class="turn-total"><span>本回合</span><b>{{game.turn.reduce((s,d)=>s+d.score,0)}}</b></div></div>
   <div class="input-label"><h3>輸入落點</h3><span>先選倍數，再選分區</span></div><div class="multipliers" aria-label="倍數"><button v-for="(label,i) in ['單倍 Single','雙倍 Double','三倍 Triple']" :class="{selected:multiplier===i+1}" :aria-pressed="multiplier===i+1" @click="multiplier=i+1">{{label}} <b>×{{i+1}}</b></button></div><div class="numbers"><button v-for="n in 20" @click="score(n)">{{n}}<small v-if="multiplier>1">{{n*multiplier}}</small></button></div><div class="special"><button @click="score(0,1)">Miss <span>0</span></button><button @click="score(25,1)">外牛眼 <span>25</span></button><button @click="score(25,2)">BULL <span>50</span></button></div></template>
   <p role="status" aria-live="polite" class="notice">{{notice || '每回合 3 鏢，完成後自動換下一位。'}}</p>
  </section>
  <aside class="stats panel"><div class="section-heading"><h2>即時統計</h2><span class="live"><i></i> LIVE</span></div><label class="sr-only" for="stats-player">統計玩家</label><select id="stats-player" :value="selectedIndex" @change="selected=Number($event.target.value)"><option v-for="(p,i) in game.players" :value="i">{{p.name}}</option></select><div class="average"><span>三鏢平均</span><strong>{{activeStats.average}}</strong><small>以實際扣分 ÷ 投鏢數 × 3 計算</small></div><div class="stat-grid"><div><span>最高回合</span><b>{{activeStats.best}}</b></div><div><span>命中率</span><b>{{activeStats.hit}}<small>%</small></b></div><div><span>雙倍命中</span><b>{{activeStats.doubles}}</b></div><div><span>三倍命中</span><b>{{activeStats.triples}}</b></div></div><div class="stat-footer"><span>爆鏢回合</span><b>{{activeStats.busts}}</b></div><p class="stat-note">命中率含爆鏢回合的非 Miss 投擲；爆鏢回合得分以 0 計算。</p></aside></div>
  <section class="history panel"><div class="section-heading"><h2>回合紀錄 <small>{{game.history.length}} 回合</small></h2><span class="muted">最新紀錄在最上方</span></div><div v-if="!game.history.length" class="empty"><span>◎</span><p>第一鏢，從這裡開始。</p><small>完成一個回合後，紀錄會出現在這裡。</small></div><div v-else class="table-scroll"><table><thead><tr><th>回合</th><th>玩家</th><th>投擲</th><th>得分</th><th>剩餘</th></tr></thead><tbody><tr v-for="(t,i) in [...game.history].reverse()"><td>{{Math.floor((game.history.length-1-i)/game.players.length)+1}}</td><td>{{game.players[t.player].name}}</td><td><span class="throw-chip" v-for="d in t.darts">{{d.label}}</span></td><td :class="{busted:t.bust}">{{t.bust?'爆鏢':t.score}}</td><td>{{t.remaining}}</td></tr></tbody></table></div></section>
  <footer><span>DART CLUB / PLAY YOUR NEXT SHOT.</span><span>純前端計分 · 重新整理頁面會清除比賽</span></footer>
  </main>
  <div v-if="editing" class="modal-backdrop" @click.self="editing=false" @keydown.esc="editing=false"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="setup-title"><div class="section-heading"><h2 id="setup-title">設定新比賽</h2><button autofocus class="text-button" @click="editing=false" aria-label="關閉">✕</button></div><form @submit.prevent="start"><div class="form-row"><label>起始分數<select v-model="initial"><option :value="301">301</option><option :value="501">501</option><option :value="701">701</option></select></label><label>玩家人數<select :value="names.length" @change="countPlayers"><option v-for="n in 16" :value="n">{{n}} 人</option></select></label></div><label class="check"><input type="checkbox" v-model="doubleOut">雙倍結鏢 <small>最後一鏢需雙倍或 BULL</small></label><div class="name-list"><label v-for="(_,i) in names">玩家 {{i+1}}<input v-model="names[i]" :placeholder="'玩家 '+(i+1)" maxlength="24"></label></div><p class="muted">開始新比賽會清除目前分數與紀錄。</p><button class="primary" type="submit">開始比賽 ↗</button></form></section></div>
 </div>`
}).mount('#app');
