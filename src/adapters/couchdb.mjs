import couchdbNano from 'nano'

var nano = couchdbNano('http://admin:adminpass@localhost:5984')

class CouchDB {
  constructor (hash) {
    this.hash = hash
    // this.create(hash)
  }
  async create (hash) {
    await nano.db.create(hash)
  }

  async put (doc) {
    var prevDoc = await this.get(doc._id)

    if (prevDoc) {
      doc._rev = prevDoc._rev
    }

    delete doc._type
    await nano.use(this.hash).insert(doc)
  }

  async get (id, params = {}) {
    let db = nano.use(this.hash)
    try {
      return await db.get(id, params)
    } catch (error) {
      return null
    }
  }
}

export default CouchDB
