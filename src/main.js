import { createApp, ref, computed, toRaw, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { createGame, recordTurn, turnStatistics, MODES, CRICKET_TARGETS } from './game.js';
import './style.css';
import VictoryResult from './VictoryResult.js';
createApp({
 components:{VictoryResult},
 setup(){
  const game=ref(createGame(['玩家 1','玩家 2'])),undoStack=ref([]),total=ref(''),finalDouble=ref(false),error=ref(''),notice=ref('');
  const resultRef=ref(null);
  const mode=ref('x01'),roundLimit=ref(8);
  const names=ref(['玩家 1','玩家 2']),initial=ref(501),doubleOut=ref(false),setupDialog=ref(null),scoreInput=ref(null);
  const current=computed(()=>game.value.players[game.value.current]);
  const stats=computed(()=>game.value.players.map((_,i)=>turnStatistics(game.value,i)));
  const round=computed(()=>Math.min(Math.floor(game.value.history.length/game.value.players.length)+1,game.value.mode==='countup'?game.value.roundLimit:Infinity));
  const checkout=computed(()=>total.value!=='' && Number(total.value)===current.value.remaining && game.value.doubleOut);
  const modeLabel=computed(()=>game.value.mode==='x01'?game.value.initial+' · '+(game.value.doubleOut?'雙倍結鏢':'一般結鏢'):MODES[game.value.mode]);
  const inputLabel=computed(()=>({x01:'三鏢總分',countup:'三鏢總分',cricket:'三鏢落點',clock:'依序完成目標數'})[game.value.mode]);
  const placeholder=computed(()=>game.value.mode==='cricket'?'T20 D19 B':game.value.mode==='clock'?'0–3':'0–180');
  const rule=computed(()=>({x01:game.value.doubleOut?'留 1 分、超分或未以雙倍歸零皆爆鏢':'',countup:game.value.roundLimit+' 回合，總分最高者勝；同分並列。',cricket:'15–20、牛眼各中 3 標記關閉；對手未關時可繼續得分。全關且分數不低於對手即勝。',clock:'依序命中 1–20；每鏢最多前進一格，先完成 20 者勝。'})[game.value.mode]);
  const inputHint=computed(()=>game.value.mode==='cricket'?'空白分隔：20 單倍、D20 雙倍、T20 三倍、B 外牛眼、DB 內牛眼、0 未中；只輸入 0 表示全未中。':game.value.mode==='clock'?'例如目前目標 5：依序命中 5、6 後未中，輸入 2。單倍、雙倍、三倍都只算一個目標。':'');
  const averageLabel=computed(()=>game.value.mode==='cricket'?'標記／回合':game.value.mode==='clock'?'目標／回合':'回合平均');
  const resultLabel=computed(()=>game.value.mode==='x01'?'剩餘':game.value.mode==='clock'?'下個目標':'累計');
  const winnerNames=computed(()=>game.value.winners.map(i=>game.value.players[i].name).join('、'));
  function playerValue(p){return game.value.mode==='x01'?p.remaining:game.value.mode==='clock'?(p.target===21?'完成':p.target):p.score;}
  function progress(p){return game.value.mode==='x01'?(game.value.initial-p.remaining)/game.value.initial*100:game.value.mode==='clock'?(p.target-1)/20*100:game.value.mode==='cricket'?Object.values(p.marks).reduce((a,b)=>a+b,0)/21*100:stats.value[game.value.players.indexOf(p)]?.rounds/game.value.roundLimit*100;}
  const history=computed(()=>game.value.history.map((t,i)=>({...t,round:Math.floor(i/game.value.players.length)+1,index:i})).reverse());
  const focusScore=async()=>{await nextTick();scoreInput.value?.focus();};
  watch(total,()=>{error.value='';finalDouble.value=false;});
  function submit(){
   if(total.value.trim()===''){error.value='請輸入'+inputLabel.value;focusScore();return;}
   try{
    if(game.value.mode!=='cricket'&&!/^\d+$/.test(total.value.trim()))throw new Error('請輸入 0–180 的整數');
    const before=structuredClone(toRaw(game.value)),next=recordTurn(before,game.value.mode==='cricket'?total.value:Number(total.value),finalDouble.value);
    undoStack.value.push(before);game.value=next;
    const last=next.history.at(-1);notice.value=last.bust?`${before.players[before.current].name} 爆鏢，本回合 0 分`:'';
    total.value='';finalDouble.value=false;error.value='';focusScore();
   }catch(e){error.value=e.message;focusScore();scoreInput.value?.select();}
  }
  function undo(){if(!undoStack.value.length)return;game.value=undoStack.value.pop();total.value='';error.value='';notice.value='已撤銷上一回合';finalDouble.value=false;focusScore();}
  function configure(){resultRef.value?.close();names.value=game.value.players.map(p=>p.name);initial.value=game.value.initial;doubleOut.value=game.value.doubleOut;mode.value=game.value.mode;roundLimit.value=game.value.roundLimit;setupDialog.value.showModal();}
  function start(){game.value=createGame(names.value.map((n,i)=>n.trim()||`玩家 ${i+1}`),Number(initial.value),doubleOut.value,mode.value,Number(roundLimit.value));undoStack.value=[];total.value='';notice.value='';error.value='';setupDialog.value.close();focusScore();}
  function countPlayers(e){const count=Math.max(1,Math.min(16,Number(e.target.value)||1));names.value=Array.from({length:count},(_,i)=>names.value[i]??`玩家 ${i+1}`);}
  function shortcuts(e){
   if(setupDialog.value?.open)return;
   if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!e.shiftKey){e.preventDefault();undo();}
   if(e.altKey&&e.key.toLowerCase()==='n'){e.preventDefault();configure();}
   if(e.altKey&&e.key.toLowerCase()==='d'&&checkout.value){e.preventDefault();finalDouble.value=!finalDouble.value;focusScore();}
   if(e.key==='Enter'&&game.value.winner!==null){e.preventDefault();configure();}
  }
  onMounted(()=>{focusScore();window.addEventListener('keydown',shortcuts);});
  onUnmounted(()=>window.removeEventListener('keydown',shortcuts));
  return{resultRef,mode,roundLimit,MODES,CRICKET_TARGETS,modeLabel,inputLabel,placeholder,rule,inputHint,averageLabel,resultLabel,winnerNames,playerValue,progress,game,undoStack,total,finalDouble,error,notice,names,initial,doubleOut,setupDialog,scoreInput,current,stats,round,checkout,history,submit,undo,configure,start,countPlayers,focusScore};
 },
 template:`
 <div class="shell"><header class="topbar"><h1>飛鏢計分</h1><div class="header-actions"><span class="mode">{{modeLabel}}</span><button class="outline" @click="configure">新比賽 <kbd>Alt N</kbd></button></div></header>
 <main>
  <section class="players" aria-label="玩家分數"><article v-for="(p,i) in game.players" :key="i" class="player" :class="{active:game.winner===null?i===game.current:game.winners.includes(i)}"><div class="player-top"><h2>{{p.name}}</h2><span class="player-status">{{game.winners.includes(i)?(game.winners.length>1?'並列獲勝':'獲勝'):game.winner===null&&i===game.current?'投擲中':''}}</span></div><div class="player-score">{{playerValue(p)}}<small v-if="game.mode==='clock'&&p.target!==21">目標</small></div><div class="progress"><i :style="{width:progress(p)+'%'}"></i></div><div class="player-bottom"><span>{{averageLabel}} <b>{{stats[i].average}}</b></span><span>最高 <b>{{stats[i].best}}</b></span></div></article></section>
  <section v-if="game.mode==='cricket'" class="panel cricket-board" aria-label="Cricket 標記"><div class="table-scroll"><table><thead><tr><th>玩家</th><th v-for="target in CRICKET_TARGETS" :key="target">{{target===25?'牛眼':target}}</th><th>分數</th></tr></thead><tbody><tr v-for="(p,i) in game.players" :key="i" :class="{current:game.winner===null?i===game.current:game.winners.includes(i)}"><th scope="row">{{p.name}}</th><td v-for="target in CRICKET_TARGETS" :key="target" :class="{closed:p.marks[target]===3}" :aria-label="p.marks[target]===3?'已關閉':p.marks[target]+' 標記'">{{['—','／','×','⊗'][p.marks[target]]}}</td><td>{{p.score}}</td></tr></tbody></table></div></section>
  <section class="entry panel" aria-label="回合計分">
   <VictoryResult v-if="game.winner!==null" ref="resultRef" :game="game" :stats="stats" :mode-label="modeLabel" :average-label="averageLabel" @new-game="configure" @undo="undo" />
   <form v-else @submit.prevent="submit" class="score-form"><div class="entry-heading"><h2>{{current.name}}<small class="current-value">{{resultLabel}} {{playerValue(current)}}</small></h2><span>第 {{round}}{{game.mode==='countup'?' / '+game.roundLimit:''}} 回合</span></div><label for="turn-score">{{inputLabel}}</label><div class="score-input-row" :class="{'dart-input':game.mode==='cricket'}"><input ref="scoreInput" id="turn-score" v-model="total" type="text" :inputmode="game.mode==='cricket'?'text':'numeric'" autocomplete="off" :maxlength="game.mode==='cricket'?30:3" :placeholder="placeholder" :aria-invalid="!!error" aria-describedby="entry-message" autofocus><button type="submit" class="primary">記分 <kbd>Enter</kbd></button></div><p v-if="inputHint" class="input-hint">{{inputHint}}</p><label v-if="checkout" class="check"><input type="checkbox" v-model="finalDouble">最後一鏢為雙倍或 BULL <kbd>Alt D</kbd></label></form>
   <p id="entry-message" class="message" :class="{error}" role="status" aria-live="polite">{{error||notice}}</p><div class="entry-actions"><button class="text-button" @click="undo" :disabled="!undoStack.length">撤銷上一回合 <kbd>Ctrl / ⌘ Z</kbd></button><span v-if="rule" class="rule-note">{{rule}}</span></div>
  </section>
  <div class="details"><section class="panel stats"><h2>統計</h2><div class="table-scroll"><table><thead><tr><th>玩家</th><th>回合</th><th>{{averageLabel}}</th><th>最高回合</th><th v-if="game.mode==='x01'">爆鏢</th></tr></thead><tbody><tr v-for="(p,i) in game.players" :key="i" :class="{current:game.winner===null?i===game.current:game.winners.includes(i)}"><th scope="row">{{p.name}}</th><td>{{stats[i].rounds}}</td><td>{{stats[i].average}}</td><td>{{stats[i].best}}</td><td v-if="game.mode==='x01'">{{stats[i].busts}}</td></tr></tbody></table></div></section><section class="panel history"><h2>回合紀錄</h2><p v-if="!history.length" class="empty">尚無紀錄</p><div v-else class="table-scroll history-scroll"><table><thead><tr><th>回合</th><th>玩家</th><th>{{game.mode==='cricket'?'落點':game.mode==='clock'?'完成目標':'得分'}}</th><th>{{resultLabel}}</th></tr></thead><tbody><tr v-for="t in history" :key="t.index"><td>{{t.round}}</td><th scope="row">{{game.players[t.player].name}}</th><td :class="{busted:t.bust}">{{game.mode==='cricket'?t.submitted:t.bust?'爆鏢 ('+t.submitted+')':t.score}}</td><td>{{game.mode==='clock'&&t.remaining===21?'完成':t.remaining}}</td></tr></tbody></table></div></section></div>
 </main>
 <dialog ref="setupDialog" class="modal" @close="focusScore" @click="($event.target===setupDialog)&&setupDialog.close()"><div class="section-heading"><h2>新比賽</h2><button class="text-button" @click="setupDialog.close()" aria-label="關閉設定">關閉 <kbd>Esc</kbd></button></div><form @submit.prevent="start"><label class="mode-picker">模式<select v-model="mode" autofocus><option v-for="(label,key) in MODES" :key="key" :value="key">{{label}}</option></select></label><div class="form-row"><label v-if="mode==='x01'">起始分數<select v-model="initial"><option :value="301">301</option><option :value="501">501</option><option :value="701">701</option></select></label><label v-else-if="mode==='countup'">回合數<select v-model="roundLimit"><option v-for="n in [8,10,15,20]" :key="n" :value="n">{{n}}</option></select></label><label>人數<select :value="names.length" @change="countPlayers"><option v-for="n in 16" :value="n">{{n}}</option></select></label></div><label v-if="mode==='x01'" class="check"><input type="checkbox" v-model="doubleOut">雙倍結鏢</label><div class="name-list"><label v-for="(_,i) in names" :key="i">玩家 {{i+1}}<input v-model="names[i]" :placeholder="'玩家 '+(i+1)" maxlength="24"></label></div><p class="muted">開始後清除目前比賽。</p><button class="primary" type="submit">開始比賽 <kbd>Enter</kbd></button></form></dialog></div>`
}).mount('#app');

