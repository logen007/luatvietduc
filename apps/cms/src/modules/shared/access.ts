import type { Access } from "payload";
import {isAdmin} from '../identity/permissions';
export const owner: Access = ({ req }) => isAdmin(req.user);
export const nobody: Access = () => false;
