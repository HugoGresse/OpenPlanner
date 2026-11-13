import { fastifyFunction } from './api'
import { serviceApi } from './serviceApi/serviceApi'
import { sendWhatsappPanel } from './api/routes/whatsapp/whatsappPanelTask'

export { fastifyFunction as api, serviceApi, sendWhatsappPanel }
