import couchdbNano from 'nano'

var nano1 = couchdbNano(
  `http://${process.env.COUCHDB_USER}:${process.env.COUCHDB_PASSWORD}@${
    process.env.COUCHDB_HOST
  }:${process.env.COUCHDB_PORT}`
)

class CouchDB {
  constructor(hash) {
    this.hash = hash
    console.log('COUCHDB_HOST', process.env.COUCHDB_HOST)
    // this.create(hash)
  }
  async create(hash) {
    await nano1.db.create(hash)
  }

  async put(doc) {
    var prevDoc = await this.get(doc._id)

    if (prevDoc) {
      doc._rev = prevDoc._rev
    }

    delete doc._type
    await nano1.use(this.hash).insert(doc)
  }

  async get(id, params = {}) {
    let db = nano.use(this.hash)
    try {
      return await db.get(id, params)
    } catch (error) {
      return null
    }
  }
}

export default CouchDB
