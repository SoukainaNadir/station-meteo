import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#6C5CE7',
          secondary: '#00B894',
          accent: '#FDCB6E',
          error: '#D63031',
          success: '#00B894',
          temperature: '#FF7675',
          humidity: '#74B9FF',
          pressure: '#A29BFE',
          wind: '#55EFC4',
          rain: '#0984E3',
          light: '#FFEAA7'
        }
      }
    }
  }
})