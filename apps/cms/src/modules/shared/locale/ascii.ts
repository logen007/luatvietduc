const glyphs='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+-/<>[]{}';
// Scramble only the temporary visual copy. Final Unicode text is never changed.
export function asciiFrame(text:string,progress:number,random=Math.random){
 const characters=Array.from(text),revealed=Math.floor(characters.length*Math.max(0,Math.min(1,progress)));
 return characters.map((character,index)=>index<revealed||!/[\p{L}\p{N}]/u.test(character)?character:glyphs[Math.min(glyphs.length-1,Math.floor(random()*glyphs.length))]).join('');
}
