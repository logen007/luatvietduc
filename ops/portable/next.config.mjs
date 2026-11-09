// Used only in the portable builder; installed production policy stays unchanged.
import base from './next.base.config.mjs'
export default {...base, output: 'standalone'}
