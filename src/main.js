import { createApp, ref, computed, toRaw, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { createGame, recordTurn, turnStatistics } from './game.js';
import './style.css';
createApp({
 setup(){
  const game=ref(createGame(['玩家 1','玩家 2'])),undoStack=ref([]),total=ref(''),finalDouble=ref(false),error=ref(''),notice=ref('');
  const names=ref(['玩家 1','玩家 2']),initial=ref(501),doubleOut=ref(false),setupDialog=ref(null),scoreInput=ref(null);
  const current=computed(()=>game.value.players[game.value.current]);
  const stats=computed(()=>game.value.players.map((_,i)=>turnStatistics(game.value,i)));
  const round=computed(()=>Math.floor(game.value.history.length/game.value.players.length)+1);
  const checkout=computed(()=>total.value!=='' && Number(total.value)===current.value.remaining && game.value.doubleOut);
  const history=computed(()=>game.value.history.map((t,i)=>({...t,round:Math.floor(i/game.value.players.length)+1,index:i})).reverse());
  const focusScore=async()=>{await nextTick();scoreInput.value?.focus();};
  watch(total,()=>{error.value='';finalDouble.value=false;});
  function submit(){
   if(total.value.trim()===''){error.value='請輸入本回合總分';focusScore();return;}
   try{
    if(!/^\d+$/.test(total.value.trim()))throw new Error('請輸入 0–180 的整數');
    const before=structuredClone(toRaw(game.value)),next=recordTurn(before,Number(total.value),finalDouble.value);
    undoStack.value.push(before);game.value=next;
    const last=next.history.at(-1);notice.value=last.bust?`${before.players[before.current].name} 爆鏢，本回合 0 分`:'';
    total.value='';finalDouble.value=false;error.value='';focusScore();
   }catch(e){error.value=e.message;focusScore();scoreInput.value?.select();}
  }
  function undo(){if(!undoStack.value.length)return;game.value=undoStack.value.pop();total.value='';error.value='';notice.value='已撤銷上一回合';finalDouble.value=false;focusScore();}
  function configure(){names.value=game.value.players.map(p=>p.name);initial.value=game.value.initial;doubleOut.value=game.value.doubleOut;setupDialog.value.showModal();}
  function start(){game.value=createGame(names.value.map((n,i)=>n.trim()||`玩家 ${i+1}`),Number(initial.value),doubleOut.value);undoStack.value=[];total.value='';notice.value='';error.value='';setupDialog.value.close();focusScore();}
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
  return{game,undoStack,total,finalDouble,error,notice,names,initial,doubleOut,setupDialog,scoreInput,current,stats,round,checkout,history,submit,undo,configure,start,countPlayers,focusScore};
 },
 template:`
 <div class="shell"><header class="topbar"><h1>飛鏢計分</h1><div class="header-actions"><span class="mode">{{game.initial}} · {{game.doubleOut?'雙倍結鏢':'一般結鏢'}}</span><button class="outline" @click="configure">新比賽 <kbd>Alt N</kbd></button></div></header>
 <main>
  <section class="players" aria-label="玩家分數"><article v-for="(p,i) in game.players" :key="i" class="player" :class="{active:i===game.current}"><div class="player-top"><h2>{{p.name}}</h2><span class="player-status">{{game.winner===i?'獲勝':i===game.current?'投擲中':''}}</span></div><div class="player-score">{{p.remaining}}</div><div class="progress"><i :style="{width:(game.initial-p.remaining)/game.initial*100+'%'}"></i></div><div class="player-bottom"><span>平均 <b>{{stats[i].average}}</b></span><span>最高 <b>{{stats[i].best}}</b></span></div></article></section>
  <section class="entry panel" aria-label="回合計分">
   <div v-if="game.winner!==null" class="victory"><h2>{{current.name}} 獲勝</h2><p>{{stats[game.winner].rounds}} 回合 · 平均 {{stats[game.winner].average}} 分</p><button class="primary" @click="configure">新比賽 <kbd>Enter</kbd></button></div>
   <form v-else @submit.prevent="submit" class="score-form"><div class="entry-heading"><h2>{{current.name}}</h2><span>第 {{round}} 回合</span></div><label for="turn-score">三鏢總分</label><div class="score-input-row"><input ref="scoreInput" id="turn-score" v-model="total" type="text" inputmode="numeric" autocomplete="off" maxlength="3" placeholder="0–180" :aria-invalid="!!error" aria-describedby="entry-message" autofocus><button type="submit" class="primary">記分 <kbd>Enter</kbd></button></div><label v-if="checkout" class="check"><input type="checkbox" v-model="finalDouble">最後一鏢為雙倍或 BULL <kbd>Alt D</kbd></label></form>
   <p id="entry-message" class="message" :class="{error}" role="status" aria-live="polite">{{error||notice}}</p><div class="entry-actions"><button class="text-button" @click="undo" :disabled="!undoStack.length">撤銷上一回合 <kbd>Ctrl / ⌘ Z</kbd></button><span v-if="game.doubleOut" class="rule-note">留 1 分、超分或未以雙倍歸零皆爆鏢</span></div>
  </section>
  <div class="details"><section class="panel stats"><h2>統計</h2><div class="table-scroll"><table><thead><tr><th>玩家</th><th>回合</th><th>平均</th><th>最高</th><th>爆鏢</th></tr></thead><tbody><tr v-for="(p,i) in game.players" :key="i" :class="{current:i===game.current}"><th scope="row">{{p.name}}</th><td>{{stats[i].rounds}}</td><td>{{stats[i].average}}</td><td>{{stats[i].best}}</td><td>{{stats[i].busts}}</td></tr></tbody></table></div></section><section class="panel history"><h2>回合紀錄</h2><p v-if="!history.length" class="empty">尚無紀錄</p><div v-else class="table-scroll history-scroll"><table><thead><tr><th>回合</th><th>玩家</th><th>得分</th><th>剩餘</th></tr></thead><tbody><tr v-for="t in history" :key="t.index"><td>{{t.round}}</td><th scope="row">{{game.players[t.player].name}}</th><td :class="{busted:t.bust}">{{t.bust?'爆鏢 ('+t.submitted+')':t.score}}</td><td>{{t.remaining}}</td></tr></tbody></table></div></section></div>
 </main>
 <dialog ref="setupDialog" class="modal" @close="focusScore" @click="($event.target===setupDialog)&&setupDialog.close()"><div class="section-heading"><h2>新比賽</h2><button class="text-button" @click="setupDialog.close()" aria-label="關閉設定">關閉 <kbd>Esc</kbd></button></div><form @submit.prevent="start"><div class="form-row"><label>起始分數<select v-model="initial" autofocus><option :value="301">301</option><option :value="501">501</option><option :value="701">701</option></select></label><label>人數<select :value="names.length" @change="countPlayers"><option v-for="n in 16" :value="n">{{n}}</option></select></label></div><label class="check"><input type="checkbox" v-model="doubleOut">雙倍結鏢</label><div class="name-list"><label v-for="(_,i) in names" :key="i">玩家 {{i+1}}<input v-model="names[i]" :placeholder="'玩家 '+(i+1)" maxlength="24"></label></div><p class="muted">開始後清除目前比賽。</p><button class="primary" type="submit">開始比賽 <kbd>Enter</kbd></button></form></dialog></div>`
}).mount('#app');
