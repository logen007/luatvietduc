'use client';
import {Header} from '../../modules/shared/Header';
import {Footer} from '../../modules/shared/Footer';
import {PublicNotice} from '../../modules/public-site/Notice';
// Keep the fallback independent from failed page data and provider calls.
export default function ErrorPage({retry}:{error:unknown;retry:()=>void}){return <><Header/><main><PublicNotice retry={retry}/></main><Footer/></>;}
