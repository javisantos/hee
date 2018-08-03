/* global HTMLElement customElements EventSource fetch */
import ("https://unpkg.com/hee@1.0.4/public/component.mjs").then((Module) => {
    //import ('../lib/hee-basecomponent.mjs').then((Module) => {

    const {
        Component,
        html
    } = Module

    class MyComponent extends Component {
        constructor() {
            super()
        }

        static get observedAttributes() {
            return ['greetings', 'planet']
        }

        get initialState() {
            return {
                greetings: 'Hello',
                planet: 'World'
            }
        }

        rendered() {}

        ready() {
            this.eventSource.addEventListener('changePlanet', (e) => {
                this.setState(JSON.parse(e.data), true)
            })
        }

        helloMars(planetColor, planet) {
            this.postState({
                type: 'changePlanet',
                planetColor,
                planet
            })
        }

        get style() {
            return (`
                    :host {
                        color: blue;
                    }
                    .black {
                        color: black;
                    }
                    .red {
                        color: red;
                    }
                    .green {
                        color: green;
                    }
                `)
        }

        get template() {
            return html `
                <div>
                    <span class="black">${this.state.greetings}</span>
                    <span class="${this.state.planetColor ? this.state.planetColor : 'blue'}">${this.state.planet}</span>
                    <hr>
                    <button onclick="${() => helloMars({planet: 'Mars', planetColor: 'red'})}"> Say hello to Mars</button>
                </div>
                
                `
        }
    }
    Component.define('my-component', MyComponent)
})