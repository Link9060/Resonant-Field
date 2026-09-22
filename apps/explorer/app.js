const canvas = document.querySelector('#graph');
const ctx = canvas.getContext('2d');

const palette = {
  project: '#f2f2f4',
  note: '#9f8cff',
  file: '#70b7ff',
  todo: '#ffb86b',
  calendar_event: '#70e1b5',
  ravin_conversation: '#d08cff',
  memory: '#f28fb5',
  chat: '#8f98a8'
};

const labels = {
  project: 'Projects',
  note: 'Notes',
  file: 'Files',
  todo: 'Todos',
  calendar_event: 'Calendar',
  ravin_conversation: 'RAVIN',
  memory: 'Memory',
  chat: 'Chats'
};

const seedNodes = [
  { id:'p-nova', type:'project', title:'Nova Enduro', summary:'Resonant Bikes enduro frame and suspension project.', cluster:'Nova', source:'Relay', ai:true, recent:9, x:-280,y:-70 },
  { id:'n-linkage', type:'note', title:'Linkage Geometry', summary:'Progression, axle path, pivot layout, and packaging notes.', cluster:'Nova', source:'Relay Notes', ai:true, recent:8, x:-410,y:-185 },
  { id:'f-leverage', type:'file', title:'Leverage Analysis.pdf', summary:'Suspension leverage analysis and design snapshots.', cluster:'Nova', source:'Link Storage', ai:true, recent:7, x:-435,y:45 },
  { id:'t-prototype', type:'todo', title:'Prototype linkage', summary:'Prepare first physical linkage prototype.', cluster:'Nova', source:'Relay Planner', ai:true, recent:5, x:-245,y:125 },
  { id:'r-nova', type:'ravin_conversation', title:'Nova suspension discussion', summary:'RAVIN conversation about leverage ratio and jackshaft packaging.', cluster:'Nova', source:'RAVIN', ai:true, recent:10, x:-150,y:-180 },
  { id:'m-nova', type:'memory', title:'Nova design direction', summary:'Persistent project memory: progressive linkage and modular platform.', cluster:'Nova', source:'RAVIN Memory', ai:true, recent:9, x:-110,y:-25 },

  { id:'p-relay', type:'project', title:'Relay', summary:'Communication and productivity platform for students.', cluster:'Relay', source:'Link', ai:true, recent:10, x:250,y:-80 },
  { id:'n-launch', type:'note', title:'Launch checklist', summary:'Final cleanup and release checklist for Relay.', cluster:'Relay', source:'Relay Notes', ai:true, recent:10, x:390,y:-190 },
  { id:'t-release', type:'todo', title:'Public release cleanup', summary:'Finish remaining launch polish and regression checks.', cluster:'Relay', source:'Relay Planner', ai:true, recent:9, x:430,y:-15 },
  { id:'f-security', type:'file', title:'Security audit.md', summary:'Security review notes and vulnerability remediation log.', cluster:'Relay', source:'Link Storage', ai:true, recent:8, x:310,y:105 },
  { id:'r-field', type:'ravin_conversation', title:'Field + RAVIN integration', summary:'Design discussion for shared context retrieval.', cluster:'Relay', source:'RAVIN', ai:true, recent:10, x:120,y:55 },
  { id:'n-ui', type:'note', title:'Relay UI system', summary:'Glass mode, particles, dashboard widgets, and motion rules.', cluster:'Relay', source:'Relay Notes', ai:true, recent:7, x:135,y:-180 },

  { id:'p-school', type:'project', title:'School', summary:'Classes, homework, studying, and school planning.', cluster:'School', source:'Link', ai:true, recent:8, x:-30,y:300 },
  { id:'n-calc', type:'note', title:'Calculus review', summary:'Limits, continuity, conjugates, and special trig limits.', cluster:'School', source:'Relay Notes', ai:true, recent:7, x:-180,y:395 },
  { id:'f-psych', type:'file', title:'AP Psych study.pdf', summary:'Psychology reading and study material.', cluster:'School', source:'Link Storage', ai:true, recent:6, x:90,y:410 },
  { id:'t-homework', type:'todo', title:'Finish calculus assignment', summary:'Complete remaining calculus problems.', cluster:'School', source:'Relay Planner', ai:true, recent:9, x:-165,y:245 },
  { id:'e-game', type:'calendar_event', title:'Football game', summary:'Game-day event from Relay calendar.', cluster:'School', source:'Relay Calendar', ai:true, recent:4, x:150,y:260 },

  { id:'p-field', type:'project', title:'Resonant Field', summary:'Shared knowledge engine connecting Resonant Assist products.', cluster:'Field', source:'Field', ai:true, recent:10, x:0,y:-10 },
  { id:'n-arch', type:'note', title:'Field architecture', summary:'Universal nodes, edges, adapters, permissions, and retrieval.', cluster:'Field', source:'Field Docs', ai:true, recent:10, x:-30,y:-155 },
  { id:'f-schema', type:'file', title:'Knowledge schemas', summary:'Portable node and edge JSON schemas.', cluster:'Field', source:'Field Core', ai:true, recent:10, x:35,y:135 }
];

