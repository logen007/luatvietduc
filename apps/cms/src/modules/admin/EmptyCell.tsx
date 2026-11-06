'use client';
import {DefaultCell} from '@payloadcms/ui';
import type {DefaultCellComponentProps} from 'payload';

export function EmptyCell(props:DefaultCellComponentProps){
 const {field,cellData,link,onClick}=props;
 const value=field.type==='join'?cellData?.docs:cellData;
 const unset=value==null||typeof value==='string'&&!value.trim()||Array.isArray(value)&&value.length===0;
 const primary=link||onClick||'required' in field&&field.required||'name' in field&&field.name==='id';
 if(unset&&!primary)return null;
 return <DefaultCell {...props}/>;
}
