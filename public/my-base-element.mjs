/* global HTMLElement customElements */
class MyBaseElement extends HTMLElement {
  constructor () {
    super()

    this.state = Object.assign({}, this.state, this.initialState)
    this.loaded = false

    var style = document.createElement('style')
    var template = document.createElement('template')
    style.textContent = this.style
    template.innerHTML = this.template

    this.shadow = this.attachShadow({
      mode: 'open'
    })
    this.shadow.appendChild(style.cloneNode(true))
    this.shadow.appendChild(template.content)
  }

  static define (name, child) {
    try {
      customElements.define(name, child)
    } catch (err) {
      console.log(err)
      const h3 = document.createElement('h3')
      h3.innerHTML = "This site uses webcomponents which don't work in all browsers! Try this site in a browser that supports them!"
      document.body.appendChild(h3)
    }
  }

  /* Beginning of Implementation. */

  get initialState () { return {} /* Called in constructor [Object]. */ }

  static get observedAttributes () {
    return [] /* Array of observed attributes [Array].
    return ['greetings', 'planet', 'planetcolor']
    */
  }

  get observedEvents () {
    return [] /* Array of observed events [Array].
    return [{
      target: 'button[id=sayhello]',
      type: 'click',
      handler: () => this.helloMars(this.state.otherPlanet, 'red')
    }]

    eventHandler (event) {
      switch (event.type) {
        case 'click':
         break
        default:
          break
      }
    }
    on*[Type] (event) {}
    */
  }

  // Events
  onState () { /* Called when state changes (state). */ }
  onChange () { /* Called when attribute change (attrName, oldVal, newVal). */ }
  onRender () { /* Called when render(). */ }
  onConnect () { /* Called when connectedCallback(). */ }
  onDisconnect () { /* Called when disconnectedCallback. */ }

  // Rendering
  get style () {
    return `` /* Define a scoped/shadowed css. */
  }
  get template () {
    return `[Empty Template]` /* Define a literal template. */
  }

  /* End of Implementation. */

  connectedCallback () {
    this.onConnect()
    this.loaded = true
    var prestate = {}
    for (var attr in this.attributes) {
      prestate[this.attributes[attr].nodeName] = this.attributes[attr].value
    }
    this.setState(Object.assign({}, this.initialState, prestate), false)
  }

  disconnectedCallback () {
    this.onDisconnect()
  }

  render (initial = false) {
    if (!initial) {
      console.log('RENDER', this.state)
      this.shadow.querySelectorAll('DIV')[0].innerHTML = this.template
      this.setListeners(true)
    } else {
      console.log('RENDER INITIAL', this.state)
      this.setListeners(false)
    }

    this.onRender()
  }

  setListeners (remove) {
    if (remove) {
      this.observedEvents.forEach(evl => {
        this.shadow.querySelector(evl.target).removeEventListener(evl.type, evl.handler)
      })
    }
    this.observedEvents.forEach(evl => {
      var matches = this.shadow.querySelectorAll(evl.target)
      matches.forEach(item => {
        item.addEventListener(evl.type, (event, handler = evl.handler) => {
          let eventNameCapitalized = `on${evl.type.replace(/^\w/, c => c.toUpperCase())}`
          if (typeof this[eventNameCapitalized] === 'function') this[eventNameCapitalized](event)
          if (typeof this.eventHandler === 'function') this.eventHandler(event)
          if (typeof handler === 'function') handler(event)
        })
      })
    })
  }

  setState (data, shouldAddAttrs = true) {
    const newState = Object.assign({}, this.state, data)
    this.state = newState
    this.onState(this.state)
    if (shouldAddAttrs && this.loaded) {
      Object.entries(data).forEach((attr) => {
        this.setAttribute(attr[0], attr[1])
      })
    }
    this.render()
  }

  attributeChangedCallback (attrName, oldVal, newVal) {
    const attrs = {}
    attrs[attrName] = newVal
    console.log('Attr', attrName, oldVal , newVal)
    if (oldVal !== newVal && this.state[attrName] !== newVal && this.loaded) {
      this.setState(attrs)
      this.render()
    }
    this.onChange(attrName, oldVal, newVal)
  }
}

const html = (literals, ...substitutions) => {
  let result = ''

  for (let i = 0; i < substitutions.length; i++) {
    result += literals.raw[i]
    result += substitutions[i]
  }

  result += literals[literals.length - 1]

  return result
}

const execute = (stringFunction, context) => {
  var args = stringFunction.match('(?:{)(?:.*)(?:})')[0]
  var funcName = stringFunction.substring(stringFunction.indexOf('> ') + 2, stringFunction.lastIndexOf('('))

  const exec = (fstring, context) => {
    var namespaces = fstring.split('.').slice(1)
    var func = namespaces.pop()
    for (var i = 0; i < namespaces.length; i++) {
      context = context[namespaces[i]]
    }
    return context[func]
  }

  var argsToObject = args
    .substring(args.lastIndexOf('{') + 1, args.lastIndexOf('}'))
    .split(',')
    .map(x => x.split(':').map(y => y.trim()))
    .reduce((a, x) => {
      a[x[0]] = x[1].indexOf("'") === 0 ? x[1].substring(x[1].indexOf("'") + 1, x[1].lastIndexOf("'")) : exec(x[1], context)
      return a
    }, {})
  var argsObject = Object.keys(argsToObject).map((k) => argsToObject[k])
  if (typeof context[funcName] === 'function') {
    return context[funcName](...argsObject)
  } else {
    throw new Error(`The function ${funcName} in not defined.`)
  }
}

const getTarget = (event, id) => {
  event = event || window.event
  var e = {
    event: event,
    target: event.path ? event.path.find((each) => {
      return each.id === id
    }) : event.target
  }
  return e
}

const clickTarget = (event, id, context) => {
  var e = getTarget(event, id)
  var stringFunction = e.target.attributes['onclick'].value
  execute(stringFunction, context)
}

const helpers = {execute, getTarget, clickTarget}
export { MyBaseElement, html, helpers }
