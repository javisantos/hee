/* global helloMars  */
import { MyHeeBaseElement, html, helpers } from './my-hee-base-element.mjs'

class HelloPlanet extends MyHeeBaseElement {
  constructor () {
    super()
    this.noop() // Standard hack
  }

  noop () {}

  static get observedAttributes () {
    return ['greetings', 'planet', 'planetColor']
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
      greetings: 'Bye',
      planet: 'World'
    }
  }

  rendered () {
    var helloBtn = document.querySelector(HelloPlanet.is.toUpperCase()).shadowRoot.querySelector('#sayhello')
    helloBtn.addEventListener('click', (event) => this.onClick(event, 'sayhello'))
  }

  ready () {} // Minimal HeeBaseElement implementation

  onChangePlanet (e) {
    this.setState(JSON.parse(e.data))
  }

  onClick (event, id) {
    console.log(event)
    helpers.clickTarget(event, id, this)
  }

  helloMars (planet, planetColor) {
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
                    <button id="sayhello" onclick="${() => helloMars({planet: this.state.otherPlanet, planetColor: 'red'})}"> <slot name="buttonText">{{buttonText}}</slot> </button>
                </div>

                `
  }
}

MyHeeBaseElement.define(HelloPlanet.is, HelloPlanet)
