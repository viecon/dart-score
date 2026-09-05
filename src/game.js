export function createGame(names, initial = 501, doubleOut = false) {
  return {initial,doubleOut,players:names.map(name=>({name,remaining:initial})),current:0,history:[],winner:null};
}
const dartScores=[...new Set([0,25,50,...Array.from({length:20},(_,i)=>[i+1,(i+1)*2,(i+1)*3]).flat()])];
const possibleTotals=new Set(dartScores.flatMap(a=>dartScores.flatMap(b=>dartScores.map(c=>a+b+c))));
const doubleFinishes=new Set(dartScores.flatMap(a=>dartScores.flatMap(b=>[50,...Array.from({length:20},(_,i)=>(i+1)*2)].map(c=>a+b+c))));
export function recordTurn(game,total,finalDouble=false){
 if(game.winner!==null)throw new Error('比賽已結束');
 if(!Number.isInteger(total)||total<0||total>180)throw new Error('請輸入 0–180 的整數');
 if(!possibleTotals.has(total))throw new Error(`${total} 不是三鏢可達成的分數`);
 const g=structuredClone(game),player=g.players[g.current],remaining=player.remaining-total;
 if(g.doubleOut&&remaining===0&&finalDouble&&!doubleFinishes.has(total))throw new Error('這個總分無法以雙倍結鏢');
 const bust=remaining<0||(g.doubleOut&&(remaining===1||(remaining===0&&!finalDouble)));
 if(!bust)player.remaining=remaining;
 g.history.push({player:g.current,submitted:total,score:bust?0:total,bust,remaining:player.remaining});
 if(remaining===0&&!bust)g.winner=g.current;
 else g.current=(g.current+1)%g.players.length;
 return g;
}
export function turnStatistics(g,index){
 const turns=g.history.filter(t=>t.player===index),scored=turns.reduce((s,t)=>s+t.score,0);
 return{rounds:turns.length,scored,average:turns.length?(scored/turns.length).toFixed(1):'0.0',best:Math.max(0,...turns.map(t=>t.score)),busts:turns.filter(t=>t.bust).length};
}
