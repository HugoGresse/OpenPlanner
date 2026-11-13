import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderCapabilitiesDoc, replaceCapabilityBlock } from '../src/api/routes/chat/capabilityDocs'

// Regenerates the CLI skill docs from functions/src/api/routes/chat/capabilities/.
const skillDir = resolve(__dirname, '../../cli/skills/openplanner')
const skillPath = resolve(skillDir, 'SKILL.md')
writeFileSync(skillPath, replaceCapabilityBlock(readFileSync(skillPath, 'utf8')))
writeFileSync(resolve(skillDir, 'capabilities.md'), renderCapabilitiesDoc())
console.log(`Updated ${skillDir}`)
