import path from 'node:path';
import {getPresentationVersion} from '../../../modules/shared/presentation-version.mjs';
import { Workspace } from "../../../modules/chat/Workspace";
export const metadata={title:'Hỏi đáp — Luật Việt Đức'};
export default function Page() {
  return <><link rel="stylesheet" precedence="chat" href={'/customer-chat.css?v='+getPresentationVersion(path.join(process.cwd(),'public'))}/><Workspace /></>;
}
