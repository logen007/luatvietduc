import {Gutter} from '@payloadcms/ui';
import type {AdminViewServerProps} from 'payload';
import {ProfileForm} from './ProfileForm';
import {profileData} from './profile';
export async function ProfileView({initPageResult}:AdminViewServerProps){
 const {req}=initPageResult;
 if(!req.user)return null;
 return <Gutter className="lvd-profile-page"><ProfileForm initial={await profileData(req.payload,Number(req.user.id))} preview={Boolean((req.user as {rolePreview?:string}).rolePreview)}/></Gutter>;
}