const CUSTOM_NODE_KEY = 'resonant-field-explorer-custom-nodes-v1';

function loadCustomNodes() {
  try {
    const raw = localStorage.getItem(CUSTOM_NODE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(node => node && typeof node.id === 'string') : [];
  } catch {
    return [];
  }
}

function saveCustomNodes() {
  try {
    localStorage.setItem(CUSTOM_NODE_KEY, JSON.stringify(nodes.filter(node => node.custom)));
  } catch {
    // Local storage is a convenience for the prototype; Field still works without it.
  }
}

const nodes = [...seedNodes, ...loadCustomNodes()];

const edges = [
  ['p-nova','n-linkage',.95,'contains'], ['p-nova','f-leverage',.88,'contains'], ['p-nova','t-prototype',.82,'contains'],
  ['p-nova','r-nova',.91,'context'], ['p-nova','m-nova',.94,'memory'], ['r-nova','n-linkage',.89,'references'],
  ['f-leverage','n-linkage',.86,'supports'], ['m-nova','r-nova',.8,'derived from'],
  ['p-relay','n-launch',.93,'contains'], ['p-relay','t-release',.9,'contains'], ['p-relay','f-security',.82,'contains'],
  ['p-relay','r-field',.8,'context'], ['p-relay','n-ui',.78,'contains'], ['r-field','p-field',.95,'references'],
  ['p-school','n-calc',.86,'contains'], ['p-school','f-psych',.8,'contains'], ['p-school','t-homework',.87,'contains'],
  ['p-school','e-game',.7,'contains'], ['n-calc','t-homework',.9,'related'],
  ['p-field','n-arch',.96,'contains'], ['p-field','f-schema',.92,'contains'], ['p-field','r-field',.94,'context'],
  ['p-field','p-relay',.72,'powers'], ['p-field','p-nova',.42,'cross-project'], ['p-field','p-school',.36,'cross-project']
].map(([a,b,strength,type], i) => ({ id:'e'+i, a,b,strength,type }));

const state = {
  filters: new Set(Object.keys(labels)),
  selected: null,
  hovered: null,
  query: '',
  view: 'all',
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  dragging: false,
  dragStart: null
};

let width = 0;
let height = 0;
let dpr = 1;

function setupFilters() {
  const holder = document.querySelector('#filters');
  for (const type of Object.keys(labels)) {
    const count = nodes.filter(n => n.type === type).length;
    const button = document.createElement('button');
    button.className = 'filter active';
    button.dataset.type = type;
    button.innerHTML = `<span class="filter-left"><i class="dot" style="color:${palette[type]};background:${palette[type]}"></i>${labels[type]}</span><span class="filter-count">${count}</span>`;
    button.addEventListener('click', () => {
      if (state.filters.has(type)) state.filters.delete(type); else state.filters.add(type);
      button.classList.toggle('active', state.filters.has(type));
      if (state.selected && !isVisible(getNode(state.selected))) selectNode(null);
      updateStats();
      render();
    });
    holder.appendChild(button);
  }
}

function getNode(id) { return nodes.find(n => n.id === id); }

function clusterAnchor(cluster) {
  if (!cluster) return null;
  return nodes.find(node => node.type === 'project' && node.cluster.toLowerCase() === cluster.toLowerCase()) || null;
}

function customNodePosition(cluster) {
  const anchor = clusterAnchor(cluster);
  if (anchor) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 95 + Math.random() * 75;
    return {
      x: anchor.x + Math.cos(angle) * radius,
      y: anchor.y + Math.sin(angle) * radius
    };
  }

  return {
    x: (Math.random() - .5) * 480,
    y: (Math.random() - .5) * 360
  };
}

