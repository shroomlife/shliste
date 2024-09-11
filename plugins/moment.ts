import moment from 'moment'
import 'moment/locale/de'

export default defineNuxtPlugin(() => {
  moment.locale('de')
  return {
    provide: {
      moment,
    },
  }
})
