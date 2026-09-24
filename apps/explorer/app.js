const canvas = document.querySelector('#graph');
const ctx = canvas.getContext('2d');

const paletteDark = {
  collection: '#f1f1f3',
  project: '#f1f1f3',
  note: '#aaa7b4',
  file: '#9ea8b0',
  todo: '#aaa394',
  calendar_event: '#98aaa4',
  ravin_conversation: '#b7a4bf',
  memory: '#aa9da4',
  chat: '#8f949c',
  link: '#9aa0a7',
  other: '#8f949c'
};

const paletteLight = {
  collection: '#171719',
  project: '#171719',
  note: '#65636d',
  file: '#59636b',
  todo: '#686258',
  calendar_event: '#536a62',
  ravin_conversation: '#725d7b',
  memory: '#6b5f65',
  chat: '#59616c',
  link: '#59616c',
  other: '#67676d'
};

function isDarkTheme() {
  return document.documentElement.classList.contains('dark');
}

function palette() {
  return isDarkTheme() ? paletteDark : paletteLight;
}

function graphTheme() {
  return isDarkTheme()
    ? {
        edge: [166, 166, 174],
        edgeSelected: 'rgba(238,238,242,.42)',
        grid: 'rgba(255,255,255,.027)',
        label: '#77777f',
        hubLabel: '#c7c7cd',
        activeLabel: '#f5f5f6',
        ring: 'rgba(255,255,255,.10)',
        ringSelected: 'rgba(255,255,255,.52)',
        selectedNode: '#f5f5f6'
      }
    : {
        edge: [70, 70, 78],
        edgeSelected: 'rgba(25,25,28,.38)',
        grid: 'rgba(17,17,17,.045)',
        label: '#74747a',
        hubLabel: '#3d3d42',
        activeLabel: '#111113',
        ring: 'rgba(17,17,17,.11)',
        ringSelected: 'rgba(17,17,17,.44)',
        selectedNode: '#111113'
      };
}

const labels = {
  collection: 'Collections',
  project: 'Projects',
  note: 'Notes',
  file: 'Files',
  todo: 'Todos',
  calendar_event: 'Calendar',
  ravin_conversation: 'RAVIN',
  memory: 'Memory',
  chat: 'Chats',
  link: 'Links',
  other: 'Other'
};

const demoScreenshot = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="600" viewBox="0 0 960 600">
  <rect width="960" height="600" fill="#07070a"/>
  <rect x="24" y="24" width="912" height="552" rx="24" fill="#111118" stroke="#2a2a35"/>
  <rect x="48" y="50" width="190" height="500" rx="18" fill="#0b0b10" stroke="#24242d"/>
  <circle cx="77" cy="82" r="9" fill="#f3f3f5"/>
  <rect x="98" y="75" width="91" height="14" rx="7" fill="#d8d8de"/>
  <rect x="68" y="130" width="145" height="34" rx="10" fill="#1a1a22"/>
  <rect x="68" y="180" width="120" height="10" rx="5" fill="#565663"/>
  <rect x="68" y="208" width="132" height="10" rx="5" fill="#3e3e49"/>
  <rect x="68" y="236" width="104" height="10" rx="5" fill="#3e3e49"/>
  <rect x="270" y="54" width="628" height="74" rx="18" fill="#0d0d13" stroke="#24242d"/>
  <rect x="296" y="78" width="190" height="16" rx="8" fill="#e6e6ea"/>
  <rect x="296" y="103" width="290" height="8" rx="4" fill="#4b4b57"/>
  <rect x="270" y="150" width="300" height="180" rx="18" fill="#0d0d13" stroke="#24242d"/>
  <rect x="592" y="150" width="306" height="180" rx="18" fill="#0d0d13" stroke="#24242d"/>
  <rect x="270" y="352" width="628" height="198" rx="18" fill="#0d0d13" stroke="#24242d"/>
  <circle cx="335" cy="220" r="28" fill="#7767d8" opacity=".8"/>
  <circle cx="397" cy="238" r="13" fill="#73b7ff" opacity=".85"/>
  <circle cx="445" cy="202" r="9" fill="#f1b06d" opacity=".9"/>
  <line x1="335" y1="220" x2="397" y2="238" stroke="#7f7f91" opacity=".5"/>
  <line x1="397" y1="238" x2="445" y2="202" stroke="#7f7f91" opacity=".4"/>
  <rect x="620" y="182" width="200" height="13" rx="6.5" fill="#bdbdc6"/>
  <rect x="620" y="212" width="240" height="9" rx="4.5" fill="#4b4b57"/>
  <rect x="620" y="237" width="190" height="9" rx="4.5" fill="#3b3b45"/>
  <rect x="620" y="262" width="220" height="9" rx="4.5" fill="#3b3b45"/>
  <rect x="300" y="388" width="250" height="15" rx="7.5" fill="#cfcfd6"/>
  <rect x="300" y="420" width="510" height="9" rx="4.5" fill="#474752"/>
  <rect x="300" y="446" width="470" height="9" rx="4.5" fill="#3a3a45"/>
  <rect x="300" y="472" width="390" height="9" rx="4.5" fill="#3a3a45"/>
