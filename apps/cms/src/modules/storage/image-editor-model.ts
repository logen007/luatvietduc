export type ImageCrop={left:number;top:number;width:number;height:number};
export type ImageDraft={rotate:0|90|180|270;flipHorizontal:boolean;flipVertical:boolean;crop?:ImageCrop;scale:number};
export type ImageHistory={past:ImageDraft[];present:ImageDraft;future:ImageDraft[]};
export const initialImageDraft=():ImageDraft=>({rotate:0,flipHorizontal:false,flipVertical:false,scale:1});
export const initialImageHistory=():ImageHistory=>({past:[],present:initialImageDraft(),future:[]});
const integer=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,Math.round(value)||min));
export function imageCrop(width:number,height:number,crop?:ImageCrop):ImageCrop{
 const left=integer(crop?.left||0,0,width-1),top=integer(crop?.top||0,0,height-1);
 return {left,top,width:integer(crop?.width??width,1,width-left),height:integer(crop?.height??height,1,height-top)};
}
export function imageGeometry(width:number,height:number,draft:ImageDraft){
 const crop=imageCrop(width,height,draft.crop),swapped=draft.rotate===90||draft.rotate===270;
 const rotatedWidth=swapped?crop.height:crop.width,rotatedHeight=swapped?crop.width:crop.height,scale=Math.max(0,Math.min(1,draft.scale));
 return {crop,width:rotatedWidth,height:rotatedHeight,outputWidth:Math.max(1,Math.round(rotatedWidth*scale)),outputHeight:Math.max(1,Math.round(rotatedHeight*scale))};
}
export function imageEditBody(updatedAt:string,width:number,height:number,draft:ImageDraft){
 const geometry=imageGeometry(width,height,draft),crop=geometry.crop;
 return {updatedAt,operation:'edit' as const,rotate:draft.rotate,flipHorizontal:draft.flipHorizontal,flipVertical:draft.flipVertical,
  ...(crop.left||crop.top||crop.width!==width||crop.height!==height?{crop}:{}),
  ...(geometry.outputWidth!==geometry.width||geometry.outputHeight!==geometry.height?{width:geometry.outputWidth,height:geometry.outputHeight}:{}),
 };
}
export function imagePreviewTransform(width:number,height:number,draft:ImageDraft){
 const geometry=imageGeometry(width,height,draft);
 return `translate(${geometry.width/2} ${geometry.height/2}) scale(${draft.flipHorizontal?-1:1} ${draft.flipVertical?-1:1}) rotate(${draft.rotate}) translate(${-geometry.crop.width/2} ${-geometry.crop.height/2})`;
}
export function commitImageDraft(history:ImageHistory,next:ImageDraft):ImageHistory{
 return JSON.stringify(next)===JSON.stringify(history.present)?history:{past:[...history.past,history.present].slice(-40),present:next,future:[]};
}
export function undoImageDraft(history:ImageHistory):ImageHistory{return history.past.length?{past:history.past.slice(0,-1),present:history.past.at(-1)!,future:[history.present,...history.future]}:history;}
export function redoImageDraft(history:ImageHistory):ImageHistory{return history.future.length?{past:[...history.past,history.present],present:history.future[0],future:history.future.slice(1)}:history;}
