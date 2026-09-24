'use strict';
/* A small, honest stand-in for a Mongoose Model, backed by a plain JS array.
   This sandbox has no network path to a real MongoDB instance, so this is
   how the real Express app + real controllers + real routes get exercised
   through genuine HTTP requests in tests. It intentionally does NOT
   reimplement Mongoose schema validation (required/enum/min/max) — every
   controller in this project validates its own inputs before touching the
   database for exactly this reason, so that safety net doesn't depend on
   the ODM. What it does implement is the query/update/aggregate surface
   this codebase actually calls, nothing more. */

let seedCounter = 0;
function fakeId() {
  seedCounter += 1;
  return (Date.now().toString(16) + seedCounter.toString(16).padStart(8, '0')).slice(0, 24).padEnd(24, '0');
}
function isIdLike(v) { return typeof v === 'string' && /^[0-9a-f]{24}$/i.test(v); }
function castError() { return Object.assign(new Error('Cast to ObjectId failed'), { name: 'CastError' }); }
function s(v) { return v === null || v === undefined ? v : String(v); }

function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

/** Evaluates the small subset of Mongo query operators this project actually uses. */
function matches(doc, filter) {
  return Object.entries(filter).every(([key, cond]) => {
    if (key === '$or') return cond.some(f => matches(doc, f));
    if (key === '$expr') return evalExpr(doc, cond.$expr ?? cond);
    const val = key === '_id' ? doc._id : getPath(doc, key);
    if (cond && typeof cond === 'object' && !(cond instanceof RegExp) && !Array.isArray(cond)) {
      return Object.entries(cond).every(([op, x]) => {
        switch (op) {
          case '$gte': return val !== undefined && val !== null && val >= x;
          case '$gt': return val !== undefined && val !== null && val > x;
          case '$lte': return val !== undefined && val !== null && val <= x;
          case '$lt': return val !== undefined && val !== null && val < x;
          case '$ne': return s(val) !== s(x);
          case '$in': return x.some(v => s(v) === s(val));
          default: return true;
        }
      });
    }
    if (cond instanceof RegExp) return cond.test(String(val ?? ''));
    if (key === '_id' || /Id$/.test(key)) return s(val) === s(cond);
    return val === cond;
  });
}
/* Only handles the one shape this codebase's $expr actually uses:
   { $gt: [ { $add: [ '$t', { $multiply: ['$durationMinutes', 60000] } ] }, X ] } */
function evalExpr(doc, expr) {
  const [a, b] = expr.$gt;
  const left = resolveExprVal(doc, a);
  const right = resolveExprVal(doc, b);
  return left > right;
}
function resolveExprVal(doc, v) {
  if (typeof v === 'string' && v.startsWith('$')) { const f = getPath(doc, v.slice(1)); return f instanceof Date ? f.getTime() : f; }
  if (v && v.$add) return v.$add.reduce((sum, x) => sum + resolveExprVal(doc, x), 0);
  if (v && v.$multiply) return v.$multiply.reduce((p, x) => p * resolveExprVal(doc, x), 1);
  return v;
}

/* A structural clone that preserves Date instances (unlike a JSON round-trip,
   which would silently turn every Date into a string — exactly the kind of
   thing that would make .getTime() calls in real controller code explode). */
function clone(x) {
  if (x === null || typeof x !== 'object') return x;
  if (x instanceof Date) return new Date(x.getTime());
  if (Array.isArray(x)) return x.map(clone);
  const out = {};
  for (const k in x) if (Object.prototype.hasOwnProperty.call(x, k)) out[k] = clone(x[k]);
  return out;
}

class FakeQuery {
  constructor(exec) { this._exec = exec; this._sort = null; this._limit = null; this._select = null; }
  sort(s) { this._sort = s; return this; }
  limit(n) { this._limit = n; return this; }
  select() { return this; }        // field projection isn't exercised meaningfully by our tests
  populate() { return this; }      // not used in controllers (we denormalize names instead)
  lean() { this._lean = true; return this; }
  session() { return this; }       // fake writes are already "atomic" (single-threaded array ops)
  async then(resolve, reject) { try { resolve(await this._run()); } catch (e) { reject(e); } }
  async _run() {
    let rows = await this._exec();
    if (this._sort) {
      const [[field, dir]] = Object.entries(this._sort);
      rows = [...rows].sort((a, b) => (getPath(a, field) > getPath(b, field) ? 1 : -1) * dir);
    }
    if (this._limit != null) rows = rows.slice(0, this._limit);
    return rows.map(r => wrapDoc(this._collection, r));
  }
}

