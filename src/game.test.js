import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame, throwDart, statistics} from './game.js';
test('three darts score and rotate without mutating previous state',()=>{
 const original=createGame(['A','B']); let g=original;
 for(let i=0;i<3;i++)g=throwDart(g,20,3);
 assert.equal(g.players[0].remaining,321); assert.equal(g.current,1); assert.equal(g.history[0].score,180); assert.equal(statistics(g,0).average,'180.0'); assert.equal(original.players[0].remaining,501);
});
test('bust restores the entire turn and records darts',()=>{
 let g=createGame(['A','B'],100);g=throwDart(g,20,3);g=throwDart(g,20,3);
 assert.equal(g.players[0].remaining,100);assert.equal(g.current,1);assert.equal(g.history[0].bust,true);assert.equal(statistics(g,0).average,'0.0');assert.equal(statistics(g,0).darts,2);
});
test('double out rejects one remaining and a single checkout',()=>{
 let g=createGame(['A'],41,true);g=throwDart(g,20,2);assert.equal(g.players[0].remaining,41);assert.equal(g.history[0].bust,true);
 g=throwDart(createGame(['A'],20,true),20,1);assert.equal(g.winner,null);assert.equal(g.players[0].remaining,20);
});
test('double and bull checkouts end immediately',()=>{
 for(const [remaining,base] of [[40,20],[50,25]]){const g=throwDart(createGame(['A','B'],remaining,true),base,2);assert.equal(g.winner,0);assert.equal(g.players[0].remaining,0);assert.equal(g.history[0].darts.length,1);assert.throws(()=>throwDart(g,20,1));}
});
test('straight checkout, misses, and pending statistics',()=>{
 let g=createGame(['A','B'],20);g=throwDart(g,0,1);g=throwDart(g,10,1);assert.equal(statistics(g,0).hit,50);assert.equal(statistics(g,0).average,'15.0');g=throwDart(g,10,1);assert.equal(g.winner,0);
});
test('invalid dart cannot alter state',()=>{
 const g=createGame(['A']); for(const [b,m] of [[25,3],[21,1],[0,2],[-1,1],[20,4]]) assert.throws(()=>throwDart(g,b,m)); assert.equal(g.players[0].remaining,501);
});
