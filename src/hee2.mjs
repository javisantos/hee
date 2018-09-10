import http2 from 'http2'
import EventEmitter from 'events'
import uuidv4 from 'uuid/v4'
import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
// import {getSchema, flatten, unflatten} from './lib/utils'
import {CouchDB} from './adapters'

// Dependencies
import mime from 'mime-types'

// Fancy console
import chalk from 'chalk'
import gradient from 'gradient-string'
import icon from 'log-symbols'
const log = console.log

var keys = new Map()

class HttpEventEmitter extends EventEmitter {
  constructor(port, options) {
    super()
    let hee = gradient.summer.multiline(
      [
        
        '( )_( )( ___)( ___)',
        ' ) _ (  )__)  )__) ',
        '(_) (_)(____)(____) v' + process.env.npm_package_version,
        '',
      ].join('\n')
    )

    log(hee)
    this.env = process.env.NODE_ENV || 'development'
    this.encoding =
      typeof options.encoding === 'function' ? options.encoding : 'json'
    this.port = typeof port === 'number' ? port : 8443
    this.publicPath = options.publicPath ? options.publicPath : './public'
    const server = http2.createSecureServer({
      key: fs.readFileSync('./keys/localhost-privkey.pem'),
      cert: fs.readFileSync('./keys/localhost-cert.pem'),
    })
    log(
      icon.success,
      `Server listening on ${chalk.underline.green(
        `https://localhost:${this.port}`
      )} in ${chalk.black.bgWhite(` ${this.env} `)} mode`
    )

    server.on('stream', this.onStream.bind(this))
    // server.on('timeout', () => log(`Inactivity timeout...`))
    // server.on('request', this.onRequest.bind(this))
    server.on('listening', () => super.emit('listening', server.address()))
    server.listen(port, '0.0.0.0', () => super.emit('ready'))
  }

  parse(data) {
    switch (this.encoding) {
      case 'json':
        return JSON.parse(data)
      default:
        return this.encoding(data)
    }
  }

  async onStream(stream, headers) {
    stream.on('error', e => {
      log(icon.error, `[STREAM ${stream.id}]`, e)
    })
    if (headers[':path'] === '/') {
      stream.respond({
        ':status': 200,
      })
      stream.end('Http Event Emitter')
      return
    }
    let commonHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, HEAD, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization',
    }
    log(icon.info, headers[':path'])
    var filePath =
      headers[':path'].indexOf('.') > 0
        ? path.join(this.publicPath, headers[':path'])
        : null

    if (filePath && fs.existsSync(filePath)) {
      stream.respond(
        Object.assign({}, commonHeaders, {
          'Content-Type': mime.lookup(filePath),
          'Content-Encoding': 'gzip',
        })
      )

      fs.createReadStream(filePath)
        .pipe(zlib.createGzip())
        .pipe(stream)
    } else {
      let hash = headers[':path'].slice(1)
      this.db = new CouchDB(hash)

      if (headers[':method'] === 'POST') this.onPost(stream, headers)
      if (headers[':method'] === 'GET') this.onGet(stream, headers)
      if (headers[':method'] === 'PUT') this.onPut(stream, headers)
      if (headers[':method'] === 'HEAD') {
        await this.onHead(stream, headers)
        stream.end()
      }
      if (headers[':method'] === 'PATCH') this.onPatch(stream, headers)
      if (headers[':method'] === 'OPTIONS') {
        stream.respond(
          Object.assign({}, commonHeaders, {
            'Content-Length': '0',
            ':status': 200,
          })
        )
        stream.end()
      }
    }
  }

  async onGet(stream, headers) {
    let commonHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, HEAD, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization',
    }
    stream.respond(
      Object.assign({}, commonHeaders, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
        ':status': 200,
      })
    )

    let hash = headers[':path'].slice(1)

    let payload = `retry: 5000\nevent: ready\nid: ${uuidv4()}\ndata: `
    stream.write(Buffer.from(payload), payload.length)

    // TODO Abstraction for get data

    await this.onHead(stream, headers)

    stream.write(`\n\n`)

    const push = (array, value) => array.concat([value])
    const arrayAlloc = []
    keys.has(hash)
      ? keys.set(hash, push(keys.get(hash), stream))
      : keys.set(hash, push(arrayAlloc, stream))

    this.emit(stream.id, hash, {_type: 'subscribed'})
    super.emit('subscription', stream.id, hash)
  }

  onPost(stream, headers) {
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
          parsed._type = parsed.type
          this.emit(stream.id, hash, parsed)
          stream.respond({
            ':status': 202,
          })
          stream.end()
        } catch (e) {
          stream.respond({
            ':status': 400,
          })
          stream.end()
        }
      })
  }

  async onPut(stream, headers) {
    let hash = headers[':path'].slice(1)
    let body = ''
    // TODO createWriteStream
    // TODO Abstraction for put data

    stream
      .on('data', chunk => {
        body += chunk.toString()
      })
      .on('end', () => {
        try {
          var parsed = this.parse(body)
          // fs.writeFile(`./data/${hash}.json`, body, 'utf8', err => {
          //   if (err) throw new Error('Error saving')
          // })

          this.db.put(parsed)

          parsed._type = 'put'
          this.emit(stream.id, hash, parsed)

          stream.respond({
            ':status': 201,
          })
          stream.end()
          super.emit('put', Object.assign({data: parsed, hash}, {}))
        } catch (e) {
          log(icon.error, 'onPut', e)
          stream.respond({
            ':status': 400,
          })
          stream.end()
        }
      })
  }

  async onHead(stream, headers) {
    var self = this
    return new Promise(async (resolve, reject) => {
      try {
        // let hash = headers[':path'].slice(1)
        // fs.existsSync(`./data/${hash}.json`)
        // const rr = fs.createReadStream(`./data/${hash}.json`, {
        //   encoding: 'utf8',
        //   highWaterMark: 1024
        // })

        // for await (const chunk of rr) {
        //   stream.write(chunk)
        //   // log(getSchema(JSON.parse(chunk)))
        //   // log(flatten(JSON.parse(chunk)))
        //   // log(unflatten(flatten(JSON.parse(chunk))))
        // }

        var result = await self.db.get('state')
        try {
          stream.write(Buffer.from(JSON.stringify(result)))
        } catch (e) {
          log(icon.error, 'onHead', e)
        }

        resolve(result)
      } catch (e) {
        log(icon.error, 'onHead/Couchdb')
        stream.write(Buffer.from('{}'))
        resolve(null)
        // reject(e) as
      }
    })
  }

  onPatch(stream, headers) {
    // TODO modify only an attribute / merge
  }

  onRequest(req, res) {
    log(icon.info, 'REQUEST', req)
  }

  async emit(actor, hash, payload) {
    let UUID = uuidv4()

    var content = `actor: ${actor}\n${
      payload && payload._type ? `event: ${payload._type}` : `event: message`
    }\nid: ${UUID}\ndata: ${JSON.stringify(payload)}\n\n`

    if (keys.has(hash)) {
      await this.gc()
      keys.get(hash).forEach((stream, key) => {
        stream.write(Buffer.from(content), content.length)
      })
    }
  }

  async gc() {
    return new Promise(async (resolve, reject) => {
      try {
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
        resolve()
      } catch (e) {
        log(icon.error, 'gc', e)
        reject(e)
      }
    })
  }
}

export default HttpEventEmitter
