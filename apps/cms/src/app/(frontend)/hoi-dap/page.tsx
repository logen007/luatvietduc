import {publicArticleList} from '../../../modules/public-site/server';
import path from 'node:path';
import {getPresentationVersion} from '../../../modules/shared/presentation-version.mjs';
import { Workspace } from "../../../modules/chat/Workspace";
export const metadata={title:'Hỏi đáp — Luật Việt Đức'};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const query=await searchParams,key=JSON.stringify([query.conversation||'',query.question||'']);
  const articles=await publicArticleList({kind:'legal',order:'newest',limit:4}).then(list=>list.docs).catch(()=>[]);
  return <><link rel="stylesheet" precedence="chat" href={'/customer-chat.css?v='+getPresentationVersion(path.join(process.cwd(),'public'),['customer-chat.css'])}/><Workspace key={key} articles={articles} /></>;
}
