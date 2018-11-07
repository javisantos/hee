// Basic imports
import http2 from 'http2'
import EventEmitter from 'events'
import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import crypto from 'crypto'

import os from 'os'
// Dependencies
import mime from 'mime-types'
import Hyperjsondb from 'hyperjsondb'
import pem from 'https-pem'

// Fancy console
import chalk from 'chalk'
import gradient from 'gradient-string'
import icon from 'log-symbols'

const log = console.log
const keys = new Map()
const randomId = () => crypto.randomBytes(3 * 4).toString('base64')

const ifaces = os.networkInterfaces()

const commonHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, HEAD, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization'
}

class HttpEventEmitter extends EventEmitter {
  constructor (port, options) {
    super()

    let sayhee = gradient.summer.multiline(
      [
        '                   ',
        '( )_( )( ___)( ___)',
        ' ) _ (  )__)  )__) ',
        '(_) (_)(____)(____) v' + process.env.npm_package_version,
        ''
      ].join('\n')
    )

    log(sayhee)
    this.db = new Hyperjsondb('./db')
    this.db.on('change', (path, diff) => {
      super.emit('change', path, diff)
      this.emit('change', path, diff)
    })

    this.env = process.env.NODE_ENV || 'development'
    this.encoding =
      typeof options.encoding === 'function' ? options.encoding : 'json'
    this.port = typeof port === 'number' ? port : 8443
    this.publicPath = options.publicPath ? options.publicPath : './public'
    const server = http2.createSecureServer({
      ...pem,
      allowHTTP1: false
    })

    server.on('stream', this.onStream.bind(this))
    // server.on('timeout', () => log(`Inactivity timeout...`))
    // server.on('request', this.onRequest.bind(this))
    var self = this
    Object.keys(ifaces).forEach(ifname => {
      var alias = 0

      ifaces[ifname].forEach(iface => {
        if (iface.family !== 'IPv4' || iface.internal !== false) {
          return
        }

        log(
          icon.success,
          `Server listening on ${chalk.underline.green(
            `https://${iface.address}:${self.port}`
          )} (${ifname} ${alias}) in ${chalk.black.bgWhite(
            ` ${self.env} `
          )} mode`
        )

        ++alias
      })
    })
    server.on('listening', () => super.emit('listening', server.address()))
    server.listen(port, '0.0.0.0', () => super.emit('ready'))
  }

  parse (data) {
    switch (this.encoding) {
      case 'json':
        return JSON.parse(data)
      default:
        return this.encoding(data)
    }
  }

  async onStream (stream, headers) {
    // console.log(headers)
    stream.on('error', e => {
      log(icon.error, `[ERROR STREAM ${stream.id}]`, e)
    })
    stream.on('end', e => {
      // log(icon.error, `[END STREAM ${stream.id}]`)
    })
    stream.on('close', e => {
      var streams = keys.get(stream.path)
      if (streams) {
        streams.forEach(s => {
          if (s.id === stream.id) {
            var index = streams.indexOf(s)
            if (index > -1) {
              streams.splice(index, 1)
            }
          }
        })
      }
    })
    if (headers[':path'] === '/') {
      stream.respond({
        ':status': 200
      })
      stream.end('Http Event Emitter')
      return
    }
    // log(icon.info, headers[':path'])
    var filePath =
      headers[':path'].indexOf('.') > 0
        ? path.join(this.publicPath, headers[':path'])
        : null
    stream.path = headers[':path'].slice(1)
    if (filePath && fs.existsSync(filePath)) {
      stream.respond(
        Object.assign({}, commonHeaders, {
          'Content-Type': mime.lookup(filePath),
          'Content-Encoding': 'gzip'
        })
      )
      fs.createReadStream(filePath)
        .pipe(zlib.createGzip())
        .pipe(stream)
    } else {
      if (headers[':method'] === 'POST') this.onPost(stream, headers)
      if (headers[':method'] === 'GET') this.onGet(stream, headers)
      if (headers[':method'] === 'PUT') this.onPut(stream, headers)
      if (headers[':method'] === 'DELETE') this.onDelete(stream, headers)
      if (headers[':method'] === 'HEAD') {
        await this.get(stream, headers)
        stream.end()
      }
      if (headers[':method'] === 'PATCH') this.onPatch(stream, headers)
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
  }
  async onDelete (stream, headers) {
    let path = headers[':path'].slice(1)
    let body = ''

    stream
      .on('data', chunk => {
        body += chunk.toString()
      })
      .on('end', async () => {
        try {
          var parsed = this.parse(body)
          await this.db.remove(`/${path}`, parsed)
          log(icon.success, 'REMOVE', `${path}`, parsed)

          this.emit(stream.id, path, 'remove', parsed)

          stream.respond({
            ':status': 202
          })
          stream.end()

          super.emit('remove', Object.assign({ data: parsed, path }, {}))
        } catch (e) {
          log(icon.error, 'onDelete', e)
          stream.respond({
            ':status': 400
          })
          stream.end()
        }
      })
  }

  async onGet (stream, headers) {
    // TODO emit patches!
    let path = headers[':path'].slice(1)

    if (headers['content-type'] !== 'application/json') {
      stream.respond(
        Object.assign({}, commonHeaders, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'X-Accel-Buffering': 'no',
          ':status': 200
        })
      )
      stream.write(Buffer.from(`retry: 5000\nevent: ready\nid: ${randomId()}\n`))
      stream.write(Buffer.from(`version: ${await this.db.version}\n`))
      stream.write(Buffer.from(`schema: ${JSON.stringify(await this.db.schema(path))}\n`))
      stream.write(Buffer.from(`data: ${JSON.stringify(await this.db.get(`/${path}`))}\n\n`))

      const pushArray = (array, value) => array.concat([value])
      keys.has(path)
        ? keys.set(path, pushArray(keys.get(path), stream))
        : keys.set(path, pushArray([], stream))

      this.emit(stream.id, path, 'connection', {})
      super.emit('connection', stream.id, path)
    } else {
      stream.respond(
        Object.assign({}, commonHeaders, {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          ':status': 200
        })
      )
      var result = await this.db.get(`/${path}`)
      var res = result || {}
      stream.end(Buffer.from(JSON.stringify(res)))
    }
  }

  onPost (stream, headers) {
    let path = headers[':path'].slice(1)
    let body = ''
    stream
      .on('data', chunk => {
        body += chunk.toString()
        console.log('POST!', body)
      })
      .on('end', async () => {
        try {
          var parsed = this.parse(body)
          console.log('add', `/${path}`, parsed)
          await this.db.add(`/${path}`, parsed)
          super.emit('event', { data: parsed, path })
          parsed._type = parsed.type
          this.emit(stream.id, path, 'message', parsed)
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

  async onPut (stream, headers) {
    let path = headers[':path'].slice(1)
    let body = ''

    stream
      .on('data', chunk => {
        body += chunk.toString()
      })
      .on('end', async () => {
        try {
          var parsed = this.parse(body)
          await this.db.put(`/${path}`, parsed)
          log(icon.success, 'PUT', `${path}`, parsed)

          this.emit(stream.id, path, 'put', parsed)

          stream.respond({
            ':status': 201
          })
          stream.end()

          super.emit('put', Object.assign({ data: parsed, path }, {}))
        } catch (e) {
          log(icon.error, 'onPut', e)
          stream.respond({
            ':status': 400
          })
          stream.end()
        }
      })
  }

  onRequest (req, res) {
    res.end('Only http2 connections')
  }

  emit (actor, path, type, payload) {
    let UUID = randomId()

    var content = `actor: ${actor}\n${
      type ? `event: ${type}` : `event: message`
    }\nid: ${UUID}\ndata: ${JSON.stringify(payload)}\n\n`

    if (keys.has(path)) {
      keys.get(path).forEach(stream => {
        stream.write(Buffer.from(content), content.length)
      })
    }
  }
}

export default HttpEventEmitter
