import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync('apps/explorer/account.mjs','utf8');
function loadFunction(name,next,context) {
  vm.createContext(context);vm.runInContext(source.slice(source.indexOf(`async function ${name}(`),source.indexOf(next,source.indexOf(`async function ${name}(`))),context);return context[name];
}
test('a signed-out Atlas account cannot be republished by a late graph load',async()=>{
  let release;const pending=new Promise(resolve=>{release=resolve;});
  const context={accountEpoch:0,loadingAccount:false,accountIdentity:null,console,setConnectionState(){},loadRawFieldData:()=>pending,fetchUserState:async()=>({built_at:'built'}),prepareDataset:async()=>({nodes:[{id:'private'}],edges:[]}),Field:{nodes:[{id:'demo'}],edges:[],reindex:()=>assert.fail('private graph reindexed')},resetExplorerForDataset:()=>assert.fail('private graph displayed')};
  const load=loadFunction('loadLiveAccount','async function prepareDataset(',context);
  const request=load({id:'owner'});context.accountEpoch++;context.loadingAccount=false;release({});
  assert.equal(await request,null);assert.deepEqual(context.Field.nodes,[{id:'demo'}]);
});
test('signing out during the Atlas build delay does not write or crash on a null user',async()=>{
  let release;const pending=new Promise(resolve=>{release=resolve;});
  const classes={add(){},remove(){}};
  const context={accountEpoch:0,liveMode:true,currentUser:{id:'owner'},buildButton:{disabled:false},buildOverlay:{classList:classes},fieldStatus:{},sleep:()=>pending,supabase:{from:()=>assert.fail('signed-out build wrote data')}};
  const build=loadFunction('buildMyField','function createBuildPlan(',context);
  const request=build();context.accountEpoch++;context.currentUser=null;release();await request;
});
