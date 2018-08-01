# (H)TTP (E)vent (E)mitter

### Installing


```
npm i hee
```

### Example

#####Client (client.html)
```
<!DOCTYPE html>
<html>

<body>
    <script type="text/javascript">
        var source = new EventSource("http://localhost:8080/namespace/id/1");
        source.onmessage = function (e) {
            document.body.innerHTML += `${e.lastEventId!==''?e.lastEventId:"init"}: ${e.data} <br>`;
        };
    </script>
</body>

</html>

```

#####Server (server.mjs)
```
import HttpEventEmitter from 'hee'

const hee = new HttpEventEmitter(8080)

hee.on('subscription', (params) => {
  console.log('New subscription', params)
})

hee.on('event', (params) => {
  console.log('New event', params)
})

```

#####Run
```
node --experimental-modules server.mjs
```

Hee is using experimental ECMAScript modules https://nodejs.org/api/esm.html

##API
```
const hee = new HttpEventEmitter([PORT])
```
###Events
```
hee.on("subscription", params)
```
Emitted when a new client GET a path to listen.

```
hee.on("event", params)
```
Emitted when a client POST to a path.


Params:
```
{ 
  path: '/namespace/id/1',
  id: 'ad5a71fc-abc7-4d92-a585-d56934047ce9',
  data: { payload: 'Hello World' } 
}
```