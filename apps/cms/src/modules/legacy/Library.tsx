import React from 'react';
import files from './files.json';
export function BundledLibrary(){return <section className="lvd-bundled-library"><h2>Tệp có sẵn trên website ({files.length})</h2><p>Ảnh, logo và video thuộc bộ giao diện hiện tại. Tệp tải lên được quản lý ở danh sách bên dưới.</p><div className="lvd-bundled-grid">{files.map(file=><a key={file.url} href={file.url} target="_blank" rel="noreferrer">{file.type==='video'?<video src={file.url} controls preload="none"/>:<img src={file.url} alt={file.name} loading="lazy"/>}<span>{file.name}</span></a>)}</div></section>}
