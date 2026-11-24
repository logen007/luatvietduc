import path from 'node:path';
import {PublicFrame} from '../../modules/public-site/Frame';
import {PublicNotice} from '../../modules/public-site/Notice';
import {getPresentationVersion} from '../../modules/shared/presentation-version.mjs';
export default function NotFound(){return <PublicFrame revision={getPresentationVersion(path.join(process.cwd(),'public'),['editorial-ui.css'])} scriptRevision={getPresentationVersion(path.join(process.cwd(),'public'),['editorial-ui.js'])}><PublicNotice/></PublicFrame>;}
