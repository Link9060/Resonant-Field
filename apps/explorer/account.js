import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.4';

const SUPABASE_URL = 'https://cnorozrjugxpanpfmssa.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_yVNPiB7opT0WRvBfKTZ2BA_s5bOQLRg';
const RELAY_CONNECT_URL = 'https://resonantrelay.org/connect-field/';
const PAGE_SIZE = 1000;

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

let liveMode = false;
let currentUser = null;
let loadingAccount = false;

function clone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
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

async function loadLiveAccount(user) {
  if (loadingAccount) return;
  loadingAccount = true;
  setConnectionState('SYNCING');

  try {
    const [rawNodes, rawEdges, rawContent, rawFiles, rawPreferences] = await Promise.all([
      fetchAll('field_nodes', 'id,user_id,type,title,searchable_text,source_product,source_id,source_type,metadata,created_at,updated_at', 'updated_at'),
      fetchAll('field_edges', 'id,user_id,source_node_id,target_node_id,relation_type,strength,origin,metadata,created_at,updated_at', 'updated_at'),
      optionalFetch('field_node_content', 'node_id,user_id,content_kind,text_content,structured_content,mime_type,preview_bucket_id,preview_object_path,preview_alt,updated_at'),
      optionalFetch('field_files', 'id,user_id,node_id,bucket_id,object_path,file_name,mime_type,size_bytes,extraction_status,created_at,updated_at'),
      optionalFetch('field_source_preferences', 'source_product,source_type,indexed,ravin_read,external_ai_read,allow_writeback'),
    ]);

    const contentByNode = new Map(rawContent.map(row => [row.node_id, row]));
    const fileByNode = new Map(rawFiles.map(row => [row.node_id, row]));
    const preferenceBySource = new Map(rawPreferences.map(row => [`${row.source_product}:${row.source_type}`, row]));
    const rawNodeById = new Map(rawNodes.map(row => [row.id, row]));
    const parentByNode = new Map();

    for (const edge of rawEdges) {
      if (edge.relation_type !== 'contains') continue;
      const parent = rawNodeById.get(edge.source_node_id);
      if (parent?.type === 'collection') parentByNode.set(edge.target_node_id, parent.title);
    }

    const positions = layoutLiveNodes(rawNodes, rawEdges);
    const prepared = rawNodes.map(row => {
      const content = contentByNode.get(row.id);
      const file = fileByNode.get(row.id);
      const preference = preferenceBySource.get(`${row.source_product}:${row.source_type}`);
      const position = positions.get(row.id) || { x: 0, y: 0 };
      const cluster = parentByNode.get(row.id) || collectionName(row) || sourceName(row);
      const node = {
        id: row.id,
        type: Field.labels[row.type] ? row.type : 'other',
        title: row.title || 'Untitled',
        summary: summarize(row.searchable_text) || defaultSummary(row),
        cluster,
        source: sourceName(row),
        ai: preference?.ravin_read === true,
        recent: freshness(row.updated_at),
        x: position.x,
        y: position.y,
        live: true,
        sourceProduct: row.source_product,
        sourceType: row.source_type,
        rawMetadata: row.metadata || {},
      };

      applyContent(node, content, file);
      return node;
    });

    await attachSignedPreviews(prepared, rawContent, rawFiles);

    const preparedEdges = rawEdges
      .filter(edge => rawNodeById.has(edge.source_node_id) && rawNodeById.has(edge.target_node_id))
      .map(edge => ({
        id: edge.id,
        a: edge.source_node_id,
        b: edge.target_node_id,
        strength: Number(edge.strength ?? .5),
        type: edge.relation_type || 'related',
        origin: edge.origin || 'system',
        live: true,
      }));

    Field.nodes.splice(0, Field.nodes.length, ...prepared);
    Field.edges.splice(0, Field.edges.length, ...preparedEdges);
    currentUser = user;
    liveMode = true;

    resetExplorerForDataset();
    setLiveUi(user, prepared.length, preparedEdges.length);
  } catch (error) {
    console.error('Field live account load failed', error);
    showConnectionError('Field connected your account, but could not load the graph.');
  } finally {
    loadingAccount = false;
  }
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

function layoutLiveNodes(rawNodes, rawEdges) {
  const result = new Map();
  const byId = new Map(rawNodes.map(row => [row.id, row]));
  const collectionChildren = new Map();

  for (const edge of rawEdges) {
    if (edge.relation_type !== 'contains') continue;
    const parent = byId.get(edge.source_node_id);
    if (parent?.type !== 'collection') continue;
    const list = collectionChildren.get(parent.id) || [];
    list.push(edge.target_node_id);
    collectionChildren.set(parent.id, list);
  }

  const workspace = rawNodes.find(row => row.type === 'collection' && row.source_type === 'workspace');
  if (workspace) result.set(workspace.id, { x: 0, y: 0 });

  const collections = rawNodes
    .filter(row => row.type === 'collection' && row.id !== workspace?.id)
    .sort((a, b) => String(a.title).localeCompare(String(b.title)));

  const collectionCenters = [
    { x: -280, y: -150 },
    { x: 280, y: -150 },
    { x: -280, y: 170 },
    { x: 280, y: 170 },
    { x: 0, y: -255 },
    { x: 0, y: 260 },
  ];

  collections.forEach((collection, index) => {
    const base = collectionCenters[index] || ringPoint(index - collectionCenters.length, 190 + 28 * Math.floor(index / 6));
    result.set(collection.id, base);

    const children = (collectionChildren.get(collection.id) || [])
      .map(id => byId.get(id))
      .filter(Boolean)
      .sort((a, b) => String(a.updated_at).localeCompare(String(b.updated_at)));

    children.forEach((child, childIndex) => {
      const angle = childIndex * 2.399963229728653;
      const radius = 58 + Math.sqrt(childIndex + 1) * 12.5;
      result.set(child.id, {
        x: base.x + Math.cos(angle) * radius,
        y: base.y + Math.sin(angle) * radius,
      });
    });
  });

  const remaining = rawNodes.filter(row => !result.has(row.id));
  remaining.forEach((row, index) => {
    const center = typeCenter(row.type);
    const angle = index * 2.399963229728653;
    const radius = 48 + Math.sqrt(index + 1) * 11;
    result.set(row.id, {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    });
  });

  return result;
}

function typeCenter(type) {
  if (type === 'note') return { x: -260, y: -110 };
  if (type === 'todo') return { x: 270, y: -80 };
  if (type === 'file') return { x: -250, y: 180 };
  if (type === 'calendar_event') return { x: 275, y: 180 };
  if (type === 'ravin_conversation' || type === 'memory') return { x: 0, y: -230 };
  return { x: 0, y: 235 };
}

function ringPoint(index, radius) {
  const angle = index * 2.399963229728653;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
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

function resetExplorerForDataset() {
  Field.state.selected = null;
  Field.state.hovered = null;
  Field.state.query = '';
  Field.state.view = 'all';
  Field.state.filters = new Set(Object.keys(Field.labels));

  document.querySelector('#searchInput').value = '';
  document.querySelector('#filters').innerHTML = '';
  document.querySelectorAll('.view-button').forEach(button => {
    button.classList.toggle('active', button.dataset.view === 'all');
  });

  Field.setupFilters();
  Field.setupFilterCounts();
  Field.syncFilterColors();
  Field.updateStats();
  Field.selectNode(null);
  Field.fitGraph();
}

function restoreDemo() {
  liveMode = false;
  currentUser = null;
  Field.nodes.splice(0, Field.nodes.length, ...clone(demoNodes));
  Field.edges.splice(0, Field.edges.length, ...clone(demoEdges));
  resetExplorerForDataset();

  document.body.classList.remove('field-live');
  fieldStatus.textContent = 'DEMO';
  accountButton.classList.remove('connected');
  accountLabel.textContent = 'Connect Relay';
  accountEmail.textContent = 'Not connected';
  demoBanner.hidden = false;
  nodeDialogMode.textContent = 'DEMO FIELD NODE';
  nodeDialogFootnote.textContent = 'Demo nodes stay in this browser until you connect Relay.';
}

function setLiveUi(user, nodeCount, edgeCount) {
  document.body.classList.add('field-live');
  fieldStatus.textContent = 'LIVE';
  accountButton.classList.add('connected');
  accountLabel.textContent = shortIdentity(user.email);
  accountEmail.textContent = user.email || 'Relay account';
  demoBanner.hidden = true;
  nodeDialogMode.textContent = 'LIVE FIELD NODE';
  nodeDialogFootnote.textContent = 'This node will be stored in your private Field account.';
  document.querySelector('#viewTitle').textContent = `${nodeCount} nodes · ${edgeCount} relationships`;
}

function setConnectionState(label) {
  fieldStatus.textContent = label;
  accountLabel.textContent = label === 'CONNECTING' ? 'Connecting…' : label === 'SYNCING' ? 'Syncing…' : 'Connect Relay';
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
  await loadLiveAccount(currentUser);
  Field.selectNode(node.id);
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
