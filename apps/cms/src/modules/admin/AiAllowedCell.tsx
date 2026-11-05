'use client';
import type {DefaultCellComponentProps} from 'payload';

export function AiAllowedCell({cellData}:DefaultCellComponentProps){
 const allowed=cellData===true;
 return <span className="lvd-ai-cell" role="img" aria-label={allowed?'Có':'Không'} title={allowed?'Có':'Không'}><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={allowed?'m5 12 4 4 10-10':'m7 7 10 10M17 7 7 17'}/></svg></span>;
}
