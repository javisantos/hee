import HttpEventEmitter from './'

const hee = new HttpEventEmitter(8443, {
  publicPath: './public',
  encoding: 'json'
})

hee.on('subscription', hash => {
  var message = {type: 'event', text: 'Hello world!'}
  hee.emit(hash, message)
})

hee.on('event', params => {
  console.log('New event', params)
})
