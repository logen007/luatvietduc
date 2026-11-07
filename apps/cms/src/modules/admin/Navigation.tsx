import React from 'react';
import {NavigationLinks} from './NavigationLinks';
import {adminNavigation,type AdminViewer} from './navigation-model';
export function AdminNavigation({user}:{user?:AdminViewer|null}){
 return <NavigationLinks items={adminNavigation(user)} viewer={user}/>;
}
