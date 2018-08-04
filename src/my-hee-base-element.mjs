/* global EventSource fetch  */
import { MyBaseElement, html, helpers } from './my-base-element.mjs'

class MyHeeBaseElement extends MyBaseElement {
  constructor () {
    super()
    this.source = this.dataset.eventsource ? this.dataset.eventsource : null
    if (!this.source) throw new Error('You need to define data-eventsource attribute')
    if (!window.eventSources) window.eventSources = new Map()
    window.addEventListener('beforeunload', (event) => {
      window.eventSources.get(this.source).close()
    })
    window.addEventListener('load', (event) => {
    })
  }

  static get is () {
    return 'my-hee-base-component'
  }

  connected () {
    if (this.source) this.initEventSource()
    this.loaded = true
  }

  disconnected () {
    if (this.eventSource) this.eventSource.close()
  }

  initEventSource () {
    if (this.loaded) return
    if (!window.eventSources.has(this.source)) {
      window.eventSources.set(this.source, new EventSource(this.source))
    }
    this.eventSource = window.eventSources.get(this.source)

    this.eventSource.onmessage = (e) => {
      // TODO Dispatch custom event
    }

    this.eventSource.onopen = (e) => {
      // TODO Dispatch custom event

    }

    this.eventSource.onerror = (e) => {
      // TODO Dispatch custom event
    }

    this.eventSource.addEventListener('ready', () => {
      this.ready()
    })

    var oldAddEventListener = EventSource.prototype.addEventListener

    EventSource.prototype.addEventListener = function (eventName, scope) {
      oldAddEventListener.call(this, eventName, (event, bind = scope) => {
        let eventNameCapitalized = `on${eventName.replace(/^\w/, c => c.toUpperCase())}`
        if (typeof bind[eventNameCapitalized] === 'function') bind[eventNameCapitalized](event)
      })
    }

    this.constructor.observedSSE.forEach(event => {
      this.eventSource.addEventListener(event, this)
    })
  }

  postState (data) {
    fetch(`${this.source}`, {
      method: 'POST',
      mode: 'cors', // no-cors, cors, *same-origin
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
      .catch(error => console.error(`Fetch Error =\n`, error))
      .then(response => {
      })
  }
}

export { MyHeeBaseElement, html, helpers }
