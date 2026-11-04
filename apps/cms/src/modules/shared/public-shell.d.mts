export type ShellLink={key?:string;href?:string;url?:string;label:string};
export type ShellSettings={siteName?:string|null;tagline?:string|null;logo?:string|null;accentColor?:string|null;footerText?:string|null;navigation?:ShellLink[]|null};
export type ShellNavigation={primary:ShellLink[];footer:{title:string;links:string[][]}[]};
export type PublicShell={name:string;tagline:string;logo:string|null;accent:string|null;footerText:string;primary:{key:string;href:string;label:string}[];footer:ShellNavigation['footer']};
export function publicShell(settings?:ShellSettings,navigation?:ShellNavigation):PublicShell;
export function copyright(shell:PublicShell,version?:string):string;
