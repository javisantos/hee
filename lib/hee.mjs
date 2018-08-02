import http from 'http'

import EventEmitter from 'events'
import uuidv4 from 'uuid/v4'

var keys = new Map()

class HttpEventEmitter extends EventEmitter {
  constructor (port = 8080) {
    super()
    if (typeof port !== 'number') throw new Error('Port must be a number')
    const server = http.createServer()
    server.on('request', this.onRequest.bind(this))
    server.listen(port)
  }

  onRequest (req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Authorization')
    if (req.method === 'POST') {
      this.onEvent(req, res)
    }
    if (req.method === 'GET') {
      this.onSubscription(req, res)
    }
    if (req.method === 'OPTIONS') {
      res.statusCode = 200
      res.setHeader('Content-Length', '0')

      res.setHeader('Content-Type', 'application/json')
      res.end()
    }
  }

  onSubscription (req, res) {
    this.emit('subscription', req.url)
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.write(Buffer.from(`\n`), 2)
    res.statusCode = 202
    const push = (array, value) => array.concat([value])
    const arrayAlloc = []
    keys.has(req.url) ? keys.set(req.url, push(keys.get(req.url), res)) : keys.set(req.url, push(arrayAlloc, res))
  }

  onEvent (req, res) {
    let body = ''
    req
      .on('data', (chunk) => {
        body += chunk.toString()
      })
      .on('end', () => {
        let UUID = uuidv4()
        let payload = ''
        let toEmit = {}
        try {
          payload = `id: ${UUID}\ndata: ${body}\n\n`
          toEmit = {
            id: UUID,
            data: JSON.parse(body)
          }
          res.statusCode = 201
          res.end()
        } catch (e) {
          payload = `id: ${UUID}\ndata: {}\n\n`
          toEmit = {
            id: UUID,
            data: {}
          }
          res.statusCode = 400
          res.end()
        }

        this.emit('event', Object.assign({
          path: req.url
        }, toEmit))

        this.broadcast(req.url, payload)
      })
  }

  broadcast (url, payload) {
    if (keys.has(url)) {
      keys.get(url).forEach((client, key) => {
        if (client.socket.ended) {
          var index = keys.get(url).indexOf(client)
          if (index > -1) {
            keys.get(url).splice(index, 1)
          }
        } else if (client.socket.writable) {
          client.write(Buffer.from(payload), payload.length)
        }
      })
    }
  }
}

export default HttpEventEmitter

// setInterval(function () {

//     keys.forEach((clients, key1) => {
//         console.log(`Key ${key1} with ${clients.length} subscribers.`)
//         clients.forEach((client, key2) => {
//             if (client.socket.ended) {
//                 var index = clients.indexOf(client)
//                 if (index > -1) {
//                     clients.splice(index, 1)
//                 }
//             }

//         })
//     })
// }, 15000)
