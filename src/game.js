export const CRICKET_TARGETS=[20,19,18,17,16,15,25];
export const MODES={x01:'01 減分',countup:'Count Up 累分',cricket:'Cricket',clock:'Around the Clock'};
export function createGame(names,initial=501,doubleOut=false,mode='x01',roundLimit=8){
 if(!Object.hasOwn(MODES,mode))throw new Error('無效的模式');
 if(!Number.isInteger(roundLimit)||roundLimit<1||roundLimit>30)throw new Error('回合數需為 1–30');
 return{mode,initial,doubleOut:mode==='x01'&&doubleOut,roundLimit,players:names.map(name=>({name,remaining:initial,score:0,target:1,marks:Object.fromEntries(CRICKET_TARGETS.map(n=>[n,0]))})),current:0,history:[],winner:null,winners:[]};
}
const dartScores=[...new Set([0,25,50,...Array.from({length:20},(_,i)=>[i+1,(i+1)*2,(i+1)*3]).flat()])];
const possibleTotals=new Set(dartScores.flatMap(a=>dartScores.flatMap(b=>dartScores.map(c=>a+b+c))));
const doubleFinishes=new Set(dartScores.flatMap(a=>dartScores.flatMap(b=>[50,...Array.from({length:20},(_,i)=>(i+1)*2)].map(c=>a+b+c))));
function validateTotal(total){
 if(!Number.isInteger(total)||total<0||total>180)throw new Error('請輸入 0–180 的整數');
 if(!possibleTotals.has(total))throw new Error(`${total} 不是三鏢可達成的分數`);
}
function win(g,indices=[g.current]){g.winners=indices;g.winner=indices[0];}
function rotate(g){if(g.winner===null)g.current=(g.current+1)%g.players.length;return g;}
export function parseCricket(input){
 if(typeof input!=='string')throw new Error('請輸入三鏢落點');
 let tokens=input.trim().toUpperCase().split(/[\s,，]+/).filter(Boolean);
 if(tokens.length===1&&['0','M','MISS'].includes(tokens[0]))tokens=['0','0','0'];
 if(tokens.length<1||tokens.length>3)throw new Error('每回合最多三鏢，以空白分隔');
 return tokens.map(token=>{
  if(['0','M','MISS'].includes(token))return{base:0,multiplier:1,label:'0'};
  if(['B','25','SB'].includes(token))return{base:25,multiplier:1,label:'B'};
  if(['DB','50','BULL'].includes(token))return{base:25,multiplier:2,label:'DB'};
  const match=token.match(/^([SDT]?)([1-9]|1\d|20)$/);
  if(!match)throw new Error('格式：20、D19、T18、B、DB 或 0，以空白分隔');
  return{base:Number(match[2]),multiplier:({S:1,D:2,T:3})[match[1]]||1,label:token};
 });
}
function recordCricket(game,input){
 const darts=parseCricket(input),g=structuredClone(game),player=g.players[g.current],before=player.score;
 let effectiveMarks=0,used=[];
 for(const dart of darts){
  used.push(dart.label);
  if(CRICKET_TARGETS.includes(dart.base)){
   const closing=Math.min(3-player.marks[dart.base],dart.multiplier);
   player.marks[dart.base]+=closing;effectiveMarks+=closing;
   const extra=dart.multiplier-closing;
   if(extra&&g.players.some((p,i)=>i!==g.current&&p.marks[dart.base]<3)){player.score+=extra*dart.base;effectiveMarks+=extra;}
  }
  if(CRICKET_TARGETS.every(n=>player.marks[n]===3)&&g.players.every(p=>player.score>=p.score)){win(g);break;}
 }
 if(darts.length!==3&&g.winner===null)throw new Error('請輸入三鏢；未命中請填 0');
 g.history.push({player:g.current,submitted:used.join(' '),score:player.score-before,marks:effectiveMarks,bust:false,remaining:player.score});
 return rotate(g);
}
export function recordTurn(game,total,finalDouble=false){
 if(game.winner!==null)throw new Error('比賽已結束');
 if(game.mode==='cricket')return recordCricket(game,total);
 const g=structuredClone(game),player=g.players[g.current];
 if(game.mode==='clock'){
  if(!Number.isInteger(total)||total<0||total>3)throw new Error('請輸入本回合依序完成的目標數：0–3');
  if(total>21-player.target)throw new Error('超過剩餘目標數');
  player.target+=total;player.score=player.target-1;
  g.history.push({player:g.current,submitted:total,score:total,bust:false,remaining:Math.min(player.target,21)});
  if(player.target===21)win(g);
  return rotate(g);
 }
 validateTotal(total);
 if(game.mode==='countup'){
  player.score+=total;
  g.history.push({player:g.current,submitted:total,score:total,bust:false,remaining:player.score});
  if(g.history.length===g.roundLimit*g.players.length){const best=Math.max(...g.players.map(p=>p.score));win(g,g.players.map((p,i)=>p.score===best?i:-1).filter(i=>i!==-1));}
  return rotate(g);
 }
 const remaining=player.remaining-total;
 if(g.doubleOut&&remaining===0&&finalDouble&&!doubleFinishes.has(total))throw new Error('這個總分無法以雙倍結鏢');
 const bust=remaining<0||(g.doubleOut&&(remaining===1||(remaining===0&&!finalDouble)));
 if(!bust)player.remaining=remaining;
 g.history.push({player:g.current,submitted:total,score:bust?0:total,bust,remaining:player.remaining});
 if(remaining===0&&!bust)win(g);
 return rotate(g);
}
export function turnStatistics(g,index){
 const turns=g.history.filter(t=>t.player===index),scored=turns.reduce((s,t)=>s+(g.mode==='cricket'?t.marks:t.score),0);
 return{rounds:turns.length,scored,average:turns.length?(scored/turns.length).toFixed(1):'0.0',best:Math.max(0,...turns.map(t=>g.mode==='cricket'?t.marks:t.score)),busts:turns.filter(t=>t.bust).length};
}
