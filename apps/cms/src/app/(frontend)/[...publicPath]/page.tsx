import {permanentRedirect} from 'next/navigation';
import {PublicPage,pageMetadata} from '../../../modules/public-site/Page';
import {queryParams,redirectTarget} from '../../../modules/public-site/routes';
export const dynamic='force-dynamic';
type Props={params:Promise<{publicPath:string[]}>;searchParams:Promise<Record<string,string|string[]|undefined>>};
async function context(props:Props){
 const path='/'+(await props.params).publicPath.map(part=>encodeURIComponent(part)).join('/'),query=queryParams(await props.searchParams);
 const target=redirectTarget(path,query);if(target)permanentRedirect(target);
 return {path,query};
}
export async function generateMetadata(props:Props){const {path,query}=await context(props);return pageMetadata(path,query);}
export default async function Page(props:Props){const {path,query}=await context(props);return <PublicPage path={path} query={query}/>;}
