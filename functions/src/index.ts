import { fastifyFunction } from './api'
import { serviceApi } from './serviceApi/serviceApi'
import { sendWhatsappPanel } from './api/routes/whatsapp/whatsappPanelTask'
import { slackWorker } from './api/routes/slack/slackWorker'

export { fastifyFunction as api, serviceApi, sendWhatsappPanel, slackWorker }
