'use strict';

const assert = require('assert');
const demoSession = require('../lib/demo_session');

const originalNodeEnv = process.env.NODE_ENV;
const originalDemoSessions = process.env.UTOPLAN_DEMO_SESSIONS;

assert.deepStrictEqual(demoSession.SUPPORTED_SESSION_QUERY_PARAMS, ['session']);
assert.deepStrictEqual(demoSession.parseSessionQuery(new URLSearchParams('session=demo-session-1')), {
  ok: true,
  query: {
    session: 'demo-session-1'
  },
  error: null
});
assert.strictEqual(demoSession.parseSessionQuery(new URLSearchParams('')).ok, false);
assert.strictEqual(demoSession.parseSessionQuery(new URLSearchParams('session=x')).ok, false);
assert.strictEqual(demoSession.parseSessionQuery(new URLSearchParams('session=demo-session-1&extra=true')).ok, false);
assert.strictEqual(demoSession.selectSessionByPublicId(), [
  'SELECT public_id, display_name, municipality_id, category_id, profile',
  'FROM demo_sessions',
  'WHERE public_id = $1',
  'LIMIT 1'
].join(' '));

assert.deepStrictEqual(demoSession.sessionFromRow({
  public_id: 'demo-session-1',
  display_name: 'Demo planner',
  municipality_id: '1',
  category_id: 'professional_services',
  profile: '{"businessIdea":"Accounting services","planningStage":"explore"}'
}), {
  id: 'demo-session-1',
  displayName: 'Demo planner',
  selectedMunicipalityId: 1,
  selectedCategoryId: 'professional_services',
  profile: {
    businessIdea: 'Accounting services',
    planningStage: 'explore'
  }
});

assert.deepStrictEqual(demoSession.sessionFromRow({
  public_id: 'demo-session-2',
  display_name: 'Second planner',
  municipality_id: 2,
  category_id: 'food_services',
  profile: {
    businessIdea: 'Coffee shop',
    planningStage: 'compare'
  }
}).profile, {
  businessIdea: 'Coffee shop',
  planningStage: 'compare'
});

try {
  delete process.env.UTOPLAN_DEMO_SESSIONS;
  process.env.NODE_ENV = 'development';
  assert.strictEqual(demoSession.endpointEnabled(), true);

  process.env.NODE_ENV = 'production';
  assert.strictEqual(demoSession.endpointEnabled(), false);

  process.env.UTOPLAN_DEMO_SESSIONS = '1';
  assert.strictEqual(demoSession.endpointEnabled(), true);
} finally {
  if (originalNodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = originalNodeEnv;
  }

  if (originalDemoSessions === undefined) {
    delete process.env.UTOPLAN_DEMO_SESSIONS;
  } else {
    process.env.UTOPLAN_DEMO_SESSIONS = originalDemoSessions;
  }
}
