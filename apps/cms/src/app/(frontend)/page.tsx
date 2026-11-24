import {PublicPage,pageMetadata} from '../../modules/public-site/Page';
export const dynamic='force-dynamic';
export async function generateMetadata(){return pageMetadata('/',new URLSearchParams());}
export default function Page(){return <PublicPage path="/" query={new URLSearchParams()}/>;}
