import {CustomerWorkspace} from './CustomerWorkspace';
import {StaffWorkspace} from './StaffWorkspace';
export function Workspace({staff=false,embedded=false}:{staff?:boolean;embedded?:boolean}){
 return staff?<StaffWorkspace embedded={embedded}/>:<CustomerWorkspace/>;
}
