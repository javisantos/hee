/* global helloMars  */
import { MyHeeBaseElement, html, helpers } from './my-hee-base-element.mjs'

class HelloPlanet extends MyHeeBaseElement {
  constructor () {
    super()
    document.querySelector(HelloPlanet.is.toUpperCase()).addEventListener('click', (event) => {
      if (event.originalTarget && event.originalTarget.attributes['onclick']) {
        this.onClick(event)
      }
      if (event.path && event.path[0].attributes['onclick']) {
        this.onClick(event)
      }
    })
  }

  static get observedAttributes () {
    return ['greetings', 'planet']
  }

  static get observedSSE () {
    return ['changePlanet']
  }

  static get is () {
    return 'my-helloplanet-hee-base-element'
  }

  get initialState () {
    return {
      otherPlanet: 'Mars  ',
      greetings: 'Hello',
      planet: 'World'
    }
  }

  rendered () {}

  ready () {}

  onChangePlanet (e) {
    this.setState(JSON.parse(e.data))
  }

  onClick (event) {
    var stringFunction = event.path ? event.path[0].attributes['onclick'].value : event.originalTarget.attributes['onclick'].value
    helpers.execute(stringFunction, this)
  }

  helloMars (planetColor, planet) {
    this.postState({type: 'changePlanet', planetColor, planet})
  }

  get style () {
    return (`
            :host {
            color: blue
            }
            .black {
            color: black
            }
            .red {
            color: red
            }
            .green {
            color: green
            }
            `)
  }

  get template () {
    return html`
                <div>
                <span class="black">${this.state.greetings}</span>
                <span class="${this.state.planetColor ? this.state.planetColor : 'blue'}">${this.state.planet}</span>
                <hr>
                <button id="sayhello" onclick="${() => helloMars({planet: this.state.otherPlanet, planetColor: 'red'})}"> Say hello to Mars</button>
                </div>

                `
  }
}

MyHeeBaseElement.define(HelloPlanet.is, HelloPlanet)
