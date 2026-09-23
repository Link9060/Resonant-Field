import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.4';

const SUPABASE_URL = 'https://cnorozrjugxpanpfmssa.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_yVNPiB7opT0WRvBfKTZ2BA_s5bOQLRg';
const RELAY_CONNECT_URL = 'https://resonantrelay.org/connect-field/';
const PAGE_SIZE = 1000;
const TODO_LOD_SCALE = 1.65;
const BUILD_LAYOUT_VERSION = 2;

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

const Field = window.FieldExplorer;
if (!Field) throw new Error('Field Explorer failed to initialize before account sync.');

const demoNodes = clone(Field.nodes);
const demoEdges = clone(Field.edges);

const accountButton = document.querySelector('#accountButton');
const accountLabel = document.querySelector('#accountLabel');
const accountMenu = document.querySelector('#accountMenu');
const accountEmail = document.querySelector('#accountEmail');
const fieldStatus = document.querySelector('#fieldStatus');
const demoBanner = document.querySelector('#demoBanner');
const connectRelayInline = document.querySelector('#connectRelayInline');
const signOutField = document.querySelector('#signOutField');
const nodeDialogMode = document.querySelector('#nodeDialogMode');
const nodeDialogFootnote = document.querySelector('#nodeDialogFootnote');
const buildOverlay = document.querySelector('#buildFieldOverlay');
const buildButton = document.querySelector('#buildFieldButton');
const buildMeta = document.querySelector('#buildFieldMeta');
const syncButton = document.querySelector('#syncField');

let liveMode = false;
let currentUser = null;
let currentUserState = null;
let loadingAccount = false;
let syncing = false;

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function connectRelay() {
  window.location.assign(RELAY_CONNECT_URL);
}

accountButton.addEventListener('click', () => {
  if (!liveMode) {
    connectRelay();
    return;
  }
  const opening = accountMenu.hidden;
  accountMenu.hidden = !opening;
  accountButton.setAttribute('aria-expanded', opening ? 'true' : 'false');
});

connectRelayInline.addEventListener('click', connectRelay);

signOutField.addEventListener('click', async () => {
  accountMenu.hidden = true;
  accountButton.setAttribute('aria-expanded', 'false');
  await supabase.auth.signOut({ scope: 'local' });
  restoreDemo();
});

syncButton.addEventListener('click', () => {
  void syncFieldNow();
});

buildButton.addEventListener('click', () => {
  void buildMyField();
});

document.addEventListener('click', event => {
  if (accountMenu.hidden) return;
  if (accountMenu.contains(event.target) || accountButton.contains(event.target)) return;
  accountMenu.hidden = true;
  accountButton.setAttribute('aria-expanded', 'false');
});

async function consumeRelayHandoff() {
  if (!window.location.hash) return false;
  const params = new URLSearchParams(window.location.hash.slice(1));
  const tokenHash = params.get('token_hash');
  if (!tokenHash) return false;

  setConnectionState('CONNECTING');
  const type = params.get('type') || 'magiclink';
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  history.replaceState(null, '', window.location.pathname + window.location.search);

  if (error || !data.session) {
    console.error('Field account handoff verification failed', error);
    showConnectionError('That Relay connection expired. Try Connect Relay again.');
    return false;
  }
  return true;
}