</svg>`);

const seedNodes = [
  { id:'p-nova', type:'project', title:'Nova Enduro', summary:'Resonant Bikes enduro frame and suspension project.', cluster:'Nova', source:'Relay', ai:true, recent:9, x:-280,y:-70 },
  { id:'n-linkage', type:'note', title:'Linkage Geometry', summary:'Progression, axle path, pivot layout, and packaging notes.', contentKind:'note_blocks', contentBlocks:[{type:'heading',text:'Nova linkage direction'},{type:'paragraph',text:'Target a progressive leverage curve while keeping the packaging compact around the jackshaft.'},{type:'bullet',text:'Keep the axle path meaningfully rearward early in travel.'},{type:'bullet',text:'Leave enough clearance around the shock and main pivot for service.'}], cluster:'Nova', source:'Relay Notes', ai:true, recent:8, x:-410,y:-185 },
  { id:'f-leverage', type:'file', title:'Leverage Analysis.pdf', summary:'Suspension leverage analysis and design snapshots.', contentKind:'file', fileName:'Leverage Analysis.pdf', mimeType:'application/pdf', fileSize:'2.4 MB', extractedPreview:'Leverage curve review: ratio starts high, trends downward through travel, and maintains useful progression near bottom-out.', cluster:'Nova', source:'Link Storage', ai:true, recent:7, x:-435,y:45 },
  { id:'t-prototype', type:'todo', title:'Prototype linkage', summary:'Prepare first physical linkage prototype.', contentKind:'todo', dueOn:'Sep 28', completed:false, cluster:'Nova', source:'Relay Planner', ai:true, recent:5, x:-245,y:125 },
  { id:'r-nova', type:'ravin_conversation', title:'Nova suspension discussion', summary:'RAVIN conversation about leverage ratio and jackshaft packaging.', cluster:'Nova', source:'RAVIN', ai:true, recent:10, x:-150,y:-180 },
  { id:'m-nova', type:'memory', title:'Nova design direction', summary:'Persistent project memory: progressive linkage and modular platform.', cluster:'Nova', source:'RAVIN Memory', ai:true, recent:9, x:-110,y:-25 },

  { id:'p-relay', type:'project', title:'Relay', summary:'Communication and productivity platform for students.', cluster:'Relay', source:'Link', ai:true, recent:10, x:250,y:-80 },
  { id:'n-launch', type:'note', title:'Launch checklist', summary:'Final cleanup and release checklist for Relay.', contentKind:'note_blocks', contentBlocks:[{type:'heading',text:'Before public release'},{type:'todo',text:'Verify sign-in and account linking',checked:true},{type:'todo',text:'Run chat send/receive regression checks',checked:true},{type:'todo',text:'Review remaining mobile layout issues',checked:false},{type:'todo',text:'Confirm public build has no owner-only UI',checked:false}], cluster:'Relay', source:'Relay Notes', ai:true, recent:10, x:390,y:-190 },
  { id:'t-release', type:'todo', title:'Public release cleanup', summary:'Finish remaining launch polish and regression checks.', cluster:'Relay', source:'Relay Planner', ai:true, recent:9, x:430,y:-15 },
  { id:'f-security', type:'file', title:'Security audit.md', summary:'Security review notes and vulnerability remediation log.', contentKind:'text', contentText:'Security pass\n\n• RLS enabled on private user data.\n• Server-only secrets remain out of browser bundles.\n• OAuth scopes reduced to the minimum needed.\n• Message and account actions are permission-checked.', fileName:'Security audit.md', mimeType:'text/markdown', fileSize:'18 KB', cluster:'Relay', source:'Link Storage', ai:true, recent:8, x:310,y:105 },
  { id:'r-field', type:'ravin_conversation', title:'Field + RAVIN integration', summary:'Design discussion for shared context retrieval.', cluster:'Relay', source:'RAVIN', ai:true, recent:10, x:120,y:55 },
  { id:'n-ui', type:'note', title:'Relay UI system', summary:'Glass mode, particles, dashboard widgets, and motion rules.', contentKind:'note_blocks', contentBlocks:[{type:'heading',text:'Motion rules'},{type:'paragraph',text:'Use particles for transitions that communicate hierarchy, not on every interaction.'},{type:'paragraph',text:'Glass panels should preserve legibility first; refraction and RGB edge effects are accents.'}], cluster:'Relay', source:'Relay Notes', ai:true, recent:7, x:135,y:-180 },

  { id:'p-school', type:'project', title:'School', summary:'Classes, homework, studying, and school planning.', cluster:'School', source:'Link', ai:true, recent:8, x:-30,y:300 },
  { id:'n-calc', type:'note', title:'Calculus review', summary:'Limits, continuity, conjugates, and special trig limits.', contentKind:'note_blocks', contentBlocks:[{type:'heading',text:'Limits review'},{type:'paragraph',text:'When direct substitution gives 0/0, factor or rationalize before taking the limit.'},{type:'bullet',text:'Conjugates are useful when square roots cause the indeterminate form.'},{type:'bullet',text:'Remember the special trig limit sin(x)/x → 1 as x → 0.'}], cluster:'School', source:'Relay Notes', ai:true, recent:7, x:-180,y:395 },
  { id:'f-psych', type:'file', title:'AP Psych study.pdf', summary:'Psychology reading and study material.', cluster:'School', source:'Link Storage', ai:true, recent:6, x:90,y:410 },
  { id:'t-homework', type:'todo', title:'Finish calculus assignment', summary:'Complete remaining calculus problems.', contentKind:'todo', dueOn:'Tomorrow', completed:false, cluster:'School', source:'Relay Planner', ai:true, recent:9, x:-165,y:245 },
  { id:'e-game', type:'calendar_event', title:'Football game', summary:'Game-day event from Relay calendar.', contentKind:'calendar_event', eventDate:'Friday', eventTime:'7:00 PM', eventDetails:'Team warmups and game-day block.', cluster:'School', source:'Relay Calendar', ai:true, recent:4, x:150,y:260 },

  { id:'img-relay', type:'file', title:'Relay dashboard screenshot.png', summary:'Captured UI reference from the Relay dashboard.', contentKind:'image', previewUrl:demoScreenshot, previewAlt:'Mock Relay dashboard screenshot preview', fileName:'Relay dashboard screenshot.png', mimeType:'image/png', fileSize:'412 KB', cluster:'Relay', source:'Link Storage', ai:true, recent:10, x:505,y:105 },

  { id:'p-field', type:'project', title:'Resonant Field', summary:'Shared knowledge engine connecting Resonant Assist products.', cluster:'Field', source:'Field', ai:true, recent:10, x:0,y:-10 },
  { id:'n-arch', type:'note', title:'Field architecture', summary:'Universal nodes, edges, adapters, permissions, and retrieval.', cluster:'Field', source:'Field Docs', ai:true, recent:10, x:-30,y:-155 },
  { id:'f-schema', type:'file', title:'Knowledge schemas', summary:'Portable node and edge JSON schemas.', contentKind:'file', fileName:'knowledge-node.schema.json', mimeType:'application/json', fileSize:'3 KB', extractedPreview:'Defines portable node identity, owner, type, title, source metadata, and timestamps for Field consumers.', cluster:'Field', source:'Field Core', ai:true, recent:10, x:35,y:135 }
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
  ['p-relay','r-field',.8,'context'], ['p-relay','n-ui',.78,'contains'], ['p-relay','img-relay',.84,'contains'], ['r-field','p-field',.95,'references'],
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
  dragStart: null,
  animation: null,
  animationFrame: 0
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
    button.innerHTML = `<span class="filter-left"><i class="dot"></i>${labels[type]}</span><span class="filter-count">${count}</span>`;
    button.dataset.type = type;
    button.addEventListener('click', () => {
      if (state.filters.has(type)) state.filters.delete(type); else state.filters.add(type);
      button.classList.toggle('active', state.filters.has(type));
      if (state.selected && !isVisible(getNode(state.selected))) selectNode(null);
      updateStats();
      fitGraph();
    });
    holder.appendChild(button);
  }
}

function getNode(id) { return nodes.find(n => n.id === id); }

function clusterAnchor(cluster) {
  if (!cluster) return null;
  return nodes.find(node => (node.type === 'project' || node.type === 'collection') && node.cluster.toLowerCase() === cluster.toLowerCase()) || null;
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
  if (state.view === 'projects' && node.type !== 'project' && node.type !== 'collection') return false;
  if (state.view === 'recent' && node.recent < 8) return false;
  if (
    node.lodMinScale &&
    state.scale < node.lodMinScale &&
    !state.query &&
    state.selected !== node.id &&
    state.selected !== node.parentId
  ) return false;
  if (state.query) {
    const q = state.query.toLowerCase();
    const hay = `${node.title} ${node.summary} ${node.cluster} ${node.type} ${node.contentText ?? ''} ${node.extractedPreview ?? ''} ${(node.contentBlocks ?? []).map(block => block.text ?? '').join(' ')}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function visibleNodes() { return nodes.filter(isVisible); }

