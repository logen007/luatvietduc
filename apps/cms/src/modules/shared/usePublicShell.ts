'use client';
import {useEffect} from 'react';
import {usePublicSettings} from '../settings/client';
import navigation from './navigation.json';
import {publicShell} from './public-shell.mjs';
export function usePublicShell(){
 const settings=usePublicSettings(),shell=publicShell(settings||{},navigation);
 useEffect(()=>{if(shell.accent)document.documentElement.style.setProperty('--accent',shell.accent);},[shell.accent]);
 return shell;
}
