/* global HTMLElement customElements EventSource fetch no-new-func */
class Component extends HTMLElement {
  constructor () {
    super()
    this.source = this.dataset.eventsource ? this.dataset.eventsource : null
    if (!window.eventSources) window.eventSources = new Map()
    this.state = this.initialState
    var style = document.createElement('style')
    var template = document.createElement('template')
    style.textContent = this.style
    template.innerHTML = this.template

    this.shadow = this.attachShadow({
      mode: 'open'
    })
    this.shadow.appendChild(template.content)
    this.shadow.appendChild(style.cloneNode(true))
  }

  static define (name, child) {
    try {
      customElements.define(name, child)
    } catch (err) {
      console.log(err)
      const h3 = document.createElement('h3')
      h3.innerHTML = "This site uses webcomponents which don't work in all browsers! Try this site in a browser that supports them!"
      document.body.innerHTML(h3)
    }
  }

  rendered () { /* Called each time component is rendered */ }
  ready () { /* Called when eventsource ready is fired. */ }

  static get observedAttributes () {}
  get initialState () {
    return {} /* Called in constructor. */
  }
  get style () {
    return '' /* Called when eventsource ready is fired. */
  }
  get template () {
    return `[Empty Template]` /* Define a literal template. */
  }

  connectedCallback () {
    this.render()
    this.connected = true
    if (this.source) this.initEventSource()
    this.addEventListener('click', (e) => {
      var comingFunc = e.path[0].attributes['onclick'].value

      var funcName = comingFunc.substring(comingFunc.indexOf(' ') + 1, comingFunc.lastIndexOf('('))
      var thisFunc = this[`${funcName}`].toString()
      var thisFuncBody = thisFunc.substring(thisFunc.indexOf('{') + 1, thisFunc.lastIndexOf('}'))
      var thisFuncVars = thisFunc.substring(thisFunc.indexOf('(') + 1, thisFunc.indexOf(')'))
      var comingFuncVars = comingFunc.substring(comingFunc.lastIndexOf('{') + 1, comingFunc.lastIndexOf('}')).split(',').map(x => x.split(':').map(y => y.trim()))
        .reduce((a, x) => {
          a[x[0]] = x[1].substring(x[1].indexOf("'") + 1, x[1].lastIndexOf("'"))
          return a
        }, {})

      var args = Object.keys(comingFuncVars).map((k) => comingFuncVars[k])

      this.exec = new Function(thisFuncVars, thisFuncBody) // TODO: Look for a better solution
      this.exec(...args.reverse())
    })
  }

  render () {
    console.log('RENDERING', this.state)
    this.shadow.querySelectorAll('DIV')[0].innerHTML = this.template
    this.rendered()
  }

  initEventSource () {
    if (!window.eventSources.has(this.source)) {
      window.eventSources.set(this.source, new EventSource(this.source))
    }
    this.eventSource = window.eventSources.get(this.source)

    this.eventSource.onmessage = (e) => {
      console.log('message', e)
    }

    this.eventSource.onopen = () => {
      console.log('Event Source Open')
    }

    this.eventSource.addEventListener('ready', () => {
      this.ready()
    })
  }

  setState (data, shouldRender) {
    const newState = Object.assign({}, this.state, data)
    this.state = newState
    if (shouldRender || this.connected) this.render()
  }

  postState (data) {
    if (!this.source) throw new Error('You need to define data-source to POST events')
    fetch(`${this.source}`, {
      method: 'POST',
      mode: 'cors', // no-cors, cors, *same-origin
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
      .catch(error => console.error(`Fetch Error =\n`, error))
  // .then(response => console.log('Success:', response))
  }

  disconnectedCallback () {
    this.eventSource.close()
  }

  attributeChangedCallback (attrName, oldVal, newVal) {
    const attrs = {}
    attrs[attrName] = newVal
    this.setState(attrs)
  }
}

const html = (literals, ...substitutions) => {
  let result = ''

  // run the loop only for the substitution count
  for (let i = 0; i < substitutions.length; i++) {
    if (typeof substitutions[i] === 'function') {
      console.log(substitutions[i])
    }
    result += literals.raw[i]
    result += substitutions[i]
  }

  // add the last literal
  result += literals[literals.length - 1]

  return result
}

export { Component, html }