async function fetchAll(table, columns, orderColumn = null) {
  const rows = [];
  for (let start = 0; ; start += PAGE_SIZE) {
    let query = supabase.from(table).select(columns).range(start, start + PAGE_SIZE - 1);
    if (orderColumn) query = query.order(orderColumn, { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

async function optionalFetch(table, columns) {
  try {
    return await fetchAll(table, columns);
  } catch (error) {
    console.warn(`Field optional source ${table} could not be loaded`, error);
    return [];
  }
}

async function fetchUserState(userId) {
  const { data, error } = await supabase
    .from('field_user_state')
    .select('user_id,built_at,last_synced_at,layout_version,updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function loadRawFieldData() {
  const [rawNodes, rawEdges, rawContent, rawFiles, rawPreferences] = await Promise.all([
    fetchAll('field_nodes', 'id,user_id,type,title,searchable_text,source_product,source_id,source_type,metadata,created_at,updated_at', 'updated_at'),
    fetchAll('field_edges', 'id,user_id,source_node_id,target_node_id,relation_type,strength,origin,metadata,created_at,updated_at', 'updated_at'),
    optionalFetch('field_node_content', 'node_id,user_id,content_kind,text_content,structured_content,mime_type,preview_bucket_id,preview_object_path,preview_alt,updated_at'),
    optionalFetch('field_files', 'id,user_id,node_id,bucket_id,object_path,file_name,mime_type,size_bytes,extraction_status,created_at,updated_at'),
    optionalFetch('field_source_preferences', 'source_product,source_type,indexed,ravin_read,external_ai_read,allow_writeback'),
  ]);

  return { rawNodes, rawEdges, rawContent, rawFiles, rawPreferences };
}

async function loadLiveAccount(user, options = {}) {
  if (loadingAccount) return null;
  loadingAccount = true;
  setConnectionState(options.quiet ? 'LIVE' : 'SYNCING');

  try {
    const [raw, userState] = await Promise.all([
      loadRawFieldData(),
      fetchUserState(user.id),
    ]);

    const prepared = await prepareDataset(raw);

    Field.nodes.splice(0, Field.nodes.length, ...prepared.nodes);
    Field.edges.splice(0, Field.edges.length, ...prepared.edges);
    currentUser = user;
    currentUserState = userState;
    liveMode = true;

    resetExplorerForDataset({ preserve: Boolean(options.preserve) });
    setLiveUi(user, prepared.nodes.length, prepared.edges.length, Boolean(userState?.built_at));

    if (!userState?.built_at) {
      showBuildExperience(prepared);
    } else {
      hideBuildExperience();
      syncButton.hidden = false;
    }

    return { ...prepared, userState };
  } catch (error) {
    console.error('Field live account load failed', error);
    showConnectionError('Field connected your account, but could not load the graph.');
    return null;
  } finally {
    loadingAccount = false;
  }
}

async function prepareDataset({ rawNodes, rawEdges, rawContent, rawFiles, rawPreferences }) {
  const contentByNode = new Map(rawContent.map(row => [row.node_id, row]));
  const fileByNode = new Map(rawFiles.map(row => [row.node_id, row]));
  const preferenceBySource = new Map(rawPreferences.map(row => [`${row.source_product}:${row.source_type}`, row]));
  const rawNodeById = new Map(rawNodes.map(row => [row.id, row]));

  const nodes = rawNodes.map(row => {
    const content = contentByNode.get(row.id);
    const file = fileByNode.get(row.id);
    const preference = preferenceBySource.get(`${row.source_product}:${row.source_type}`);
    const node = {
      id: row.id,
      type: Field.labels[row.type] ? row.type : 'other',
      title: row.title || 'Untitled',
      summary: summarize(row.searchable_text) || defaultSummary(row),
      cluster: collectionName(row) || sourceName(row),
      source: sourceName(row),
      ai: preference?.ravin_read === true,
      recent: freshness(row.updated_at),
      x: 0,
      y: 0,
      live: true,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      sourceProduct: row.source_product,
      sourceType: row.source_type,
      rawMetadata: row.metadata || {},
    };

    applyContent(node, content, file);
    return node;
  });

  let edges = rawEdges
    .filter(edge => rawNodeById.has(edge.source_node_id) && rawNodeById.has(edge.target_node_id))
    .map(edge => ({
      id: edge.id,
      a: edge.source_node_id,
      b: edge.target_node_id,
      strength: Number(edge.strength ?? .5),
      type: edge.relation_type || 'related',
      origin: edge.origin || 'system',
      createdAt: edge.created_at,
      live: true,
    }));

  const todoClusters = buildTodoMapClusters(nodes, edges);
  nodes.push(...todoClusters.nodes);
  edges = todoClusters.edges;

  assignParents(nodes, edges);
  layoutPreparedNodes(nodes, edges);
  await attachSignedPreviews(nodes, rawContent, rawFiles);

  return { nodes, edges, rawNodes, rawEdges };
}

function buildTodoMapClusters(nodes, edges) {
  const todoHub = nodes.find(node =>
    node.type === 'collection' &&
    (/todo/i.test(node.title) || /todo/i.test(node.sourceType || '') || /todo/i.test(node.rawMetadata?.collection || ''))
  );

  if (!todoHub) return { nodes: [], edges };

  const directTodoEdges = edges.filter(edge => edge.type === 'contains' && edge.a === todoHub.id);
  const todoIds = new Set(
    directTodoEdges
      .map(edge => edge.b)
      .filter(id => nodes.find(node => node.id === id)?.type === 'todo')
  );

  if (todoIds.size < 16) return { nodes: [], edges };

  const groups = new Map();
  for (const id of todoIds) {
    const node = nodes.find(item => item.id === id);
    if (!node) continue;
    const key = todoGroup(node);
    const list = groups.get(key) || [];
    list.push(node);
    groups.set(key, list);
  }

  const virtualNodes = [];
  const virtualEdges = [];
  const groupOrder = ['overdue', 'today', 'soon', 'later', 'unscheduled', 'completed'];

  groupOrder.forEach((key, groupIndex) => {
    const children = groups.get(key) || [];
    if (!children.length) return;

    const id = `virtual:todos:${key}`;
    const title = todoGroupTitle(key);
    const virtualNode = {
      id,
      type: 'collection',
      title,
      summary: `${children.length} ${children.length === 1 ? 'task' : 'tasks'}`,
      cluster: todoHub.title,
      source: 'Field',
      ai: false,
      recent: Math.max(...children.map(child => child.recent || 0)),
      x: 0,
      y: 0,
      live: true,
      virtual: true,
      virtualCount: children.length,
      sourceProduct: 'field-ui',
      sourceType: 'virtual_cluster',
      groupIndex,
    };
    virtualNodes.push(virtualNode);

    virtualEdges.push({
      id: `virtual-edge:${todoHub.id}:${id}`,
      a: todoHub.id,
      b: id,
      strength: .9,
      type: 'contains',
      origin: 'field-ui',
      virtual: true,
      live: true,
    });

    children.forEach((child, index) => {
      child.parentId = id;
      child.lodMinScale = TODO_LOD_SCALE;
      child.cluster = title;
      child.groupIndex = index;
      virtualEdges.push({
        id: `virtual-edge:${id}:${child.id}`,
        a: id,
        b: child.id,
        strength: .82,
        type: 'contains',
        origin: 'field-ui',
        virtual: true,
        live: true,
      });
    });
  });

  const filtered = edges.filter(edge => !(edge.type === 'contains' && edge.a === todoHub.id && todoIds.has(edge.b)));
  return { nodes: virtualNodes, edges: [...filtered, ...virtualEdges] };
}

function todoGroup(node) {
  if (node.completed) return 'completed';
  const due = parseDateOnly(node.dueOn);
  if (!due) return 'unscheduled';

  const today = startOfToday();
  const difference = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (difference < 0) return 'overdue';
  if (difference === 0) return 'today';
  if (difference <= 7) return 'soon';
  return 'later';
}

function todoGroupTitle(key) {
  return ({
    overdue: 'Overdue',
    today: 'Today',
    soon: 'Soon',
    later: 'Later',
    unscheduled: 'No date',
    completed: 'Completed',
  })[key] || 'Tasks';
}

function parseDateOnly(value) {
  if (!value || /unscheduled/i.test(String(value))) return null;
  const text = String(value).slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfToday() {
  const value = new Date();
  value.setHours(0, 0, 0, 0);
  return value;
}

function assignParents(nodes, edges) {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const candidates = new Map();

  for (const edge of edges) {
    const source = byId.get(edge.a);
    const target = byId.get(edge.b);
    if (!source || !target) continue;

    if (edge.type === 'contains') {
      const score = source.type === 'collection' ? 100 + edge.strength : 70 + edge.strength;
      const current = candidates.get(target.id);
      if (!current || score > current.score) candidates.set(target.id, { id: source.id, score });
    }
  }

  for (const node of nodes) {
    if (!node.parentId && candidates.has(node.id)) node.parentId = candidates.get(node.id).id;
  }
}

function layoutPreparedNodes(nodes, edges) {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const children = new Map();

  for (const edge of edges) {
    if (edge.type !== 'contains') continue;
    const list = children.get(edge.a) || [];
    list.push(edge.b);
    children.set(edge.a, list);
  }

  const root = nodes.find(node => node.type === 'collection' && node.sourceType === 'workspace')
    || nodes.find(node => node.type === 'collection' && /^relay$/i.test(node.title))
    || nodes.find(node => node.type === 'collection');

  if (root) {
    root.x = 0;
    root.y = 0;
  }

  const rootChildren = (children.get(root?.id) || [])
    .map(id => byId.get(id))
    .filter(Boolean)
    .filter(node => node.type === 'collection')
    .sort((a, b) => String(a.title).localeCompare(String(b.title)));

  const radius = rootChildren.length <= 4 ? 245 : 285;
  rootChildren.forEach((node, index) => {
    const angle = -Math.PI / 2 + index * (Math.PI * 2 / Math.max(rootChildren.length, 1));
    node.x = Math.cos(angle) * radius;
    node.y = Math.sin(angle) * radius * .72;
    layoutChildren(node, children, byId, 0);
  });

  const positioned = new Set(nodes.filter(node => Number.isFinite(node.x) && Number.isFinite(node.y) && (node.x !== 0 || node.y !== 0 || node.id === root?.id)).map(node => node.id));
  const remaining = nodes.filter(node => !positioned.has(node.id));

  remaining.forEach((node, index) => {
    const center = typeCenter(node.type);
    const angle = index * 2.399963229728653;
    const distance = 55 + Math.sqrt(index + 1) * 12;
    node.x = center.x + Math.cos(angle) * distance;
    node.y = center.y + Math.sin(angle) * distance;
  });
}

function layoutChildren(parent, children, byId, depth) {
  const ids = children.get(parent.id) || [];
  const childNodes = ids.map(id => byId.get(id)).filter(Boolean);
  if (!childNodes.length) return;

  const virtual = childNodes.filter(node => node.virtual);
  const normal = childNodes.filter(node => !node.virtual);

  if (virtual.length) {
    const clusterRadius = 88;
    virtual.forEach((node, index) => {
      const angle = -Math.PI / 2 + index * (Math.PI * 2 / virtual.length);
      node.x = parent.x + Math.cos(angle) * clusterRadius;
      node.y = parent.y + Math.sin(angle) * clusterRadius;
      layoutChildren(node, children, byId, depth + 1);
    });
  }

  const leafRadiusBase = depth > 0 ? 58 : 78;
  normal.forEach((node, index) => {
    const angle = index * 2.399963229728653;
    const distance = leafRadiusBase + Math.sqrt(index + 1) * (depth > 0 ? 10 : 13);
    node.x = parent.x + Math.cos(angle) * distance;
    node.y = parent.y + Math.sin(angle) * distance;
    layoutChildren(node, children, byId, depth + 1);
  });
}

function typeCenter(type) {
  if (type === 'note') return { x: -260, y: -120 };
  if (type === 'todo') return { x: 270, y: -90 };
  if (type === 'file') return { x: -250, y: 190 };
  if (type === 'calendar_event') return { x: 275, y: 190 };
  if (type === 'ravin_conversation' || type === 'memory') return { x: 0, y: -245 };
  return { x: 0, y: 240 };
}

function applyContent(node, content, file) {
  if (content?.content_kind === 'note_blocks' && Array.isArray(content.structured_content)) {
    node.contentKind = 'note_blocks';
    node.contentBlocks = content.structured_content;
  } else if (content?.content_kind === 'todo') {
    const value = content.structured_content || {};
    node.contentKind = 'todo';
    node.dueOn = value.due_on || node.rawMetadata?.due_on || 'Unscheduled';
    node.completed = Boolean(value.completed ?? node.rawMetadata?.completed);
  } else if (content?.content_kind === 'calendar_event') {
    const value = content.structured_content || {};
    node.contentKind = 'calendar_event';
    node.eventDate = value.event_date || value.date || '';
    node.eventTime = value.start_time || '';
    node.eventDetails = value.details || content.text_content || node.summary;
  } else if (content?.content_kind === 'image') {
    node.contentKind = 'image';
    node.previewAlt = content.preview_alt || node.title;
  } else if (content?.text_content) {
    node.contentKind = 'text';
    node.contentText = content.text_content;
  }

  if (file) {
    node.fileName = file.file_name || node.title;
    node.mimeType = file.mime_type || content?.mime_type || 'application/octet-stream';
    node.fileSize = formatBytes(file.size_bytes);
    if (!node.contentKind) node.contentKind = 'file';
    if (content?.text_content) node.extractedPreview = summarize(content.text_content, 360);
  }
}

async function attachSignedPreviews(prepared, rawContent, rawFiles) {
  const contentByNode = new Map(rawContent.map(row => [row.node_id, row]));
  const fileByNode = new Map(rawFiles.map(row => [row.node_id, row]));

  await Promise.all(prepared.map(async node => {
    if (node.virtual) return;
    const content = contentByNode.get(node.id);
    const file = fileByNode.get(node.id);
    const mime = String(file?.mime_type || content?.mime_type || '');
    if (!mime.startsWith('image/')) return;

    const bucket = content?.preview_bucket_id || file?.bucket_id;
    const objectPath = content?.preview_object_path || file?.object_path;
    if (!bucket || !objectPath) return;

    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(objectPath, 300);
    if (!error && data?.signedUrl) {
      node.contentKind = 'image';
      node.previewUrl = data.signedUrl;
      node.previewAlt = content?.preview_alt || node.title;
    }
  }));
}

function collectionName(row) {
  if (row.type !== 'collection') return null;
  return row.title || 'Collection';
}

function sourceName(row) {
  if (row.source_product === 'relay') {
    if (row.source_type === 'note') return 'Relay Notes';
    if (row.source_type === 'todo') return 'Relay To Do';
    if (row.source_type === 'calendar_event') return 'Relay Calendar';
    if (row.source_type === 'file' || row.source_type === 'image') return 'Relay Files';
    return 'Relay';
  }
  if (row.source_product === 'field-system') return 'Field';
  if (row.source_product === 'ravin') return 'RAVIN';
  return row.source_product || 'Field';
}

function defaultSummary(row) {
  if (row.type === 'collection') return `${row.title} connected knowledge.`;
  return `${sourceName(row)} knowledge node.`;
}

function summarize(value, max = 220) {
  if (!value) return '';
  const text = String(value).replace(/\s+/g, ' ').trim();
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

function freshness(value) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 5;
  const days = Math.max(0, (Date.now() - timestamp) / 86_400_000);
  if (days < 1) return 10;
  if (days < 3) return 9;
  if (days < 7) return 8;
  if (days < 14) return 7;
  if (days < 30) return 6;
  return 4;
}

function formatBytes(value) {
  const size = Number(value);
  if (!Number.isFinite(size) || size < 0) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function resetExplorerForDataset({ preserve = false } = {}) {
  const selected = preserve ? Field.state.selected : null;
  const query = preserve ? Field.state.query : '';
  const view = preserve ? Field.state.view : 'all';

  Field.state.selected = selected && Field.getNode(selected) ? selected : null;
  Field.state.hovered = null;
  Field.state.query = query;
  Field.state.view = view;
  Field.state.filters = new Set(Object.keys(Field.labels));

  document.querySelector('#searchInput').value = query;
  document.querySelector('#filters').innerHTML = '';
  document.querySelectorAll('.view-button').forEach(button => {
    button.classList.toggle('active', button.dataset.view === view);
  });

  Field.setupFilters();
  Field.setupFilterCounts();
  Field.syncFilterColors();
  Field.updateStats();
  if (Field.state.selected) Field.selectNode(Field.state.selected); else Field.selectNode(null);
  if (!preserve) Field.fitGraph(); else Field.render();
}

function showBuildExperience(dataset) {
  syncButton.hidden = true;
  buildOverlay.hidden = false;
  buildOverlay.classList.remove('building', 'releasing');
  buildButton.disabled = false;

  const realNodes = dataset.nodes.filter(node => !node.virtual);
  const virtualCount = dataset.nodes.length - realNodes.length;
  buildMeta.textContent = `${realNodes.length} real nodes${virtualCount ? ` · ${virtualCount} map clusters` : ''} ready to organize`;
}

function hideBuildExperience() {
  buildOverlay.hidden = true;
  buildOverlay.classList.remove('building', 'releasing');
}

async function buildMyField() {
  if (!liveMode || !currentUser || buildButton.disabled) return;
  buildButton.disabled = true;
  buildOverlay.classList.add('building');
  fieldStatus.textContent = 'BUILDING';

  await sleep(430);

  const plan = createBuildPlan(Field.nodes, Field.edges);
  buildOverlay.classList.add('releasing');
  Field.startRevealAnimation(plan);
  Field.fitGraph();

  await supabase.from('field_user_state').upsert({
    user_id: currentUser.id,
    built_at: new Date().toISOString(),
    last_synced_at: new Date().toISOString(),
    layout_version: BUILD_LAYOUT_VERSION,
  }, { onConflict: 'user_id' });

  currentUserState = await fetchUserState(currentUser.id);

  await sleep(560);
  hideBuildExperience();
  syncButton.hidden = false;
  fieldStatus.textContent = 'LIVE';
  showSyncFlash('Field built');
}

function createBuildPlan(nodes, edges) {
  const root = nodes.find(node => node.type === 'collection' && node.sourceType === 'workspace')
    || nodes.find(node => node.type === 'collection' && /^relay$/i.test(node.title))
    || nodes.find(node => node.type === 'collection');

  const depth = new Map();
  const parent = new Map();
  if (root) depth.set(root.id, 0);

  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of edges.filter(edge => edge.type === 'contains')) {
      const sourceDepth = depth.get(edge.a);
      if (sourceDepth == null || depth.has(edge.b)) continue;
      depth.set(edge.b, sourceDepth + 1);
      parent.set(edge.b, edge.a);
      changed = true;
    }
  }

  const nodePlan = {};
  let maxDelay = 0;
  nodes.forEach((node, index) => {
    const level = depth.get(node.id) ?? 3;
    const delay = level * 300 + Math.min(index * 11, 360);
    maxDelay = Math.max(maxDelay, delay);
    nodePlan[node.id] = {
      delay,
      duration: node.virtual ? 460 : 560,
      fromId: parent.get(node.id) || (node.id === root?.id ? null : root?.id || null),
    };
  });

  const edgePlan = {};
  edges.forEach((edge, index) => {
    const childDelay = nodePlan[edge.b]?.delay ?? nodePlan[edge.a]?.delay ?? 0;
    edgePlan[edge.id] = {
      delay: Math.max(120, childDelay - 80) + Math.min(index * 3, 90),
      duration: 440,
    };
  });

  return {
    mode: 'build',
    duration: maxDelay + 800,
    nodes: nodePlan,
    edges: edgePlan,
  };
}

async function syncFieldNow(options = {}) {
  if (!liveMode || !currentUser || syncing) return;
  syncing = true;
  syncButton.disabled = true;
  syncButton.classList.add('syncing');
  fieldStatus.textContent = 'SYNCING';

  const oldNodeIds = new Set(Field.nodes.map(node => node.id));
  const oldEdgeIds = new Set(Field.edges.map(edge => edge.id));

  try {
    // Give semantic Field relationships a chance to catch up before the visual sync.
    try {
      await supabase.functions.invoke('field-semantic-refresh', {
        body: { limit: 20, threshold: .72, neighbors: 8 },
      });
    } catch (error) {
      console.warn('Semantic refresh skipped during Field sync', error);
    }

    const raw = await loadRawFieldData();
    const prepared = await prepareDataset(raw);

    const newNodeIds = new Set(prepared.nodes.filter(node => !oldNodeIds.has(node.id)).map(node => node.id));
    const newEdgeIds = new Set(prepared.edges.filter(edge => !oldEdgeIds.has(edge.id)).map(edge => edge.id));

    Field.nodes.splice(0, Field.nodes.length, ...prepared.nodes);
    Field.edges.splice(0, Field.edges.length, ...prepared.edges);

    if (newNodeIds.size || newEdgeIds.size) {
      const plan = createSyncPlan(prepared.nodes, prepared.edges, oldNodeIds, newNodeIds, newEdgeIds);
      Field.startRevealAnimation(plan);
      resetExplorerForDataset({ preserve: true });
      showSyncFlash(`${newNodeIds.size} new ${newNodeIds.size === 1 ? 'node' : 'nodes'} · ${newEdgeIds.size} new ${newEdgeIds.size === 1 ? 'link' : 'links'}`);
    } else {
      resetExplorerForDataset({ preserve: true });
      showSyncFlash('Field is up to date');
    }

    const syncedAt = new Date().toISOString();
    await supabase.from('field_user_state').upsert({
      user_id: currentUser.id,
      built_at: currentUserState?.built_at || syncedAt,
      last_synced_at: syncedAt,
      layout_version: BUILD_LAYOUT_VERSION,
    }, { onConflict: 'user_id' });

    currentUserState = await fetchUserState(currentUser.id);
    setLiveUi(currentUser, prepared.nodes.length, prepared.edges.length, true);

    if (options.selectNodeId && Field.getNode(options.selectNodeId)) {
      setTimeout(() => Field.selectNode(options.selectNodeId), 500);
    }
  } catch (error) {
    console.error('Field sync failed', error);
    showSyncFlash('Sync failed');
  } finally {
    syncing = false;
    syncButton.disabled = false;
    syncButton.classList.remove('syncing');
    fieldStatus.textContent = 'LIVE';
  }
}

function createSyncPlan(nodes, edges, oldNodeIds, newNodeIds, newEdgeIds) {
  const nodesById = new Map(nodes.map(node => [node.id, node]));
  const nodePlan = {};
  const sortedNew = [...newNodeIds]
    .map(id => nodesById.get(id))
    .filter(Boolean)
    .sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));

  let maxDelay = 0;
  sortedNew.forEach((node, index) => {
    const parentId = bestParentForNode(node.id, edges, oldNodeIds, newNodeIds);
    const delay = 120 + index * 105;
    maxDelay = Math.max(maxDelay, delay);
    nodePlan[node.id] = {
      delay,
      duration: 560,
      fromId: parentId,
    };
  });

  const edgePlan = {};
  edges.forEach((edge, index) => {
    if (!newEdgeIds.has(edge.id) && !newNodeIds.has(edge.a) && !newNodeIds.has(edge.b)) return;
    const childTiming = nodePlan[edge.b] || nodePlan[edge.a];
    edgePlan[edge.id] = {
      delay: Math.max(60, (childTiming?.delay ?? 80) - 45) + Math.min(index * 2, 40),
      duration: 440,
    };
  });

  return {
    mode: 'sync',
    duration: Math.max(900, maxDelay + 720),
    nodes: nodePlan,
    edges: edgePlan,
  };
}

function bestParentForNode(nodeId, edges, oldNodeIds, newNodeIds) {
  const candidates = [];
  for (const edge of edges) {
    if (edge.a !== nodeId && edge.b !== nodeId) continue;
    const other = edge.a === nodeId ? edge.b : edge.a;
    if (other === nodeId) continue;

    let score = Number(edge.strength || 0);
    if (edge.type === 'semantic_related') score += 3;
    else if (edge.type === 'contains') score += 2;
    else score += 1;

    if (oldNodeIds.has(other)) score += 2;
    if (!newNodeIds.has(other)) score += .4;
    candidates.push({ id: other, score });
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.id || Field.nodes.find(node => node.type === 'collection' && node.sourceType === 'workspace')?.id || null;
}

function showSyncFlash(message) {
  let flash = document.querySelector('#fieldSyncFlash');
  if (!flash) {
    flash = document.createElement('div');
    flash.id = 'fieldSyncFlash';
    flash.className = 'sync-flash';
    document.querySelector('.graph-shell').appendChild(flash);
  }
  flash.textContent = message;
  requestAnimationFrame(() => flash.classList.add('show'));
  clearTimeout(showSyncFlash.timer);
  showSyncFlash.timer = setTimeout(() => flash.classList.remove('show'), 2200);
}

function restoreDemo() {
  liveMode = false;
  currentUser = null;
  currentUserState = null;
  syncing = false;
  Field.stopRevealAnimation();
  Field.nodes.splice(0, Field.nodes.length, ...clone(demoNodes));
  Field.edges.splice(0, Field.edges.length, ...clone(demoEdges));
  resetExplorerForDataset();

  document.body.classList.remove('field-live');
  fieldStatus.textContent = 'DEMO';
  accountButton.classList.remove('connected');
  accountLabel.textContent = 'Connect Relay';
  accountEmail.textContent = 'Not connected';
  demoBanner.hidden = false;
  syncButton.hidden = true;
  hideBuildExperience();
  nodeDialogMode.textContent = 'DEMO FIELD NODE';
  nodeDialogFootnote.textContent = 'Demo nodes stay in this browser until you connect Relay.';
}

function setLiveUi(user, nodeCount, edgeCount, built) {
  document.body.classList.add('field-live');
  fieldStatus.textContent = 'LIVE';
  accountButton.classList.add('connected');
  accountLabel.textContent = shortIdentity(user.email);
  accountEmail.textContent = user.email || 'Relay account';
  demoBanner.hidden = true;
  syncButton.hidden = !built;
  nodeDialogMode.textContent = 'LIVE FIELD NODE';
  nodeDialogFootnote.textContent = 'This node will be stored in your private Field account.';
  document.querySelector('#viewTitle').textContent = `${nodeCount} nodes · ${edgeCount} relationships`;
}

function setConnectionState(label) {
  fieldStatus.textContent = label;
  accountLabel.textContent = label === 'CONNECTING'
    ? 'Connecting…'
    : label === 'SYNCING'
      ? 'Syncing…'
      : currentUser?.email
        ? shortIdentity(currentUser.email)
        : 'Connect Relay';
}

function showConnectionError(message) {
  restoreDemo();
  fieldStatus.textContent = 'ERROR';
  const copy = demoBanner.querySelector('span');
  copy.innerHTML = `<strong>Connection failed</strong> · ${escapeForUi(message)}`;
}

function shortIdentity(email) {
  if (!email) return 'Relay account';
  const local = email.split('@')[0] || email;
  return local.length > 18 ? local.slice(0, 17) + '…' : local;
}

function escapeForUi(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character]));
}

async function createLiveNode(event) {
  if (!liveMode || !currentUser) return;
  event.preventDefault();
  event.stopImmediatePropagation();

  const title = document.querySelector('#nodeTitle').value.trim();
  if (!title) return;

  const type = document.querySelector('#nodeType').value;
  const cluster = document.querySelector('#nodeCluster').value.trim();
  const summary = document.querySelector('#nodeSummary').value.trim() || 'User-created Field node.';
  const sourceId = crypto.randomUUID();

  const { data: node, error } = await supabase
    .from('field_nodes')
    .insert({
      user_id: currentUser.id,
      type,
      title: title.slice(0, 240),
      searchable_text: `${title}\n${summary}`,
      source_product: 'field',
      source_id: sourceId,
      source_type: 'manual',
      metadata: cluster ? { cluster } : {},
    })
    .select('id')
    .single();

  if (error || !node) {
    console.error('Live Field node creation failed', error);
    alert('Field could not save that node.');
    return;
  }

  let contentKind = 'text';
  let structuredContent = {};
  if (type === 'todo') {
    contentKind = 'todo';
    structuredContent = { title, completed: false, due_on: null, position: 0 };
  }

  const { error: contentError } = await supabase.from('field_node_content').insert({
    node_id: node.id,
    user_id: currentUser.id,
    content_kind: contentKind,
    text_content: summary,
    structured_content: structuredContent,
  });

  if (contentError) console.warn('Field node content could not be saved', contentError);

  await supabase.from('field_source_preferences').upsert({
    user_id: currentUser.id,
    source_product: 'field',
    source_type: 'manual',
    indexed: true,
    ravin_read: document.querySelector('#nodeRavin').checked,
    external_ai_read: false,
    allow_writeback: true,
  }, { onConflict: 'user_id,source_product,source_type' });

  Field.closeNodeDialog();
  await syncFieldNow({ selectNodeId: node.id });
}

Field.nodeForm.addEventListener('submit', event => {
  if (!liveMode) return;
  void createLiveNode(event);
}, true);

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' && liveMode) restoreDemo();
  if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user && !liveMode && !loadingAccount) {
    void loadLiveAccount(session.user);
  }
});

void (async function initializeAccount() {
  await consumeRelayHandoff();
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    await loadLiveAccount(session.user);
  } else {
    restoreDemo();
  }
})();
