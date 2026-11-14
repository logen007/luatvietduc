const glyphs='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+-/<>[]{}';
// Preserve whitespace/punctuation and reveal the final Unicode text exactly.
export function asciiFrame(text:string,progress:number,random=Math.random,chooseGlyph?:(character:string)=>string){
 const characters=Array.from(text),revealed=Math.floor(characters.length*Math.max(0,Math.min(1,progress)));
 return characters.map((character,index)=>index<revealed||!/[\p{L}\p{N}]/u.test(character)?character:chooseGlyph?chooseGlyph(character):glyphs[Math.min(glyphs.length-1,Math.floor(random()*glyphs.length))]).join('');
}
