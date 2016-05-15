const sessions = {};

export async function get(id) {
  if (sessions[id]) {
    const session = JSON.parse(sessions[id]);
    if (session.contexts) {
      session.contexts.forEach(c => c.session = session);
    }
    return session;
  }
}

export async function save(session) {
  const _contexts = session.contexts.map(c => Object.assign({}, c, { session: "" }));
  const _session = Object.assign({}, session, { contexts: _contexts });
  sessions[_session.id] = JSON.stringify(_session);
}