function wrapDoc(collection, raw) {
  if (raw == null) return raw;
  const doc = clone(raw);
  Object.defineProperty(doc, '_id', { value: raw._id, enumerable: true, writable: true });
  doc.save = async function () {
    const idx = collection.rows.findIndex(r => r._id === doc._id);
    const toStore = { ...doc };
    delete toStore.save; delete toStore.toJSON;
    if (idx >= 0) collection.rows[idx] = clone(toStore); else collection.rows.push(clone(toStore));
    return wrapDoc(collection, toStore);
  };
  /* Deliberately no custom toJSON: JSON.stringify already omits function-
     valued properties (like .save above) on its own. A custom toJSON here
     would close over this specific object and go stale the moment a
     controller does `{...doc, extraField}` before res.json() — which
     several controllers do (e.g. attaching `stations` to a game, or
     `liveAmount` to a session) — silently dropping the new field. */
  return doc;
}

class FakeCollection {
  constructor(name, defaults = {}) { this.name = name; this.rows = []; this.defaults = defaults; }

  find(filter = {}) {
    const q = new FakeQuery(async () => this.rows.filter(r => matches(r, filter)));
    q._collection = this; return q;
  }
  findOne(filter = {}) { return this._single(filter); }
  findById(id) {
    if (id != null && !this.stringId && !isIdLike(String(id))) return Promise.reject(castError());
    return this._single({ _id: String(id) });
  }
  _single(filter) {
    const self = this;
    const p = (async () => { const row = self.rows.find(r => matches(r, filter)); return wrapDoc(self, row); })();
    p.session = () => p; p.lean = () => p; p.populate = () => p; p.select = () => p;
    return p;
  }
  async countDocuments(filter = {}) { return this.rows.filter(r => matches(r, filter)).length; }
  async estimatedDocumentCount() { return this.rows.length; }
  async exists(filter = {}) { return this.rows.some(r => matches(r, filter)) ? { _id: 'x' } : null; }

  async create(data, opts) {
    const many = Array.isArray(data);
    const items = many ? data : [data];
    /* Mirrors real Mongoose schema defaults (e.g. Station.status:'available',
       Customer.due:0) — the fake ODM has no schema to read these from, so
       each collection carries its own small defaults map, applied before
       the caller's own fields (which always win on conflict). */
    const created = items.map(item => { const row = { _id: fakeId(), ...clone(this.defaults), ...clone(item) }; this.rows.push(row); return wrapDoc(this, row); });
    return many ? created : created[0];
  }
  async insertMany(items) { return Promise.all(items.map(i => this.create(i))); }

  async findByIdAndUpdate(id, update, opts = {}) {
    if (!this.stringId && !isIdLike(String(id))) throw castError();
    return this._updateOne({ _id: String(id) }, update, opts);
  }
  async findOneAndUpdate(filter, update, opts = {}) { return this._updateOne(filter, update, opts); }
  async _updateOne(filter, update, opts) {
    let idx = this.rows.findIndex(r => matches(r, filter));
    if (idx < 0) {
      if (!opts.upsert) return null;
      const base = { _id: fakeId(), ...clone(this.defaults), ...flattenFilterForUpsert(filter) };
      this.rows.push(base); idx = this.rows.length - 1;
    }
    const row = this.rows[idx];
    applyUpdate(row, update);
    return opts.new === false ? clone(row) : wrapDoc(this, row);
  }
  async findByIdAndDelete(id) { const i = this.rows.findIndex(r => s(r._id) === s(id)); if (i < 0) return null; const [r] = this.rows.splice(i, 1); return wrapDoc(this, r); }
  async findOneAndDelete(filter) { const i = this.rows.findIndex(r => matches(r, filter)); if (i < 0) return null; const [r] = this.rows.splice(i, 1); return wrapDoc(this, r); }
  async deleteMany(filter = {}) { const before = this.rows.length; this.rows = this.rows.filter(r => !matches(r, filter)); return { deletedCount: before - this.rows.length }; }
  async updateOne(filter, update) { return this._updateOne(filter, update, {}); }

  /* Only supports what publicController.events needs: group by a field, count. */
  async aggregate(pipeline) {
    const group = pipeline.find(s => s.$group);
    if (!group) return [];
    const idField = group.$group._id.replace(/^\$/, '');
    const buckets = {};
    this.rows.forEach(r => { const k = s(getPath(r, idField)); buckets[k] = (buckets[k] || 0) + 1; });
    return Object.entries(buckets).map(([_id, n]) => ({ _id, n }));
  }

  reset() { this.rows = []; }
}
function flattenFilterForUpsert(filter) {
  const out = {};
  Object.entries(filter).forEach(([k, v]) => { if (typeof v !== 'object') out[k] = v; });
  return out;
}
function applyUpdate(row, update) {
  if (update.$inc) Object.entries(update.$inc).forEach(([k, v]) => { row[k] = (row[k] || 0) + v; });
  if (update.$set) Object.assign(row, update.$set);
  const plain = { ...update }; delete plain.$inc; delete plain.$set;
  if (Object.keys(plain).length) Object.assign(row, plain);
}

module.exports = { FakeCollection, fakeId, isIdLike };
