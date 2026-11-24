import type {ComponentProps} from 'react';
import {Photo} from './Photo';
import type {ArticleImageData} from './article-image';
type Props=ComponentProps<typeof Photo>&{image?:ArticleImageData};
export function ArticlePhoto({image,name,width=960,card=false,responsive=true,sizes,alt,...props}:Props){
 if(!image)return <Photo name={name} width={width} card={card} responsive={responsive} sizes={sizes} alt={alt} {...props}/>;
 return <img {...props} src={image.url} width={image.width} height={image.height} alt={alt===undefined?image.alt:alt} sizes={sizes}/>;
}