let initialFitDone = false;

function resize() {
  const rect = canvas.getBoundingClientRect();
  dpr = Math.min(devicePixelRatio || 1, 2);
  width = rect.width;
  height = rect.height;
  canvas.width = Math.max(1, Math.floor(width * dpr));
  canvas.height = Math.max(1, Math.floor(height * dpr));
  ctx.setTransform(dpr,0,0,dpr,0,0);

  if (!initialFitDone && width > 0 && height > 0) {
    initialFitDone = true;
    fitGraph();
  } else {
    render();
  }
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
  if (node.type === 'collection') return 11.5;
  if ((node.type === 'project' || node.type === 'collection')) return 11;
  if (node.type === 'ravin_conversation') return 8;
  return 6.5;
}

function selectedNeighborhood() {
  const ids = new Set();
  const focusId = state.selected || state.hovered;
  if (!focusId) return ids;
  ids.add(focusId);
  for (const edge of edges) {
    if (edge.a === focusId) ids.add(edge.b);
    if (edge.b === focusId) ids.add(edge.a);
  }
  return ids;
}

function isSemanticEdge(edge) {
  return edge.type === 'context' || edge.type === 'cross-project' || edge.type === 'semantic_related';
}

function render(now = performance.now()) {
  ctx.clearRect(0,0,width,height);
  drawBackdrop();
  const currentlyVisible = visibleNodes();
  const visible = new Set(currentlyVisible.map(n => n.id));
  const colors = graphTheme();
  const neighborhood = selectedNeighborhood();

  for (const edge of edges) {
    if (!visible.has(edge.a) || !visible.has(edge.b)) continue;
    const aState = animatedNodeState(getNode(edge.a), now);
    const bState = animatedNodeState(getNode(edge.b), now);
    const edgeProgress = animatedEdgeProgress(edge, now);
    if (edgeProgress <= 0 || aState.alpha <= 0 || bState.alpha <= 0) continue;
    const a = worldToScreen(aState);
    const bFull = worldToScreen(bState);
    const b = {
      x: a.x + (bFull.x - a.x) * edgeProgress,
      y: a.y + (bFull.y - a.y) * edgeProgress
    };
    const focusId = state.selected || state.hovered;
    const selectedEdge = focusId && (edge.a === focusId || edge.b === focusId);
    const dimmed = focusId && !selectedEdge;
    ctx.beginPath();
    ctx.moveTo(a.x,a.y);
    ctx.lineTo(b.x,b.y);
    ctx.lineWidth = selectedEdge ? 1.2 : .62;
    ctx.setLineDash(isSemanticEdge(edge) ? [4,5] : []);
    const opacity = (selectedEdge ? .46 : dimmed ? .018 : .07 + edge.strength*.075) * edgeProgress;
    ctx.strokeStyle = selectedEdge
      ? colors.edgeSelected
      : `rgba(${colors.edge[0]},${colors.edge[1]},${colors.edge[2]},${opacity})`;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  for (const node of currentlyVisible) {
    const visual = animatedNodeState(node, now);
    if (visual.alpha <= 0) continue;
    drawNode(node, !(state.selected || state.hovered) || neighborhood.has(node.id), visual);
  }

  if (state.animation) {
    const elapsed = now - state.animation.start;
    if (elapsed < state.animation.duration + 180) {
      cancelAnimationFrame(state.animationFrame);
      state.animationFrame = requestAnimationFrame(render);
    } else {
      state.animation = null;
      state.animationFrame = 0;
    }
  }
}

function easeOutCubic(value) {
  const t = Math.max(0, Math.min(1, value));
  return 1 - Math.pow(1 - t, 3);
}

function animatedNodeState(node, now) {
  if (!state.animation || !node) return { ...node, alpha: 1, scaleFactor: 1 };
  const entry = state.animation.nodes?.[node.id];
  if (!entry) return { ...node, alpha: 1, scaleFactor: 1 };

  const elapsed = now - state.animation.start - (entry.delay ?? 0);
  const progress = easeOutCubic(elapsed / Math.max(1, entry.duration ?? 520));
  const from = entry.fromId ? getNode(entry.fromId) : null;
  const fromX = from?.x ?? node.x;
  const fromY = from?.y ?? node.y;

  return {
    ...node,
    x: fromX + (node.x - fromX) * progress,
    y: fromY + (node.y - fromY) * progress,
    alpha: progress,
    scaleFactor: .35 + progress * .65
  };
}

function animatedEdgeProgress(edge, now) {
  if (!state.animation) return 1;
  const entry = state.animation.edges?.[edge.id];
  if (!entry) {
    const a = state.animation.nodes?.[edge.a];
    const b = state.animation.nodes?.[edge.b];
    if (!a && !b) return 1;
    const fallback = b || a;
    const elapsed = now - state.animation.start - (fallback?.delay ?? 0);
    return easeOutCubic(elapsed / Math.max(1, fallback?.duration ?? 520));
  }
  const elapsed = now - state.animation.start - (entry.delay ?? 0);
  return easeOutCubic(elapsed / Math.max(1, entry.duration ?? 520));
}

function startRevealAnimation(plan = {}) {
  cancelAnimationFrame(state.animationFrame);
  state.animation = {
    start: performance.now(),
    duration: Math.max(500, plan.duration ?? 2200),
    nodes: plan.nodes ?? {},
    edges: plan.edges ?? {},
    mode: plan.mode ?? 'reveal'
  };
  state.animationFrame = requestAnimationFrame(render);
}

function stopRevealAnimation() {
  cancelAnimationFrame(state.animationFrame);
  state.animationFrame = 0;
  state.animation = null;
  render();
}

function drawBackdrop() {
  const step = 42 * Math.max(.65, state.scale);
  const ox = ((width/2 + state.offsetX) % step + step) % step;
  const oy = ((height/2 + state.offsetY) % step + step) % step;
  ctx.fillStyle = graphTheme().grid;
  for (let x=ox; x<width; x+=step) for (let y=oy; y<height; y+=step) {
    ctx.beginPath();
    ctx.arc(x,y,.6,0,Math.PI*2);
    ctx.fill();
  }
}

const previewImageCache = new Map();

function drawNode(node, inFocus = true, visual = node) {
  const p = worldToScreen(visual);
  const r = nodeRadius(node) * Math.max(.8, Math.min(1.25,state.scale)) * (visual.scaleFactor ?? 1);
  const selected = state.selected === node.id;
  const hovered = state.hovered === node.id;
  const project = (node.type === 'project' || node.type === 'collection');
  const colors = graphTheme();
  const nodeColor = palette()[node.type] || (isDarkTheme() ? '#bdbdc4' : '#55555c');
  const focusAlpha = selected ? 1 : !inFocus ? .16 : project ? .96 : hovered ? 1 : .86;
  const alpha = focusAlpha * (visual.alpha ?? 1);

  if (node.recent >= 9 || selected) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, r + (selected ? 13 : 8), 0, Math.PI * 2);
    ctx.fillStyle = nodeColor;
    ctx.globalAlpha = alpha * (selected ? .075 : .035);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.save();
  ctx.globalAlpha = alpha;
  drawNodeCore(node, p, r + (hovered ? 1.2 : 0), selected ? colors.selectedNode : nodeColor);

  ctx.beginPath();
  ctx.arc(p.x,p.y,r + (selected ? 4 : hovered ? 3.8 : 3),0,Math.PI*2);
  ctx.strokeStyle = selected ? colors.ringSelected : colors.ring;
  ctx.lineWidth = selected ? 1.15 : .85;
  ctx.stroke();

  if (node.type === 'todo') {
    ctx.beginPath();
    ctx.arc(
      p.x,
      p.y,
      r + 6,
      -Math.PI / 2,
      node.completed ? Math.PI * 1.5 : Math.PI * .86
    );
    ctx.strokeStyle = nodeColor;
    ctx.globalAlpha = node.completed ? .34 : .62;
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.globalAlpha = alpha;
  }

  if (node.type === 'calendar_event') {
    for (const angle of [-Math.PI / 2, 0]) {
      ctx.beginPath();
      ctx.moveTo(p.x + Math.cos(angle) * (r + 4), p.y + Math.sin(angle) * (r + 4));
      ctx.lineTo(p.x + Math.cos(angle) * (r + 7), p.y + Math.sin(angle) * (r + 7));
      ctx.strokeStyle = nodeColor;
      ctx.lineWidth = .9;
      ctx.stroke();
    }
  }

  if (node.ai) {
    const orbitAngle = stableAngle(node.id);
    const ox = p.x + Math.cos(orbitAngle) * (r + 8);
    const oy = p.y + Math.sin(orbitAngle) * (r + 8);
    ctx.beginPath();
    ctx.arc(ox, oy, 1.45, 0, Math.PI * 2);
    ctx.fillStyle = palette().ravin_conversation;
    ctx.globalAlpha = .72 * alpha;
    ctx.fill();
  }

  ctx.restore();

  const shouldPreview =
    state.scale > 1.92 &&
    (selected || hovered || (node.recent >= 9 && ['note','file'].includes(node.type)));
  if (shouldPreview && !project) {
    drawClosePreview(node, p, alpha);
    return;
  }

  const showLabel =
    selected ||
    hovered ||
    project ||
    (state.selected && inFocus) ||
    (state.scale > 1.08 && node.recent >= 8);

  if (showLabel && inFocus) {
    const label = truncateCanvasLabel(node.title, project ? 28 : 24);
    ctx.font = project ? '600 11px Inter, system-ui' : '500 9px Inter, system-ui';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = selected || hovered ? colors.activeLabel : project ? colors.hubLabel : colors.label;
    ctx.globalAlpha = alpha;

    let labelX = p.x;
    let labelY = p.y + r + 12;
    if (p.x < 105) {
      ctx.textAlign = 'left';
      labelX = p.x + r + 9;
      labelY = p.y;
    } else if (p.x > width - 105) {
      ctx.textAlign = 'right';
      labelX = p.x - r - 9;
      labelY = p.y;
    } else {
      ctx.textAlign = 'center';
    }
    ctx.fillText(label, labelX, labelY);
    ctx.globalAlpha = 1;
  }
}

