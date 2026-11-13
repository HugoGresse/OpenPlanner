import { buildProgram } from './program.js'
import { exitQuietlyOnClosedStdout, fail } from './output.js'

exitQuietlyOnClosedStdout()

buildProgram().parseAsync(process.argv).catch(fail)
