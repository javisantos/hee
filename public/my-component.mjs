

/* global HTMLElement customElements EventSource fetch */
import ("http://localhost:8080/my-hee-base-element.mjs").then((Module) => {
    //import ('../lib/hee-basecomponent.mjs').then((Module) => {

    const {
        MyHeeBaseElement,
        html,
        helpers
    } = Module

    class MyComponent extends MyHeeBaseElement {
        constructor() {
            super()
        }

        static get observedAttributes() {
            return ['greetings', 'planet']
        }

        static get observedEvents() {
            return ["click", "changePlanet"] /* Array of observed events [Array]. */
        }

        get initialState() {
            return {
                otherPlanet: "Mars",
                greetings: 'Hello',
                planet: 'World'
            }
        }

        rendered() {}

        ready() {

           console.log("GO!")

        }
        
        onChangePlanet (e) {
            console.log("panet change", e.data)
            this.setState(JSON.parse(e.data))
        }

        onEvent(event) {

            if (!event.path[0].attributes['onclick']) return
            var stringFunction = event.path[0].attributes['onclick'].value
            helpers.execute(stringFunction, this)
            
        }

        helloMars(planetColor, planet) {
            console.log("posting", planet)
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
                    <button onclick="${() => helloMars({planet: this.state.otherPlanet, planetColor: 'red'})}"> Say hello to Mars</button>
                </div>
                
                `
        }
    }
    MyHeeBaseElement.define('my-component', MyComponent)
})