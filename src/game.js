export function createGame(names, initial = 501, doubleOut = false) {
  return { initial, doubleOut, players: names.map(name => ({ name, remaining: initial })), current: 0, turn: [], history: [], winner: null, turnStart: initial };
}
export function throwDart(game, base, multiplier) {
  if (game.winner !== null || game.turn.length >= 3) throw new Error('此回合已結束');
  if (![0,25,...Array.from({length:20},(_,i)=>i+1)].includes(base) || ![1,2,3].includes(multiplier) || (base===25 && multiplier===3) || (base===0 && multiplier!==1)) throw new Error('無效的鏢分');
  const g = structuredClone(game), player = g.players[g.current];
  const score = base * multiplier, remaining = player.remaining - score;
  const bust = remaining < 0 || (g.doubleOut && (remaining === 1 || (remaining === 0 && multiplier !== 2)));
  g.turn.push({ base, multiplier, score, label: base===0?'MISS':base===25?(multiplier===2?'BULL':'25'):['','S','D','T'][multiplier]+base });
  player.remaining = bust ? g.turnStart : remaining;
  if (remaining===0 && !bust) g.winner = g.current;
  if (g.turn.length === 3 || bust || g.winner !== null) {
    g.history.push({ player: g.current, darts: g.turn, score: bust ? 0 : g.turn.reduce((sum,d)=>sum+d.score,0), bust, remaining: player.remaining });
    g.turn=[];
    if(g.winner===null) g.current=(g.current+1)%g.players.length;
    g.turnStart=g.players[g.current].remaining;
  }
  return g;
}
export function statistics(g, index) {
  const turns=g.history.filter(t=>t.player===index), pending=g.current===index?g.turn:[];
  const darts=[...turns.flatMap(t=>t.darts),...pending], scored=g.initial-g.players[index].remaining;
  return { darts: darts.length, average: darts.length?(scored/darts.length*3).toFixed(1):'0.0', best: Math.max(0,...turns.map(t=>t.score)), hit: darts.length?Math.round(darts.filter(d=>d.score>0).length/darts.length*100):0, doubles: darts.filter(d=>d.multiplier===2).length, triples: darts.filter(d=>d.multiplier===3).length, busts: turns.filter(t=>t.bust).length };
}
