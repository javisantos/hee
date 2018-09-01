import http from 'http'
import EventEmitter from 'events'
import uuidv4 from 'uuid/v4'
import fs from 'fs'
import path from 'path'
import expose from './expose.js'
import zlib from 'zlib'
import mime from 'mime-types'

const {__dirname} = expose
var keys = new Map()

class HttpEventEmitter extends EventEmitter {
  constructor (port, encoding) {
    super()
    this.encoding = typeof encoding === 'string' ? encoding : 'json'
    this.port = typeof port === 'number' ? port : 8081
    const server = http.createServer()
    server.on('request', this.onRequest.bind(this))
    server.listen(port, () => super.emit('ready'))
  }

  parse (data) {
    switch (this.encoding) {
      case 'json':
        return JSON.parse(data)
      default:
        return JSON.parse(data)
    }
  }
  onRequest (req, res) {
    if (req.url === '/favicon.ico') {
      res.statusCode = 200 // really?
      res.end()
      return
    }

    if (req.url === '/') {
      res.statusCode = 200
      res.end('Http Event Emitter')
      return
    }

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Authorization')

    var filePath = req.url.indexOf('.') > 0 ? path.join(__dirname, './../public' + req.url) : null

    if (filePath && fs.existsSync(filePath)) {
      res.setHeader('Content-Type', mime.lookup(filePath))
      res.setHeader('Content-Encoding', 'gzip')
      var readStream = fs.createReadStream(filePath)
      readStream.pipe(zlib.createGzip()).pipe(res)
    } else {
      if (req.method === 'POST') this.onEvent(req, res)
      if (req.method === 'GET') this.onSubscription(req, res)
      if (req.method === 'OPTIONS') {
        res.setHeader('Content-Length', '0')
        res.statusCode = 200
        res.end()
      }
    }
    super.emit('append', req.url)
  }

  onSubscription (req, res) {
    let hash = req.url.slice(1)
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('X-Accel-Buffering', 'no')
    res.setHeader('Connection', 'keep-alive')
    let UUID = uuidv4()
    let payload = `retry: 5000\nevent: ready\nid: ${UUID}\ndata: {}\n\n`
    res.write(Buffer.from(payload), payload.length)
    res.statusCode = 200
    const push = (array, value) => array.concat([value])
    const arrayAlloc = []
    keys.has(hash) ? keys.set(hash, push(keys.get(hash), res)) : keys.set(hash, push(arrayAlloc, res))

    var ip = (req.headers['x-forwarded-for'] || '').split(',').pop() ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.connection.socket.remoteAddress

    super.emit('subscription', hash)
    this.emit(hash, {type: 'subscription', ip})
  }

  onEvent (req, res) {
    let hash = req.url.slice(1)
    let body = ''
    req
      .on('data', (chunk) => {
        body += chunk.toString()
      })
      .on('end', () => {
        try {
          var parsed = this.parse(body)
          super.emit('event', Object.assign({data: parsed, hash}, {}))
          this.emit(hash, parsed)
          res.statusCode = 202
          res.end()
        } catch (e) {
          res.statusCode = 400
          res.end()
        }
      })
  }

  emit (hash, payload) {
    let UUID = uuidv4()
    var content = `retry: 5000\n${payload.type ? `event: ${payload.type}` : `event: message`}\nid: ${UUID}\ndata: ${JSON.stringify(payload)}\n\n`
    if (keys.has(hash)) {
      this.gc()
      keys.get(hash).forEach((client, key) => {
        client.write(Buffer.from(content), content.length)
      })
    }
  }

  gc () {
    keys.forEach((clients, key1) => {
      if (clients.length === 0) keys.delete(key1)
      clients.forEach((client, key2) => {
        if (client.socket._readableState.ended) {
          var index = clients.indexOf(client)
          if (index > -1) {
            clients.splice(index, 1)
          }
        }
      })
    })
  }
}

export default HttpEventEmitter
