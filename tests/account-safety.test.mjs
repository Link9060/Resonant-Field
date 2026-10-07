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

test('new manual nodes have independent RAVIN permission keys',async()=>{
  const inserts=[];const preferences=[];
  const button={disabled:false};
  const fields={'#nodeTitle':{value:'Node'},'#nodeType':{value:'project'},'#nodeCluster':{value:''},'#nodeSummary':{value:'summary'},'#nodeUrl':{value:''},'#nodeRavin':{checked:false}};
  const context={liveMode:true,currentUser:{id:'owner'},accountEpoch:0,creatingNode:false,crypto:{randomUUID:()=> 'unique-id'},document:{querySelector:key=>fields[key]},Field:{nodeForm:{querySelector:()=>button},closeNodeDialog(){}},syncFieldNow:async()=>{},alert:message=>assert.fail(message),console,supabase:{from:table=>{const chain={insert:row=>{inserts.push([table,row]);return chain;},select:()=>chain,single:async()=>({data:{id:'node'},error:null}),upsert:async row=>{preferences.push(row);return {error:null};},then:resolve=>Promise.resolve({error:null}).then(resolve)};return chain;}}};
  const create=loadFunction('createLiveNode',"Field.nodeForm.addEventListener('submit'",context);
  await create({preventDefault(){},stopImmediatePropagation(){}});
  assert.equal(inserts[0][1].source_type,'manual:private');
  assert.equal(preferences[0].source_type,'manual:private');assert.equal(preferences[0].ravin_read,false);assert.equal(button.disabled,false);
});

test('Atlas paging does not duplicate or skip nodes that share timestamps',async()=>{
  const rows=['a','b','c','d'].map(id=>({id,updated_at:1}));let call=0;
  const context={PAGE_SIZE:2,supabase:{from:()=>{const orders=[];let range;
    const chain={select:()=>chain,range:(start,end)=>{range=[start,end];return chain;},order:key=>{orders.push(key);return chain;},then:resolve=>{call++;const sorted=orders.includes('id')?[...rows]:[...rows.slice(call%4),...rows.slice(0,call%4)];return Promise.resolve({data:sorted.slice(range[0],range[1]+1),error:null}).then(resolve);}};return chain;}}};
  const fetch=loadFunction('fetchAll','async function optionalFetch(',context);
  const data=await fetch('field_nodes','id,updated_at','updated_at');assert.deepEqual(Array.from(data,row=>row.id),['a','b','c','d']);
});
test('Atlas does not publish false AI access status when permission loading fails',async()=>{
  const context={fetchAll:async table=>{if(table==='field_source_preferences')throw new Error('permissions offline');return [];},optionalFetch:async()=>[]};
  const load=loadFunction('loadRawFieldData','async function loadLiveAccount(',context);
  await assert.rejects(load(),/permissions offline/);
});