function drawNodeCore(node, p, r, fillStyle) {
  ctx.fillStyle = fillStyle;
  ctx.beginPath();
  if (node.type === 'file') {
    const sides = 6;
    for (let i = 0; i < sides; i++) {
      const angle = -Math.PI / 2 + i * (Math.PI * 2 / sides);
      const x = p.x + Math.cos(angle) * r;
      const y = p.y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  } else {
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  }
  ctx.fill();
}

function stableAngle(value) {
  let hash = 0;
  for (let i = 0; i < String(value).length; i++) hash = ((hash << 5) - hash + String(value).charCodeAt(i)) | 0;
  return (Math.abs(hash) % 628) / 100;
}

function drawClosePreview(node, p, alpha) {
  const cardWidth = node.contentKind === 'image' ? 88 : 104;
  const cardHeight = node.contentKind === 'image' ? 62 : 48;
  const x = p.x - cardWidth / 2;
  const y = p.y - cardHeight / 2;
  const dark = isDarkTheme();

  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha * .98);
  roundedRect(ctx, x, y, cardWidth, cardHeight, 7);
  ctx.fillStyle = dark ? 'rgba(7,7,8,.94)' : 'rgba(255,255,255,.96)';
  ctx.fill();
  ctx.strokeStyle = dark ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.12)';
  ctx.lineWidth = .8;
  ctx.stroke();

  if (node.contentKind === 'image' && node.previewUrl) {
    const image = previewImage(node.previewUrl);
    if (image?.complete && image.naturalWidth) {
      ctx.save();
      roundedRect(ctx, x + 3, y + 3, cardWidth - 6, cardHeight - 6, 5);
      ctx.clip();
      ctx.drawImage(image, x + 3, y + 3, cardWidth - 6, cardHeight - 6);
      ctx.restore();
      ctx.restore();
      return;
    }
  }

  ctx.fillStyle = dark ? '#f2f2f3' : '#171719';
  ctx.font = '600 8.5px Inter, system-ui';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(truncateCanvasLabel(node.title, 19), x + 8, y + 8);
  ctx.fillStyle = dark ? '#85858d' : '#707077';
  ctx.font = '500 7.5px Inter, system-ui';
  const preview = truncateCanvasLabel(node.summary || node.extractedPreview || node.type, 30);
  ctx.fillText(preview, x + 8, y + 23);
  ctx.restore();
}

