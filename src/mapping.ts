import YAML from 'yaml'

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(v => typeof v === 'string')
  )
}

function describe(value: unknown): string {
  if (value instanceof Map) {
    return `a map`
  } else if (Array.isArray(value)) {
    return value.length > 0 ? `a list` : `an empty list`
  } else if (typeof value === 'string') {
    return `a string (${JSON.stringify(value)})`
  } else if (typeof value === 'number') {
    return `a number (${value})`
  } else if (typeof value === 'boolean' || value === null) {
    return String(value)
  } else {
    try {
      return `an unknown value (${String(value)})`
    } catch {
      return `an unknown value`
    }
  }
}

export default class Mapping extends Map<string, string[]> {
  static fromYAML(yaml: string): Mapping {
    const mapping = YAML.parse(yaml, {mapAsMap: true})

    if (!(mapping instanceof Map)) {
      throw new Error(`Expecting a map, got ${describe(mapping)}`)
    }

    for (const [key, value] of mapping) {
      if (typeof key !== 'string') {
        throw new Error(`Expecting a string key, got ${describe(key)}`)
      }

      if (typeof value === 'string') {
        mapping.set(key, [value])
      } else if (!isStringArray(value)) {
        throw new Error(
          `Expecting a list of strings at key \`${key}\`, got ${describe(
            value
          )}`
        )
      }
    }

    return new this(mapping)
  }

  toJSON(): object {
    const json = Object.create(null)

    for (const [key, value] of this) {
      json[key] = value
    }

    return json
  }
}
