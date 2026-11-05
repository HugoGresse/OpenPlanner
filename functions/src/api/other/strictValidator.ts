import AjvCompiler from '@fastify/ajv-compiler'
import { FastifySchemaCompiler } from 'fastify'

// Fastify's default Ajv strips fields outside `additionalProperties: false` (removeAdditional: true).
// Create routes use this compiler instead so a typo in a field name is a 400, not a silent drop.
export const strictValidatorCompiler: FastifySchemaCompiler<unknown> = AjvCompiler()(
    {},
    { customOptions: { removeAdditional: false, coerceTypes: 'array', useDefaults: true, allErrors: false } }
)
