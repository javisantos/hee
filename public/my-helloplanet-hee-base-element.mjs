/* global  */
import {MyHeeBaseElement, html} from './my-hee-base-element.mjs'

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
    return [
      {
        target: '#sayhello',
        type: 'click',
        handler: () => this.helloMars(this.state.otherplanet, 'red')
      },
      {
        target: '#savedata',
        type: 'click',
        handler: () => this.savedata(this.state)
      }
    ]
  }

  static get is () {
    return 'my-helloplanet-hee-base-element'
  }

  static get observedSSE () {
    return [{
      type: 'changePlanet',
      hander: () => this.onChangePlanet

    }]
  }

  get initialState () {
    return {
      otherplanet: 'Mars',
      greetings: 'Bye',
      planet: 'World',
      hum: 'javi'
    }
  }

  ready () {} // Minimal HeeBaseElement implementation

  onChangePlanet (e) {
    var data = JSON.parse(e.data)
    this.planet = data.planet
    this.planetcolor = 'red'
    this.render()
  }

  helloMars (planet, planetcolor) {
    this.emit({type: 'changePlanet', planetcolor, planet})
  }

  savedata (data) {
    data._id = 'state'
    this.put(data)
  }

  get style () {
    return `
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
            `
  }

  get template () {
    return html`
                <div>
                    <span class="black">${this.greetings}?</span>
                    <span class="${this.planetcolor ? this.planetcolor : 'green'}">${this.planet}</span>
                    <hr>
                <button id="sayhello"> <slot name="buttonText">{{buttonText}}</slot> </button>
                <button id="savedata"> <slot name="buttonText">Save Data</slot> </button>
                
                </div>

                `
  }
}

MyHeeBaseElement.define(HelloPlanet.is, HelloPlanet)
