/**
 * Get the schema of a given object
 *
 * @export
 * @param {*} object
 * @param {boolean} [expanded=false]
 * @returns
 */
export const getSchema = object => {
  // if (expanded && typeof object === 'string' && object.indexOf('./') > -1) {
  //   object = JSON.parse(fs.readFileSync(`${object}.json`, 'utf8'))
  // }

  const type = Array.isArray(object) ? 'array' : typeof object
  switch (type) {
    case 'number':
    case 'string':
    case 'boolean': {
      return {type}
    }
    case 'object': {
      if (!object) return null
      const res = {type: 'object', ordered: true, properties: {}}
      for (const key of Object.keys(object)) {
        const sch = (res.properties[key] = getSchema(object[key]))
        if (!sch) return null
      }
      return res
    }
    case 'array': {
      const res = {type: 'array', items: null}
      if (object.length) {
        res.items = getSchema(object[0])
        if (!res.items) return null
      }
      return res
    }
  }

  return null
}

/**
 * PRIVATE
 * Flatten a deep object into a one level object with it’s path as key
 *
 * @param  {object} object - The object to be flattened
 *
 * @return {object}        - The resulting flat object
 */
export const flatten = (obj, path = '') => {
  if (!(obj instanceof Object)) return {[path.replace(/\.$/g, '')]: obj}

  return Object.keys(obj).reduce((output, key) => {
    return obj instanceof Array
      ? {...output, ...flatten(obj[key], path + '[' + key + '].')}
      : {...output, ...flatten(obj[key], path + key + '.')}
  }, {})
}
export const unflatten = data => {
  if (Object(data) !== data || Array.isArray(data)) return data
  var regex = /\/?([^.[\]]+)|\[(\d+)\]/g
  var resultholder = {}
  for (var p in data) {
    var cur = resultholder
    var prop = ''
    var m
    while ((m = regex.exec(p))) {
      cur = cur[prop] || (cur[prop] = m[2] ? [] : {})
      prop = m[2] || m[1]
    }
    cur[prop] = data[p]
  }
  return resultholder[''] || resultholder
}
// creates a `search` function, which accepts a needle (property name, string),
// a haystack (the object to search within), found (the recursively added to
// list of found properties
export const search = (needle, haystack, found = []) => {
  // iterate through each property key in the object
  Object.keys(haystack).forEach(key => {
    // if the current key is the search term (needle),
    // push its value to the found stack
    if (key === needle) {
      found.push(haystack[key])
      // return the array of found values to the caller, which is
      // either the caller of the search function, or the recursive
      // "parent" of the current search function
      return found
    }
    // if the value of the current property key is an object,
    // recursively search it for more matching properties

    // this can be changed to an else if, if properties should not
    // be nested
    if (typeof haystack[key] === 'object') {
      search(needle, haystack[key], found)
    }
  })
  // return the list of found values to the caller of the function
  return found
}
