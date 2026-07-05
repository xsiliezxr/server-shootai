require('dotenv').config();
const axios = require('axios');

const BASE = process.env.API_BASE || 'http://localhost:3000/api';
const DEMO_EMPRESA_ID =
  process.env.DEMO_EMPRESA_ID || '520d6f4f-7dec-4821-9b17-2f54e35772fd';

const results = [];

const record = (name, ok, status, detail) => {
  results.push({ name, ok, status, detail });
  const tag = ok ? 'OK' : 'FAIL';
  console.log(`[${tag}] ${name} (${status}) — ${detail}`);
};

const run = async () => {
  let testProjectId;
  let reqProjectId;

  try {
    const health = await axios.get(`${BASE}/health`);
    record('GET /health', health.data.success, 200, health.data.data.status);
  } catch (e) {
    record('GET /health', false, e.response?.status || 'ERR', e.message);
    process.exitCode = 1;
    return;
  }

  try {
    const emp = await axios.get(`${BASE}/empresas`);
    record('GET /empresas', emp.data.success, 200, `count=${emp.data.data.length}`);
  } catch (e) {
    record('GET /empresas', false, e.response?.status, e.response?.data?.error?.message);
  }

  try {
    const emp = await axios.get(`${BASE}/empresas/${DEMO_EMPRESA_ID}`);
    record('GET /empresas/:id', emp.data.success, 200, emp.data.data.name);
  } catch (e) {
    record('GET /empresas/:id', false, e.response?.status, e.response?.data?.error?.message);
  }

  try {
    const cli = await axios.get(`${BASE}/clientes`);
    record('GET /clientes', cli.data.success, 200, `count=${cli.data.data.length}`);
  } catch (e) {
    record('GET /clientes', false, e.response?.status, e.response?.data?.error?.message);
  }

  try {
    const cli = await axios.post(`${BASE}/clientes`, {
      empresaId: DEMO_EMPRESA_ID,
      name: 'Cliente Test Endpoints',
      phone: '+5215512345678',
    });
    record('POST /clientes', cli.data.success, 201, cli.data.data._id);
  } catch (e) {
    record('POST /clientes', false, e.response?.status, e.response?.data?.error?.message);
  }

  try {
    const proj = await axios.post(`${BASE}/projects`, {
      name: 'Smoke test endpoints',
      empresaId: DEMO_EMPRESA_ID,
    });
    testProjectId = proj.data.data._id;
    record('POST /projects', proj.data.success, 201, testProjectId);
  } catch (e) {
    record('POST /projects', false, e.response?.status, e.response?.data?.error?.message);
  }

  try {
    const p = await axios.get(`${BASE}/projects/${testProjectId}`);
    record('GET /projects/:id', p.data.success, 200, p.data.data.name);
  } catch (e) {
    record('GET /projects/:id', false, e.response?.status, e.response?.data?.error?.message);
  }

  try {
    const p = await axios.patch(`${BASE}/projects/${testProjectId}`, { status: 'draft' });
    record('PATCH /projects/:id', p.data.success, 200, p.data.data.status);
  } catch (e) {
    record('PATCH /projects/:id', false, e.response?.status, e.response?.data?.error?.message);
  }

  try {
    const cat = await axios.get(`${BASE}/catalog`, {
      params: { empresaId: DEMO_EMPRESA_ID, limit: 3 },
    });
    record('GET /catalog', cat.data.success, 200, `count=${cat.data.data.length}`);
  } catch (e) {
    record('GET /catalog', false, e.response?.status, e.response?.data?.error?.message);
  }

  try {
    const req = await axios.post(`${BASE}/requirements`, {
      freeText: 'Look streetwear casual para smoke test',
    });
    reqProjectId = req.data.data.projectId;
    record('POST /requirements', req.data.success, 201, reqProjectId);
  } catch (e) {
    record('POST /requirements', false, e.response?.status, e.response?.data?.error?.message);
  }

  try {
    const proc = await axios.post(`${BASE}/requirements/${reqProjectId}/process`, {
      limit: 3,
    });
    record(
      'POST /requirements/:id/process',
      proc.data.success && proc.data.data.count > 0,
      200,
      `garments=${proc.data.data.count}`
    );
  } catch (e) {
    record(
      'POST /requirements/:id/process',
      false,
      e.response?.status,
      e.response?.data?.error?.message
    );
  }

  try {
    const plan = await axios.post(`${BASE}/requirements/${reqProjectId}/shoot-plan`, {});
    record(
      'POST /requirements/:id/shoot-plan',
      plan.data.success && plan.data.data.poses?.length > 0,
      200,
      `poses=${plan.data.data.poses.length}`
    );
  } catch (e) {
    record(
      'POST /requirements/:id/shoot-plan',
      false,
      e.response?.status,
      e.response?.data?.error?.message
    );
  }

  try {
    const sm = await axios.post(`${BASE}/style-match`, {
      freeText: 'Look casual smart-casual',
      limit: 3,
    });
    record(
      'POST /style-match',
      sm.data.success && sm.data.data.count > 0,
      201,
      `garments=${sm.data.data.count}`
    );
  } catch (e) {
    record('POST /style-match', false, e.response?.status, e.response?.data?.error?.message);
  }

  try {
    const fm = await axios.post(`${BASE}/fashion-matcher`, {
      projectId: reqProjectId,
      limit: 3,
    });
    record(
      'POST /fashion-matcher',
      fm.data.success,
      200,
      `count=${fm.data.data.count}`
    );
  } catch (e) {
    record('POST /fashion-matcher', false, e.response?.status, e.response?.data?.error?.message);
  }

  try {
    const cm = await axios.post(`${BASE}/catalog/color-match`, {
      empresaId: DEMO_EMPRESA_ID,
      baseColor: '#1a2b3c',
      limit: 3,
    });
    record('POST /catalog/color-match', cm.data.success, 200, `count=${cm.data.data.count}`);
  } catch (e) {
    record('POST /catalog/color-match', false, e.response?.status, e.response?.data?.error?.message);
  }

  try {
    const cd = await axios.post(`${BASE}/creative-dump`, {
      projectId: testProjectId,
      freeText: 'Minimal editorial test',
    });
    record('POST /creative-dump', cd.data.success, 201, 'tags extracted');
  } catch (e) {
    record('POST /creative-dump', false, e.response?.status, e.response?.data?.error?.message);
  }

  try {
    const wa = await axios.post(`${BASE}/whatsapp/webhook`, {
      projectId: reqProjectId,
      from: '+5215512345678',
      type: 'message',
      message: { text: 'Hola test' },
    });
    record('POST /whatsapp/webhook', wa.data.data.received, 200, 'mock');
  } catch (e) {
    record('POST /whatsapp/webhook', false, e.response?.status, e.response?.data?.error?.message);
  }

  try {
    const wa = await axios.post(`${BASE}/whatsapp/send`, {
      projectId: reqProjectId,
      to: '+5215512345678',
      type: 'message',
      payload: { text: 'Test' },
    });
    record('POST /whatsapp/send', wa.data.data.sent, 200, 'mock');
  } catch (e) {
    record('POST /whatsapp/send', false, e.response?.status, e.response?.data?.error?.message);
  }

  try {
    const wa = await axios.post(`${BASE}/whatsapp/send-analysis`, {
      projectId: reqProjectId,
      to: '+5215512345678',
    });
    record('POST /whatsapp/send-analysis', wa.data.data.sent, 200, 'ok');
  } catch (e) {
    record(
      'POST /whatsapp/send-analysis',
      false,
      e.response?.status,
      e.response?.data?.error?.message
    );
  }

  try {
    const exp = await axios.get(`${BASE}/projects/${reqProjectId}/export`);
    record('GET /projects/:id/export', exp.data.success, 200, 'exported');
  } catch (e) {
    record('GET /projects/:id/export', false, e.response?.status, e.response?.data?.error?.message);
  }

  try {
    await axios.post(`${BASE}/catalog/scrape`, {});
    record('POST /catalog/scrape', false, 400, 'expected validation error');
  } catch (e) {
    const msg = e.response?.data?.error?.message || '';
    record(
      'POST /catalog/scrape',
      e.response?.status === 400 && msg.length > 0,
      e.response?.status || 'ERR',
      'validates required fields'
    );
  }

  if (testProjectId) {
    try {
      await axios.delete(`${BASE}/projects/${testProjectId}`);
      record('DELETE /projects/:id', true, 200, 'deleted');
    } catch (e) {
      record('DELETE /projects/:id', false, e.response?.status, e.response?.data?.error?.message);
    }
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\nTOTAL: ${results.length} | OK: ${results.length - failed} | FAIL: ${failed}`);
  if (failed > 0) process.exitCode = 1;
};

run();
