import {cache} from 'react';
import {activeValues} from '../integrations/store';
import {validateValues} from '../integrations/validation';
import type {Provider} from '../integrations/catalog';
// Request-scoped only: owner changes apply to the next document load without a build.
export const googleMeasurement=cache(async()=>{
 const read=async(provider:Provider,key:string)=>{try{const values=await activeValues(provider);if(!values)return '';validateValues(provider,values);return values[key]||'';}catch{return '';}};
 const [gtmId,gaId,verification]=await Promise.all([read('gtm','containerId'),read('analytics','measurementId'),read('searchConsole','verification')]);
 return {gtmId,gaId,verification};
});
