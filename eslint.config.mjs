// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({ ignores: ['tmp/**', 'coverage/**'] }, {
  rules: {
    'vue/multi-word-component-names': 'off',
  },
})
