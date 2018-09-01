import http2 from 'http2'
import EventEmitter from 'events'
import uuidv4 from 'uuid/v4'
import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import mime from 'mime-types'
// Console unicorns
import chalk from 'chalk'
import gradient from 'gradient-string'
import icon from 'log-symbols'
const log = console.log

var keys = new Map()

class HttpEventEmitter extends EventEmitter {
  constructor (port, options) {
    super()
    let duck = gradient.summer.multiline(
      [
        ' _   _  ____  ____ ',
        '( )_( )( ___)( ___)',
        ' ) _ (  )__)  )__) ',
        '(_) (_)(____)(____)',
        ''
      ].join('\n')
    )

    log(duck)
    this.env = process.env.NODE_ENV || 'development'
    this.encoding = typeof options.encoding === 'string'
      ? options.encoding
      : 'json'
    this.port = typeof port === 'number' ? port : 8443
    this.publicPath = options.publicPath ? options.publicPath : './public'
    const server = http2.createSecureServer({
      key: fs.readFileSync('./keys/localhost-privkey.pem'),
      cert: fs.readFileSync('./keys/localhost-cert.pem')
    })
    log(
      icon.success,
      `Server listening on ${chalk.underline.green(`https://localhost:${this.port}`)} in ${chalk.black.bgWhite(` ${this.env} `)} mode`
    )

    server.on('stream', this.onStream.bind(this))
    server.on('timeout', () => log(`Inactivity timeout...`))
    server.on('request', this.onRequest.bind(this))
    server.on('listening', () => this.emit('listening', server.address()))
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

  onStream (stream, headers) {
    if (headers[':path'] === '/favicon.ico') {
      stream.respond({
        ':status': 200
      })
      stream.end('Page not found')
      return
    }

    if (headers[':path'] === '/') {
      stream.respond({
        ':status': 200
      })
      stream.end('Http Event Emitter')
      return
    }
    let commonHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization'
    }

    var filePath = headers[':path'].indexOf('.') > 0
      ? path.join(this.publicPath, headers[':path'])
      : null

    if (filePath && fs.existsSync(filePath)) {
      stream.respond(
        Object.assign({}, commonHeaders, {
          'Content-Type': mime.lookup(filePath),
          'Content-Encoding': 'gzip'
        })
      )

      fs.createReadStream(filePath).pipe(zlib.createGzip()).pipe(stream)
    } else {
      if (headers[':method'] === 'POST') this.onEvent(stream, headers)
      if (headers[':method'] === 'GET') this.onSubscription(stream, headers)
      if (headers[':method'] === 'OPTIONS') {
        stream.respond(
          Object.assign({}, commonHeaders, {
            'Content-Length': '0',
            ':status': 200
          })
        )
        stream.end()
      }
    }
    super.emit('append', headers[':path'])
  }

  onSubscription (stream, headers) {
    let commonHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization'
    }
    let hash = headers[':path'].slice(1)
    let UUID = uuidv4()
    let payload = `retry: 5000\nevent: ready\nid: ${UUID}\ndata: {}\n\n`

    stream.respond(
      Object.assign({}, commonHeaders, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
        ':status': 200
      })
    )
    stream.write(Buffer.from(payload), payload.length)
    const push = (array, value) => array.concat([value])
    const arrayAlloc = []
    keys.has(hash)
      ? keys.set(hash, push(keys.get(hash), stream))
      : keys.set(hash, push(arrayAlloc, stream))

    // var ip = (req.headers['x-forwarded-for'] || '').split(',').pop() ||
    //   req.connection.remoteAddress ||
    //   req.socket.remoteAddress ||
    //   req.connection.socket.remoteAddress

    super.emit('subscription', hash)
    this.emit(hash, {type: 'subscription'})
  }

  onEvent (stream, headers) {
    let hash = headers[':path'].slice(1)
    let body = ''
    stream
      .on('data', chunk => {
        body += chunk.toString()
      })
      .on('end', () => {
        try {
          var parsed = this.parse(body)
          super.emit('event', Object.assign({data: parsed, hash}, {}))
          this.emit(hash, parsed)
          stream.respond({
            ':status': 202
          })
          stream.end()
        } catch (e) {
          stream.respond({
            ':status': 400
          })
          stream.end()
        }
      })
  }

  onRequest (req, res) {
    // console.log('REQUEST?', req)
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
    keys.forEach((streams, key) => {
      if (streams.length === 0) {
        keys.delete(key)
      }
      streams.forEach(stream => {
        if (stream.closed) {
          var index = streams.indexOf(stream)
          if (index > -1) {
            streams.splice(index, 1)
          }
        }
      })
    })
  }
}

export default HttpEventEmitter
