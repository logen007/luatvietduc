'use client';
import {DefaultCell} from '@payloadcms/ui';
import type {DefaultCellComponentProps} from 'payload';
export function CategoryCell(props:DefaultCellComponentProps){
 if(props.cellData==null||Array.isArray(props.cellData)&&props.cellData.length===0)return null;
 return <DefaultCell {...props}/>;
}
