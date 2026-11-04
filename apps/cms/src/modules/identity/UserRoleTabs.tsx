import type {BeforeListTableServerProps} from 'payload';
import {roleOptions} from './roles';
export async function UserRoleTabs({payload,user}:BeforeListTableServerProps){
 if(user?.role!=='owner')return null;
 const counts=await Promise.all(roleOptions.map(option=>payload.count({collection:'users',overrideAccess:false,user,where:{role:{equals:option.value as 'owner'|'support'|'member'}}})));
 const total=counts.reduce((sum,result)=>sum+result.totalDocs,0);
 return <nav className="lvd-user-role-tabs" aria-label="Lọc theo vai trò"><a href="/admin/collections/users">Tất cả <span>({total})</span></a>{roleOptions.map((option,index)=><a key={option.value} href={'/admin/collections/users?where[role][equals]='+option.value}>{option.label} <span>({counts[index].totalDocs})</span></a>)}</nav>;
}