function attachCustomNode(node) {
  const anchor = clusterAnchor(node.cluster);
  if (!anchor || anchor.id === node.id) return;
  const edgeId = `custom-${anchor.id}-${node.id}`;
  if (edges.some(edge => edge.id === edgeId)) return;
  edges.push({
    id: edgeId,
    a: anchor.id,
    b: node.id,
    strength: .78,
    type: 'contains'
  });
}

for (const node of nodes.filter(node => node.custom)) attachCustomNode(node);

function isVisible(node) {
  if (!node || !state.filters.has(node.type)) return false;
  if (state.view === 'projects' && node.type !== 'project') return false;
  if (state.view === 'recent' && node.recent < 8) return false;
  if (state.query) {
    const q = state.query.toLowerCase();
    const hay = `${node.title} ${node.summary} ${node.cluster} ${node.type}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function visibleNodes() { return nodes.filter(isVisible); }

function resize() {
  const rect = canvas.getBoundingClientRect();
  dpr = Math.min(devicePixelRatio || 1, 2);
  width = rect.width;
  height = rect.height;
  canvas.width = Math.max(1, Math.floor(width * dpr));
  canvas.height = Math.max(1, Math.floor(height * dpr));
  ctx.setTransform(dpr,0,0,dpr,0,0);
  render();
}

function worldToScreen(n) {
  return {
    x: width / 2 + state.offsetX + n.x * state.scale,
    y: height / 2 + state.offsetY + n.y * state.scale
  };
}

function screenToWorld(x,y) {
  return {
    x: (x - width / 2 - state.offsetX) / state.scale,
    y: (y - height / 2 - state.offsetY) / state.scale
  };
}

function nodeRadius(node) {
  if (node.type === 'project') return 11;
  if (node.type === 'ravin_conversation') return 8;
  return 6.5;
}

function render() {
  ctx.clearRect(0,0,width,height);
  drawBackdrop();
  const visible = new Set(visibleNodes().map(n => n.id));

  for (const edge of edges) {
    if (!visible.has(edge.a) || !visible.has(edge.b)) continue;
    const a = worldToScreen(getNode(edge.a));
    const b = worldToScreen(getNode(edge.b));
    const selectedEdge = state.selected && (edge.a === state.selected || edge.b === state.selected);
    ctx.beginPath();
    ctx.moveTo(a.x,a.y);
    ctx.lineTo(b.x,b.y);
    ctx.lineWidth = selectedEdge ? 1.35 : .65;
    ctx.strokeStyle = selectedEdge ? 'rgba(220,220,235,.42)' : `rgba(154,154,180,${.08 + edge.strength*.1})`;
    ctx.stroke();
  }

  for (const node of visibleNodes()) drawNode(node);
}

function drawBackdrop() {
  const step = 42 * Math.max(.65, state.scale);
  const ox = ((width/2 + state.offsetX) % step + step) % step;
  const oy = ((height/2 + state.offsetY) % step + step) % step;
  ctx.fillStyle = 'rgba(255,255,255,.026)';
  for (let x=ox; x<width; x+=step) for (let y=oy; y<height; y+=step) {
    ctx.beginPath(); ctx.arc(x,y,.65,0,Math.PI*2); ctx.fill();
  }
}

function drawNode(node) {
  const p = worldToScreen(node);
  const r = nodeRadius(node) * Math.max(.8, Math.min(1.25,state.scale));
  const selected = state.selected === node.id;
  const hovered = state.hovered === node.id;
  const color = palette[node.type] || '#ddd';

  if (selected || hovered || node.type === 'project') {
    const glow = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r*4.5);
    glow.addColorStop(0, hexToRgba(color, selected ? .24 : .14));
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(p.x,p.y,r*4.5,0,Math.PI*2); ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(p.x,p.y,r,0,Math.PI*2);
  ctx.fillStyle = selected ? '#ffffff' : color;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(p.x,p.y,r+3,0,Math.PI*2);
  ctx.strokeStyle = selected ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.08)';
  ctx.lineWidth = 1;
  ctx.stroke();

  if (state.scale > .62 || node.type === 'project' || selected || hovered) {
    ctx.font = node.type === 'project' ? '600 11px Inter, system-ui' : '500 9px Inter, system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = selected || hovered ? '#f3f3f6' : node.type === 'project' ? '#c8c8d0' : '#777783';
    ctx.fillText(node.title, p.x, p.y + r + 7);
  }
}

function hexToRgba(hex, alpha) {
  const value = hex.replace('#','');
  const bigint = parseInt(value,16);
  const r=(bigint>>16)&255, g=(bigint>>8)&255, b=bigint&255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function hitTest(x,y) {
  const visible = visibleNodes().slice().reverse();
  for (const node of visible) {
    const p = worldToScreen(node);
    const r = nodeRadius(node) + 8;
    if ((x-p.x)**2 + (y-p.y)**2 <= r**2) return node;
  }
  return null;
}

function selectNode(id) {
  state.selected = id;
  const inspector = document.querySelector('#inspector');
  if (!id) {
    inspector.classList.remove('open');
    inspector.innerHTML = `<div class="empty-state"><div class="empty-icon">✦</div><h2>Select a node</h2><p>Click anything in the Field to inspect its source, relationships, and AI-access status.</p></div>`;
    render();
    return;
  }

  const node = getNode(id);
  const relatedEdges = edges.filter(e => e.a === id || e.b === id).sort((a,b)=>b.strength-a.strength);
  const related = relatedEdges.map(e => ({ edge:e, node:getNode(e.a === id ? e.b : e.a) })).filter(x => x.node);
  inspector.classList.add('open');
  inspector.innerHTML = `
    <div class="node-type"><i class="dot" style="color:${palette[node.type]};background:${palette[node.type]}"></i>${labels[node.type]}</div>
    <h2 class="node-title">${escapeHtml(node.title)}</h2>
    <p class="node-summary">${escapeHtml(node.summary)}</p>

    <div class="inspector-section">
      <p class="section-label">METADATA</p>
      <div class="meta-grid">
        <div class="meta-card"><span>Source</span><strong>${escapeHtml(node.source)}</strong></div>
        <div class="meta-card"><span>Cluster</span><strong>${escapeHtml(node.cluster)}</strong></div>
        <div class="meta-card"><span>Freshness</span><strong>${node.recent >= 9 ? 'Very recent' : node.recent >= 7 ? 'Recent' : 'Older'}</strong></div>
        <div class="meta-card"><span>Node ID</span><strong>${escapeHtml(node.id)}</strong></div>
      </div>
    </div>

    <div class="inspector-section">
      <p class="section-label">AI ACCESS</p>
      <div class="permission-row"><span>RAVIN</span><span class="permission-pill">${node.ai ? 'Allowed' : 'Blocked'}</span></div>
      <div class="permission-row"><span>External AI</span><span class="permission-pill">User controlled</span></div>
    </div>

    ${node.custom ? `<div class="inspector-section"><p class="section-label">PROTOTYPE DATA</p><button class="delete-node" data-delete-node="${node.id}">Remove this local node</button></div>` : ''}

    <div class="inspector-section">
      <p class="section-label">RELATIONSHIPS · ${related.length}</p>
      <div class="related-list">
        ${related.map(({edge,node:r}) => `<button class="related-item" data-node="${r.id}"><strong>${escapeHtml(r.title)}</strong><span>${escapeHtml(edge.type)} · ${Math.round(edge.strength*100)}%</span></button>`).join('')}
      </div>
    </div>
  `;

  inspector.querySelectorAll('[data-node]').forEach(btn => btn.addEventListener('click', () => selectNode(btn.dataset.node)));
  inspector.querySelectorAll('[data-delete-node]').forEach(btn => btn.addEventListener('click', () => {
    const idToDelete = btn.dataset.deleteNode;
    const index = nodes.findIndex(item => item.id === idToDelete && item.custom);
    if (index === -1) return;
    nodes.splice(index, 1);
    for (let i = edges.length - 1; i >= 0; i--) {
      if (edges[i].a === idToDelete || edges[i].b === idToDelete) edges.splice(i, 1);
    }
    saveCustomNodes();
    selectNode(null);
    setupFilterCounts();
    updateStats();
    render();
  }));
  render();
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function setupFilterCounts() {
  document.querySelectorAll('.filter').forEach(button => {
    const type = button.dataset.type;
    const count = nodes.filter(node => node.type === type).length;
    const target = button.querySelector('.filter-count');
    if (target) target.textContent = String(count);
  });
}

function updateStats() {
  const visible = new Set(visibleNodes().map(n=>n.id));
  const countEdges = edges.filter(e=>visible.has(e.a)&&visible.has(e.b)).length;
  const clusters = new Set(visibleNodes().map(n=>n.cluster));
  document.querySelector('#nodeCount').textContent = visible.size;
  document.querySelector('#edgeCount').textContent = countEdges;
  document.querySelector('#clusterCount').textContent = clusters.size;
  document.querySelector('#viewTitle').textContent =
    state.query ? `Results for “${state.query}”` :
    state.view === 'projects' ? 'Project anchors' :
    state.view === 'recent' ? 'Recently active knowledge' : 'Everything connected';
}

function centerGraph() {
  state.scale = 1;
  state.offsetX = 0;
  state.offsetY = 0;
  updateZoom();
  render();
}

function updateZoom() {
  document.querySelector('#zoomLabel').textContent = `${Math.round(state.scale*100)}%`;
}

function runRavin(prompt) {
  const result = document.querySelector('#ravinResult');
  const tokens = prompt.toLowerCase().split(/\W+/).filter(w=>w.length>3);
  const ranked = nodes.map(node => {
    const text = `${node.title} ${node.summary} ${node.cluster}`.toLowerCase();
    let score = tokens.reduce((sum,t)=>sum+(text.includes(t)?2:0),0);
    if (/nova/.test(prompt.toLowerCase()) && node.cluster==='Nova') score += 3;
    if (/relay/.test(prompt.toLowerCase()) && node.cluster==='Relay') score += 3;
    if (/school|homework|coming/.test(prompt.toLowerCase()) && node.cluster==='School') score += 3;
    score += node.recent * .05;
    return {node,score};
  }).filter(x=>x.score>1).sort((a,b)=>b.score-a.score).slice(0,5);

  const seedIds = new Set(ranked.map(x=>x.node.id));
  const contextEdges = edges.filter(e=>seedIds.has(e.a)||seedIds.has(e.b)).slice(0,6);

  result.hidden = false;
  result.innerHTML = `<strong>Retrieved ${ranked.length} nodes</strong><br>${ranked.map(x=>escapeHtml(x.node.title)).join(' · ')}<br><br><span style="color:#666672">${contextEdges.length} related edges would also be passed to RAVIN.</span>`;

  state.query = '';
  document.querySelector('#searchInput').value = '';
  state.filters = new Set(Object.keys(labels));
  document.querySelectorAll('.filter').forEach(b=>b.classList.add('active'));
  state.view = 'all';
  document.querySelectorAll('.view-button').forEach(b=>b.classList.toggle('active',b.dataset.view==='all'));
  if (ranked[0]) selectNode(ranked[0].node.id);
  updateStats();
  render();
}

const nodeDialog = document.querySelector('#nodeDialog');
const nodeForm = document.querySelector('#nodeForm');

function openNodeDialog() {
  nodeForm.reset();
  document.querySelector('#nodeRavin').checked = true;
  nodeDialog.showModal();
  setTimeout(() => document.querySelector('#nodeTitle').focus(), 0);
}

function closeNodeDialog() {
  nodeDialog.close();
}

document.querySelector('#addNode').addEventListener('click', openNodeDialog);
document.querySelector('#closeDialog').addEventListener('click', closeNodeDialog);
document.querySelector('#cancelDialog').addEventListener('click', closeNodeDialog);

nodeForm.addEventListener('submit', event => {
  event.preventDefault();
  const title = document.querySelector('#nodeTitle').value.trim();
  if (!title) return;

  const type = document.querySelector('#nodeType').value;
  const clusterInput = document.querySelector('#nodeCluster').value.trim();
  const cluster = clusterInput || (type === 'project' ? title : 'Personal');
  const summary = document.querySelector('#nodeSummary').value.trim() || 'User-created Field node.';
  const position = customNodePosition(cluster);

  const node = {
    id: `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`,
    type,
    title,
    summary,
    cluster,
    source: 'Field Explorer',
    ai: document.querySelector('#nodeRavin').checked,
    recent: 10,
    x: position.x,
    y: position.y,
    custom: true
  };

  nodes.push(node);
  attachCustomNode(node);
  saveCustomNodes();
  setupFilterCounts();
  updateStats();
  closeNodeDialog();
  selectNode(node.id);
});

nodeDialog.addEventListener('click', event => {
  if (event.target === nodeDialog) closeNodeDialog();
});

document.querySelector('#searchInput').addEventListener('input', e => {
  state.query = e.target.value.trim();
  if (state.selected && !isVisible(getNode(state.selected))) selectNode(null);
  updateStats(); render();
});

document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase()==='k') {
    e.preventDefault();
    document.querySelector('#searchInput').focus();
  }
  if (e.key === 'Escape') selectNode(null);
});

document.querySelector('#resetFilters').addEventListener('click', () => {
  state.filters = new Set(Object.keys(labels));
  document.querySelectorAll('.filter').forEach(b=>b.classList.add('active'));
  updateStats(); render();
});

document.querySelectorAll('.view-button').forEach(button => {
  button.addEventListener('click', () => {
    state.view = button.dataset.view;
    document.querySelectorAll('.view-button').forEach(b=>b.classList.toggle('active',b===button));
    if (state.selected && !isVisible(getNode(state.selected))) selectNode(null);
    updateStats(); render();
  });
});

document.querySelectorAll('.prompt-chip').forEach(button => button.addEventListener('click', () => runRavin(button.dataset.prompt)));

document.querySelector('#centerGraph').addEventListener('click', centerGraph);
document.querySelector('#zoomIn').addEventListener('click', () => { state.scale=Math.min(2.2,state.scale*1.15); updateZoom(); render(); });
document.querySelector('#zoomOut').addEventListener('click', () => { state.scale=Math.max(.45,state.scale/1.15); updateZoom(); render(); });

canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  const x=e.clientX-rect.left, y=e.clientY-rect.top;
  if (state.dragging) {
    state.offsetX = state.dragStart.ox + (x-state.dragStart.x);
    state.offsetY = state.dragStart.oy + (y-state.dragStart.y);
    render();
    return;
  }
  const hit = hitTest(x,y);
  const id = hit?.id || null;
  if (id !== state.hovered) { state.hovered=id; render(); }
  canvas.style.cursor = hit ? 'pointer' : 'grab';
});

canvas.addEventListener('mousedown', e => {
  const rect=canvas.getBoundingClientRect();
  const x=e.clientX-rect.left, y=e.clientY-rect.top;
  const hit=hitTest(x,y);
  if (hit) { selectNode(hit.id); return; }
  state.dragging=true;
  state.dragStart={x,y,ox:state.offsetX,oy:state.offsetY};
  canvas.classList.add('dragging');
});

addEventListener('mouseup', () => { state.dragging=false; canvas.classList.remove('dragging'); });

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const rect=canvas.getBoundingClientRect();
  const mx=e.clientX-rect.left, my=e.clientY-rect.top;
  const before=screenToWorld(mx,my);
  const factor=e.deltaY<0?1.09:.92;
  state.scale=Math.max(.45,Math.min(2.2,state.scale*factor));
  state.offsetX = mx-width/2-before.x*state.scale;
  state.offsetY = my-height/2-before.y*state.scale;
  updateZoom(); render();
},{passive:false});

canvas.addEventListener('mouseleave', () => { if (!state.dragging) { state.hovered=null; render(); } });

setupFilters();
setupFilterCounts();
updateStats();
updateZoom();
new ResizeObserver(resize).observe(canvas);
resize();
