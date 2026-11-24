import { withPayload } from '@payloadcms/next/withPayload'
import {securityHeaders} from './src/modules/http/security-headers.mjs'
export default withPayload({ poweredByHeader: false, experimental: { cpus: 2 }, headers:securityHeaders })