function previewImage(url) {
  if (!url) return null;
  if (previewImageCache.has(url)) return previewImageCache.get(url);
  const image = new Image();
  image.decoding = 'async';
  image.onload = () => render();
  image.src = url;
  previewImageCache.set(url, image);
  return image;
}

function roundedRect(context, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

function truncateCanvasLabel(value, max) {
  if (!value || value.length <= max) return value || '';
  return value.slice(0, Math.max(1, max - 1)) + '…';
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
  const previous = state.selected;
  state.selected = id;
  const inspector = document.querySelector('#inspector');
  if (!id) {
    inspector.classList.remove('open');
    inspector.innerHTML = `<div class="empty-state"><div class="empty-icon">✦</div><h2>Select a node</h2><p>Click anything in the Field to inspect its source, relationships, and AI-access status.</p></div>`;
    if (previous) fitGraph(); else render();
    return;
  }

  const node = getNode(id);

  if (node?.virtual) {
    const childEdges = edges.filter(edge => edge.type === 'contains' && edge.a === id);
    const childNodes = {};
    const childEdgePlan = {};
    childEdges.forEach((edge, index) => {
      childNodes[edge.b] = {
        delay: 45 + index * 32,
        duration: 430,
        fromId: id,
      };
      childEdgePlan[edge.id] = {
        delay: Math.max(20, index * 32),
        duration: 340,
      };
    });
    if (childEdges.length) {
      startRevealAnimation({
        mode: 'cluster-expand',
        duration: Math.max(700, childEdges.length * 32 + 560),
        nodes: childNodes,
        edges: childEdgePlan,
      });
      fitGraph();
    }
  }

  const relatedEdges = edges.filter(e => e.a === id || e.b === id).sort((a,b)=>b.strength-a.strength);
  const related = relatedEdges.map(e => ({ edge:e, node:getNode(e.a === id ? e.b : e.a) })).filter(x => x.node);
  inspector.classList.add('open');
  inspector.innerHTML = `
    <div class="inspector-head">
      <div class="node-type"><i class="dot" style="color:${palette()[node.type]};background:${palette()[node.type]}"></i>${labels[node.type]}</div>
      <button class="inspector-close" type="button" aria-label="Close inspector" title="Close">×</button>
    </div>
    <h2 class="node-title">${escapeHtml(node.title)}</h2>
    <p class="node-summary">${escapeHtml(node.summary)}</p>

    <div class="inspector-section">
      <p class="section-label">CONTENT PREVIEW</p>
      ${renderNodePreview(node)}
    </div>

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

  if (!previous) fitGraph();
  inspector.querySelector('.inspector-close')?.addEventListener('click', () => selectNode(null));
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

function renderNodePreview(node) {
  if (node.contentKind === 'image' && node.previewUrl) {
    return `<figure class="content-preview image-preview"><img src="${node.previewUrl}" alt="${escapeHtml(node.previewAlt || node.title)}" /><figcaption>${escapeHtml(node.fileName || node.title)} · ${escapeHtml(node.fileSize || 'Image')}</figcaption></figure>`;
  }

  if (node.contentKind === 'note_blocks' && Array.isArray(node.contentBlocks)) {
    return `<div class="content-preview note-preview">${node.contentBlocks.map(block => {
      const text = escapeHtml(String(block.text ?? ''));
      if (block.type === 'heading') return `<h3>${text}</h3>`;
      if (block.type === 'bullet') return `<p class="preview-bullet">• <span>${text}</span></p>`;
      if (block.type === 'todo') return `<p class="preview-todo"><span class="preview-check ${block.checked ? 'checked' : ''}">${block.checked ? '✓' : ''}</span><span class="${block.checked ? 'preview-done' : ''}">${text}</span></p>`;
      if (block.type === 'quote') return `<blockquote>${text}</blockquote>`;
      return `<p>${text}</p>`;
    }).join('')}</div>`;
  }

  if (node.contentKind === 'todo') {
    return `<div class="content-preview todo-preview"><div class="preview-check ${node.completed ? 'checked' : ''}">${node.completed ? '✓' : ''}</div><div><strong>${escapeHtml(node.title)}</strong><span>Due ${escapeHtml(node.dueOn || 'unscheduled')}</span></div></div>`;
  }

  if (node.contentKind === 'calendar_event') {
    return `<div class="content-preview calendar-preview"><strong>${escapeHtml(node.eventDate || '')}${node.eventTime ? ' · ' + escapeHtml(node.eventTime) : ''}</strong><p>${escapeHtml(node.eventDetails || node.summary)}</p></div>`;
  }

  if (node.contentKind === 'file') {
    return `<div class="content-preview file-preview"><div class="file-icon">FILE</div><div><strong>${escapeHtml(node.fileName || node.title)}</strong><span>${escapeHtml(node.mimeType || 'File')}${node.fileSize ? ' · ' + escapeHtml(node.fileSize) : ''}</span></div></div>${node.extractedPreview ? `<p class="extracted-preview">${escapeHtml(node.extractedPreview)}</p>` : ''}`;
  }

  const text = node.contentText || node.summary;
  return `<div class="content-preview text-preview">${escapeHtml(text).replace(/\n/g, '<br>')}</div>`;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function syncFilterColors() {
  const colors = palette();
  document.querySelectorAll('.filter').forEach(button => {
    const type = button.dataset.type;
    const dot = button.querySelector('.dot');
    if (dot && colors[type]) dot.style.background = colors[type];
  });
}

function applyTheme(theme, persist = true) {
  const dark = theme === 'dark';
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  if (persist) {
    try {
      localStorage.setItem('resonant-theme', dark ? 'dark' : 'light');
      localStorage.setItem('relay-theme', dark ? 'dark' : 'light');
    } catch {}
  }
  const toggle = document.querySelector('#themeToggle');
  if (toggle) {
    toggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    toggle.setAttribute('title', dark ? 'Light mode' : 'Dark mode');
  }
  syncFilterColors();
  render();
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

function fitGraph() {
  const visible = visibleNodes();
  if (!visible.length || width <= 0 || height <= 0) {
    state.scale = 1;
    state.offsetX = 0;
    state.offsetY = 0;
    updateZoom();
    render();
    return;
  }

  const xs = visible.map(node => node.x);
  const ys = visible.map(node => node.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(120, maxX - minX);
  const spanY = Math.max(120, maxY - minY);

  const inspectorWidth = state.selected ? Math.min(360, width * .88) : 0;
  const availableWidth = Math.max(280, width - inspectorWidth);
  const paddingX = Math.min(150, Math.max(64, availableWidth * .1));
  const paddingY = Math.min(120, Math.max(64, height * .11));
  const scaleX = Math.max(.1, (availableWidth - paddingX * 2) / spanX);
  const scaleY = Math.max(.1, (height - paddingY * 2) / spanY);

  state.scale = Math.max(.5, Math.min(1.45, Math.min(scaleX, scaleY)));
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const targetX = availableWidth / 2;

  state.offsetX = targetX - width / 2 - centerX * state.scale;
  state.offsetY = -centerY * state.scale + 8;
  updateZoom();
  render();
}

function centerGraph() {
  fitGraph();
}

function updateZoom() {
  document.querySelector('#zoomLabel').textContent = `${Math.round(state.scale*100)}%`;
}

function runRavin(prompt) {
  const result = document.querySelector('#ravinResult');
  const tokens = prompt.toLowerCase().split(/\W+/).filter(w=>w.length>3);
  const ranked = nodes.map(node => {
    const text = `${node.title} ${node.summary} ${node.cluster} ${node.contentText ?? ''} ${node.extractedPreview ?? ''} ${(node.contentBlocks ?? []).map(block => block.text ?? '').join(' ')}`.toLowerCase();
    let score = tokens.reduce((sum,t)=>sum+(text.includes(t)?2:0),0);
    const lowerPrompt = prompt.toLowerCase();
    if (/due|soon|coming|todo|task/.test(lowerPrompt) && (node.type === 'todo' || node.type === 'calendar_event')) score += 3;
    if (/recent|changed|latest/.test(lowerPrompt)) score += node.recent * .22;
    if (/work|working|project|focus/.test(lowerPrompt) && (node.type === 'project' || node.type === 'collection')) score += 2.5;
    score += node.recent * .05;
    return {node,score};
  }).filter(x=>x.score>1).sort((a,b)=>b.score-a.score).slice(0,5);

  const seedIds = new Set(ranked.map(x=>x.node.id));
  const contextEdges = edges.filter(e=>seedIds.has(e.a)||seedIds.has(e.b)).slice(0,6);

  result.hidden = false;
  result.innerHTML = `<strong>Retrieved ${ranked.length} nodes</strong><br>${ranked.map(x=>escapeHtml(x.node.title)).join(' · ')}<br><br><span style="color:var(--ink-faint)">${contextEdges.length} related edges would also be passed to RAVIN.</span>`;

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

document.querySelector('#themeToggle')?.addEventListener('click', () => {
  applyTheme(isDarkTheme() ? 'light' : 'dark');
});

window.addEventListener('arrow:themechange', () => {
  syncFilterColors();
  render();
});

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
    contentKind: 'text',
    contentText: summary,
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
  fitGraph();
  selectNode(node.id);
});

nodeDialog.addEventListener('click', event => {
  if (event.target === nodeDialog) closeNodeDialog();
});

document.querySelector('#searchInput').addEventListener('input', e => {
  state.query = e.target.value.trim();
  if (state.selected && !isVisible(getNode(state.selected))) selectNode(null);
  updateStats();
  fitGraph();
});

document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase()==='k') {
    e.preventDefault();
    document.querySelector('#searchInput').focus();
  }
  if (e.key === 'Escape') selectNode(null);
  if (
    e.key.toLowerCase() === 'f' &&
    !e.metaKey &&
    !e.ctrlKey &&
    !e.altKey &&
    !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)
  ) {
    e.preventDefault();
    fitGraph();
  }
});

document.querySelector('#resetFilters').addEventListener('click', () => {
  state.filters = new Set(Object.keys(labels));
  document.querySelectorAll('.filter').forEach(b=>b.classList.add('active'));
  updateStats();
  fitGraph();
});

document.querySelectorAll('.view-button').forEach(button => {
  button.addEventListener('click', () => {
    state.view = button.dataset.view;
    document.querySelectorAll('.view-button').forEach(b=>b.classList.toggle('active',b===button));
    if (state.selected && !isVisible(getNode(state.selected))) selectNode(null);
    updateStats();
    fitGraph();
  });
});

document.querySelectorAll('.prompt-chip').forEach(button => button.addEventListener('click', () => runRavin(button.dataset.prompt)));

document.querySelector('#centerGraph').addEventListener('click', centerGraph);
document.querySelector('#zoomIn').addEventListener('click', () => { state.scale=Math.min(2.2,state.scale*1.15); updateZoom(); render(); });
document.querySelector('#zoomOut').addEventListener('click', () => { state.scale=Math.max(.45,state.scale/1.15); updateZoom(); render(); });

const hoverCard = document.querySelector('#hoverCard');

function hideHoverCard() {
  hoverCard.classList.remove('visible');
  hoverCard.hidden = true;
}

function showHoverCard(node, x, y) {
  if (!node || state.dragging) {
    hideHoverCard();
    return;
  }
  const relationCount = edges.filter(edge => edge.a === node.id || edge.b === node.id).length;
  hoverCard.innerHTML = `
    <div class="hover-type">${escapeHtml(labels[node.type] || node.type)}</div>
    <strong>${escapeHtml(node.title)}</strong>
    <span>${escapeHtml(node.source)} · ${relationCount} relationship${relationCount === 1 ? '' : 's'}</span>
  `;
  hoverCard.hidden = false;
  const cardWidth = 190;
  const cardHeight = 74;
  hoverCard.style.left = Math.max(10, Math.min(width - cardWidth - 10, x + 14)) + 'px';
  hoverCard.style.top = Math.max(10, Math.min(height - cardHeight - 10, y + 14)) + 'px';
  requestAnimationFrame(() => hoverCard.classList.add('visible'));
}

function focusNode(node) {
  if (!node) return;
  selectNode(node.id);
  const inspectorWidth = Math.min(360, width * .88);
  const availableWidth = Math.max(280, width - inspectorWidth);
  state.scale = Math.max(1.05, Math.min(1.5, state.scale * 1.12));
  state.offsetX = availableWidth / 2 - width / 2 - node.x * state.scale;
  state.offsetY = -node.y * state.scale;
  updateZoom();
  render();
}

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
  if (hit) showHoverCard(hit, x, y); else hideHoverCard();
  canvas.style.cursor = hit ? 'pointer' : 'grab';
});

canvas.addEventListener('mousedown', e => {
  const rect=canvas.getBoundingClientRect();
  const x=e.clientX-rect.left, y=e.clientY-rect.top;
  const hit=hitTest(x,y);
  if (hit) { selectNode(hit.id); return; }
  hideHoverCard();
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

canvas.addEventListener('mouseleave', () => { hideHoverCard(); if (!state.dragging) { state.hovered=null; render(); } });

canvas.addEventListener('dblclick', e => {
  const rect = canvas.getBoundingClientRect();
  const hit = hitTest(e.clientX - rect.left, e.clientY - rect.top);
  if (hit) focusNode(hit);
});

const systemTheme = matchMedia('(prefers-color-scheme: dark)');
systemTheme.addEventListener?.('change', event => {
  let explicit = false;
  try { explicit = Boolean(localStorage.getItem('resonant-theme') || localStorage.getItem('relay-theme')); } catch {}
  if (!explicit) applyTheme(event.matches ? 'dark' : 'light', false);
});

window.FieldExplorer = {
  nodes,
  edges,
  state,
  labels,
  paletteDark,
  paletteLight,
  seedNodes,
  setupFilters,
  setupFilterCounts,
  syncFilterColors,
  updateStats,
  fitGraph,
  render,
  selectNode,
  getNode,
  visibleNodes,
  saveCustomNodes,
  attachCustomNode,
  closeNodeDialog,
  nodeDialog,
  nodeForm,
  startRevealAnimation,
  stopRevealAnimation,
};

setupFilters();
setupFilterCounts();
syncFilterColors();
applyTheme(isDarkTheme() ? 'dark' : 'light', false);
updateStats();
updateZoom();
new ResizeObserver(resize).observe(canvas);
resize();
