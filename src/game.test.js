import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compile } from '@vue/compiler-dom';
import {createGame,recordTurn,turnStatistics} from './game.js';
test('total scores rotate players and leave snapshots intact',()=>{
 const old=createGame(['A','B']);let g=recordTurn(old,100);
 assert.equal(g.players[0].remaining,401);assert.equal(g.current,1);assert.equal(old.players[0].remaining,501);
 g=recordTurn(g,180);assert.equal(g.current,0);assert.equal(g.players[1].remaining,321);
 assert.deepEqual(turnStatistics(g,0),{rounds:1,scored:100,average:'100.0',best:100,busts:0});
});
test('bust preserves score and includes zero in the round average',()=>{
 let g=createGame(['A'],100);g=recordTurn(g,60);g=recordTurn(g,50);
 assert.equal(g.players[0].remaining,40);assert.equal(g.history[1].submitted,50);assert.equal(g.history[1].score,0);
 assert.equal(turnStatistics(g,0).average,'30.0');assert.equal(turnStatistics(g,0).busts,1);
});
test('double out busts on one remaining and unconfirmed checkout',()=>{
 let g=recordTurn(createGame(['A','B'],101,true),100);assert.equal(g.history[0].bust,true);assert.equal(g.current,1);
 g=recordTurn(createGame(['A'],40,true),40);assert.equal(g.winner,null);assert.equal(g.players[0].remaining,40);
});
test('double, bull, and straight checkouts',()=>{
 for(const [score,double] of [[40,true],[50,true],[170,true],[100,false]]){
  const g=recordTurn(createGame(['A','B'],score,double),score,double);assert.equal(g.winner,0);assert.equal(g.players[0].remaining,0);assert.throws(()=>recordTurn(g,0));
 }
});
test('impossible totals and impossible double checkout reject without changes',()=>{
 const g=createGame(['A']);for(const n of [-1,181,179,178,176,175,173,172,169,166,163,1.5,NaN])assert.throws(()=>recordTurn(g,n));
 assert.throws(()=>recordTurn(createGame(['A'],180,true),180,true));assert.equal(g.history.length,0);
});
test('zero scores and solo player maintain turns',()=>{
 const g=recordTurn(createGame(['A']),0);assert.equal(g.current,0);assert.equal(g.history.length,1);assert.equal(turnStatistics(g,0).average,'0.0');
});
test('whole-turn snapshot restores a winning game and statistics',()=>{
 const before=recordTurn(createGame(['A'],100),60);const after=recordTurn(before,40);assert.equal(after.winner,0);
 const restored=structuredClone(before);assert.equal(restored.winner,null);assert.equal(restored.players[0].remaining,40);assert.equal(turnStatistics(restored,0).rounds,1);
});
test('Vue interface template compiles',()=>{
 const source=readFileSync(new URL('./main.js',import.meta.url),'utf8');const template=source.split('template:`')[1].split('`\n}).mount')[0];const result=compile(template);assert.ok(result.code.includes('turn-score'));
});

test('Count Up gives all players equal turns and selects the highest score',()=>{
 let g=createGame(['A','B'],501,false,'countup',2);
 g=recordTurn(g,100);g=recordTurn(g,50);g=recordTurn(g,20);
 assert.equal(g.winner,null);assert.equal(g.current,1);
 g=recordTurn(g,100);assert.equal(g.winner,1);assert.deepEqual(g.winners,[1]);assert.equal(g.players[1].score,150);assert.equal(turnStatistics(g,1).average,'75.0');
});
test('Count Up supports ties and single-player sessions',()=>{
 let g=createGame(['A','B'],501,false,'countup',1);g=recordTurn(g,60);g=recordTurn(g,60);assert.deepEqual(g.winners,[0,1]);
 g=recordTurn(createGame(['A'],501,false,'countup',1),0);assert.equal(g.winner,0);assert.throws(()=>recordTurn(g,0));
});
test('Cricket closes a number before extra marks score against open opponents',()=>{
 const old=createGame(['A','B'],501,false,'cricket');let g=recordTurn(old,'T20 T20 T20');
 assert.equal(g.players[0].marks[20],3);assert.equal(g.players[0].score,120);assert.equal(g.history[0].marks,9);assert.equal(old.players[0].score,0);
 g=recordTurn(g,'T20 T20 T20');assert.equal(g.players[1].score,0);assert.equal(g.history[1].marks,3);
 g=recordTurn(g,'T20 T20 T20');assert.equal(g.history[2].marks,0);assert.equal(g.players[0].score,120);
});
test('Cricket bull is one or two marks, worth 25 per surplus mark',()=>{
 const g=recordTurn(createGame(['A','B'],501,false,'cricket'),'DB DB B');
 assert.equal(g.players[0].marks[25],3);assert.equal(g.players[0].score,50);assert.equal(g.history[0].marks,5);
});
test('Cricket ignores non-targets and supports all-miss shortcut',()=>{
 let g=recordTurn(createGame(['A','B'],501,false,'cricket'),'T14 D1 0');assert.equal(g.history[0].marks,0);
 g=recordTurn(g,'0');assert.equal(g.history[1].submitted,'0 0 0');assert.equal(g.current,0);
});
test('Cricket only ends when closed and not behind; early checkout stops unused darts',()=>{
 let g=createGame(['A','B'],501,false,'cricket');
 for(const n of [20,19,18,17,16,15])g.players[0].marks[n]=3;
 g.players[0].marks[25]=2;g.players[1].score=25;
 g=recordTurn(g,'B 0 0');assert.equal(g.winner,null);
 g=recordTurn(g,'0');g=recordTurn(g,'B');assert.equal(g.winner,0);assert.equal(g.players[0].score,25);
 let solo=createGame(['A'],501,false,'cricket');
 for(const n of [20,19,18,17,16,15])solo.players[0].marks[n]=3;
 solo.players[0].marks[25]=2;solo=recordTurn(solo,'B T20 T20');assert.equal(solo.history[0].submitted,'B');assert.equal(solo.winner,0);
});
test('invalid or incomplete Cricket input does not mutate game',()=>{
 const g=createGame(['A','B'],501,false,'cricket');
 for(const input of ['T25 0 0','D21 0 0','T20','20 20','20 20 20 20','',100])assert.throws(()=>recordTurn(g,input));
 assert.equal(g.players[0].marks[20],0);assert.equal(g.history.length,0);
});
test('Around the Clock advances in order and wins at 20',()=>{
 let g=createGame(['A'],501,false,'clock');for(let i=0;i<6;i++)g=recordTurn(g,3);
 assert.equal(g.players[0].target,19);assert.equal(g.winner,null);assert.throws(()=>recordTurn(g,3));
 g=recordTurn(g,2);assert.equal(g.players[0].target,21);assert.equal(g.winner,0);assert.equal(g.players[0].score,20);
});
test('Around the Clock rejects invalid target counts and preserves misses',()=>{
 const g=createGame(['A','B'],501,false,'clock');for(const n of [-1,4,1.5,NaN])assert.throws(()=>recordTurn(g,n));
 const missed=recordTurn(g,0);assert.equal(missed.current,1);assert.equal(missed.players[0].target,1);
});
test('snapshots restore mode-specific progress and tied winners',()=>{
 for(const [mode,input] of [['cricket','T20 T20 0'],['clock',3],['countup',180]]){
  const before=createGame(['A'],501,false,mode,1),saved=structuredClone(before);recordTurn(before,input);
  assert.deepEqual(before,saved);assert.deepEqual(before.winners,[]);
 }
});
