import AjvCompiler from '@fastify/ajv-compiler'
import { FastifySchemaCompiler } from 'fastify'

const compilerFactory = AjvCompiler()
// Fastify's default Ajv strips fields outside `additionalProperties: false` (removeAdditional: true) and
// coerces an explicit `null` into '' inside `anyOf [string, null]`. Create routes validate their body with this
// compiler instead, so a typo in a field name is a 400 and `null` stays `null`.
const strictBody = compilerFactory({}, { customOptions: { removeAdditional: false, coerceTypes: false } })
// Params and querystring keep Fastify's defaults (coerced, unknown query keys stripped like on every other route).
const lenient = compilerFactory({}, { customOptions: {} })

export const strictBodyValidatorCompiler: FastifySchemaCompiler<unknown> = (routeSchema) =>
    (routeSchema.httpPart === 'body' ? strictBody : lenient)(routeSchema)
