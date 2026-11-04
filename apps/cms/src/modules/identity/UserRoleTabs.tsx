import type {BeforeListTableServerProps} from 'payload';
import {RoleFilterLinks} from './RoleFilterLinks';
import {roleOptions} from './roles';
export async function UserRoleTabs({payload,user}:BeforeListTableServerProps){
 if(user?.role!=='owner')return null;
 const counts=await Promise.all(roleOptions.map(option=>payload.count({collection:'users',overrideAccess:false,user,where:{role:{equals:option.value as 'owner'|'support'|'member'}}})));
 const total=counts.reduce((sum,result)=>sum+result.totalDocs,0);
 return <RoleFilterLinks total={total} roles={roleOptions.map((option,index)=>({...option,count:counts[index].totalDocs}))}/>;
}
