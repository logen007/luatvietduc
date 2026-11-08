import type {Card} from '../public-site/types';
import {CustomerWorkspace} from './CustomerWorkspace';
import {StaffWorkspace} from './StaffWorkspace';
export function Workspace({staff=false,embedded=false,articles=[]}:{staff?:boolean;embedded?:boolean;articles?:Card[]}){
 return staff?<StaffWorkspace embedded={embedded}/>:<CustomerWorkspace articles={articles}/>;
}
