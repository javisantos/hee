import HttpEventEmitter from './index.mjs'

const hee = new HttpEventEmitter(8080)

hee.on('subscription', (params) => {
  console.log('New subscription', params)
})

hee.on('event', (params) => {
  console.log('New event', params)
})
