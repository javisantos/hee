/* global EventSource fetch  */
import { MyBaseElement, html, helpers } from './my-base-element.mjs'

class MyHeeBaseElement extends MyBaseElement {
  constructor () {
    super()
    this.source = this.dataset.eventsource ? this.dataset.eventsource : null
    if (!this.source) {
      throw new Error('You need to define data-eventsource attribute')
    }
    if (!window.eventSources) window.eventSources = new Map()
  }

  static get is () {
    return 'my-hee-base-component'
  }

  onConnect () {
    if (this.source) this.initEventSource()
    window.addEventListener('beforeunload', event => {
      window.eventSources.get(this.source).close()
    })
    window.addEventListener('load', event => {})
    this.constructor.observedSSE.forEach(SSevent => {
      this.eventSource.addEventListener(
        SSevent.type,
        (handler = SSevent.handler) => {
          let SSeventCapitalized = `on${SSevent.type.replace(/^\w/, c =>
            c.toUpperCase()
          )}`
          if (typeof this[SSeventCapitalized] === 'function') {
            this[SSeventCapitalized](event)
          }
          if (typeof handler === 'function') handler(event)
        }
      )
    })
  }

  onDisconnect () {
    if (this.eventSource) this.eventSource.close()
  }

  initEventSource () {
    if (!window.eventSources.has(this.source)) {
      window.eventSources.set(this.source, new EventSource(this.source))
    }
    this.eventSource = window.eventSources.get(this.source)

    this.eventSource.onmessage = e => {
      // TODO Dispatch custom event
    }

    this.eventSource.onopen = e => {
      // TODO Dispatch custom event
      clearInterval(
        this.reconnectionInterval ? this.reconnectionInterval : null
      )
    }

    this.eventSource.onerror = e => {
      // TODO Dispatch custom event
    }

    this.eventSource.addEventListener('ready', () => {
      this.ready()
    })
  }

  emit (data) {
    fetch(`${this.source}`, {
      method: 'POST',
      mode: 'cors', // no-cors, cors, *same-origin
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
      .catch(error => console.error(`Fetch Error =\n`, error))
      .then(response => {})
  }

  put (data) {
    fetch(`${this.source}`, {
      method: 'PUT',
      mode: 'cors', // no-cors, cors, *same-origin
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
      .catch(error => console.error(`Fetch Error =\n`, error))
      .then(response => {})
  }
}

export { MyHeeBaseElement, html, helpers }
