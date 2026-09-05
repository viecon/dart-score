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
