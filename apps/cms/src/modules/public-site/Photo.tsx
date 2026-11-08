import type {ImgHTMLAttributes} from 'react';
import {photo,photoSet} from './photos';

type Props=Omit<ImgHTMLAttributes<HTMLImageElement>,'src'|'srcSet'|'width'|'height'> & {
 name:string;width?:480|960|1440;card?:boolean;responsive?:boolean;
};
// Native format selection downloads one source; WebP remains the compatibility
// fallback and the stable URL used by metadata and existing media records.
export function Photo({name,width=960,card=false,responsive=true,sizes,...props}:Props){
 const fallback=photo(name,width,card);
 return <picture style={{display:'contents'}}><source type="image/avif" srcSet={responsive?photoSet(name,card,'avif'):photo(name,width,card,'avif').src} sizes={sizes}/><img {...fallback} {...props} srcSet={responsive?photoSet(name,card):undefined} sizes={sizes}/></picture>;
}
