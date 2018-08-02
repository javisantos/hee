class Component extends HTMLElement{constructor(){super(),this.source=this.dataset.eventsource?this.dataset.eventsource:null,window.eventSources||(window.eventSources=new Map),this.state=this.initialState;var a=document.createElement('style'),b=document.createElement('template');a.textContent=this.style,b.innerHTML=this.template,this.shadow=this.attachShadow({mode:'open'}),this.shadow.appendChild(b.content),this.shadow.appendChild(a.cloneNode(!0))}static define(a,b){try{customElements.define(a,b)}catch(a){console.log(a);const b=document.createElement('h3');b.innerHTML='This site uses webcomponents which don\'t work in all browsers! Try this site in a browser that supports them!',document.body.innerHTML(b)}}rendered(){}ready(){}static get observedAttributes(){}get initialState(){return{}}get style(){return''}get template(){return`[Empty Template]`}connectedCallback(){this.render(),this.connected=!0,this.source&&this.initEventSource()}render(){console.log('RENDERING',this.state),this.shadow.querySelectorAll('DIV')[0].innerHTML=this.template,this.rendered()}initEventSource(){window.eventSources.has(this.source)||window.eventSources.set(this.source,new EventSource(this.source)),this.eventSource=window.eventSources.get(this.source),this.eventSource.onmessage=a=>{console.log('message',a)},this.eventSource.onopen=()=>{},this.eventSource.addEventListener('ready',()=>{this.ready()})}setState(a,b){const c=Object.assign({},this.state,a);this.state=c,(b||this.connected)&&this.render()}postState(a){if(!this.source)throw new Error('You need to define data-source to POST events');fetch(`${this.source}`,{method:'POST',mode:'cors',headers:{"Content-Type":'application/json'},body:JSON.stringify(a)}).catch(a=>console.error(`Fetch Error =\n`,a))}disconnectedCallback(){this.eventSource.close()}attributeChangedCallback(a,b,c){const d={};d[a]=c,this.setState(d)}}const html=(a,...b)=>{let c='';for(let d=0;d<b.length;d++)c+=a.raw[d],c+=b[d];return c+=a[a.length-1],c};export{Component,html};