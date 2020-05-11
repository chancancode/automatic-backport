import Mapping from '../src/mapping'

function roundtrip(yaml: string): object {
  return Mapping.fromYAML(yaml).toJSON()
}

test('valid usages', async () => {
  expect(roundtrip('{}')).toEqual({})
  expect(roundtrip('foo: bar')).toEqual({foo: ['bar']})
  expect(roundtrip('foo: [bar, baz]')).toEqual({foo: ['bar', 'baz']})
})

test('invalid keys', async () => {
  expect(() => roundtrip('true: it is true')).toThrow(
    'Expecting a string key, got true'
  )

  expect(() => roundtrip('null: it is null')).toThrow(
    'Expecting a string key, got null'
  )

  expect(() => roundtrip('123: it is null')).toThrow(
    'Expecting a string key, got a number (123)'
  )

  expect(() => roundtrip('[]: it is a list')).toThrow(
    'Expecting a string key, got an empty list'
  )

  expect(() => roundtrip('{}: it is a map')).toThrow(
    'Expecting a string key, got a map'
  )
})

test('invalid values', async () => {
  expect(() => roundtrip('foo: true')).toThrow(
    'Expecting a list of strings at key `foo`, got true'
  )

  expect(() => roundtrip('foo: null')).toThrow(
    'Expecting a list of strings at key `foo`, got null'
  )

  expect(() => roundtrip('foo: 123')).toThrow(
    'Expecting a list of strings at key `foo`, got a number (123)'
  )

  expect(() => roundtrip('foo: []')).toThrow(
    'Expecting a list of strings at key `foo`, got an empty list'
  )

  expect(() => roundtrip('foo: {}')).toThrow(
    'Expecting a list of strings at key `foo`, got a map'
  )
})
