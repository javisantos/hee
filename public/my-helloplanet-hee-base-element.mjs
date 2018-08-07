/* global  */
import { MyHeeBaseElement, html } from './my-hee-base-element.mjs'

class HelloPlanet extends MyHeeBaseElement {
  constructor () {
    super()
    this.noop() // Standard hack
  }

  noop () {}

  static get observedAttributes () {
    return ['greetings', 'planet', 'planetcolor']
  }

  get observedEvents () {
    return [{
      target: '#sayhello',
      type: 'click',
      handler: () => this.helloMars(this.state.otherplanet, 'red')
    }]
  }

  static get is () {
    return 'my-helloplanet-hee-base-element'
  }

  static get observedSSE () {
    return ['changePlanet']
  }

  get initialState () {
    return {
      otherplanet: 'Mars',
      greetings: 'Bye',
      planet: 'World',
      hum: 'pepe'
    }
  }

  ready () {} // Minimal HeeBaseElement implementation

  onChangePlanet (e) {
    console.log('CHANGEPLANET', e)
    this.setState(JSON.parse(e.data))
  }

  helloMars (planet, planetcolor) {
    this.postState({type: 'changePlanet', planetcolor, planet})
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
                    <span class="black">${this.state.greetings}?</span>
                    <span class="${this.state.planetcolor ? this.state.planetcolor : 'green'}">${this.state.planet}</span>
                    <hr>
                <button id="sayhello"> <slot name="buttonText">{{buttonText}}</slot> </button>
                
                </div>

                `
  }
}

MyHeeBaseElement.define(HelloPlanet.is, HelloPlanet)
