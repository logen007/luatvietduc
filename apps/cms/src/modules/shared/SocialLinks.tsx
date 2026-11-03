"use client";
import { useEffect, useState } from "react";
import icons from "../../../public/social-icons.json";
type Link = { label: string; url: string };
export function SocialLinks() {
  const [links, setLinks] = useState<Link[]>([]);
  useEffect(() => {
    let active = true;
    fetch('/service/settings').then(r => r.ok ? r.json() : null).then(settings => {
      if (active) setLinks((settings?.socialLinks || []).filter((link: Link) => {
        try { return new URL(link.url).protocol === 'https:'; } catch { return false; }
      }));
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  const used = new Set<Link>();
  return <div className="lvd-footer-social" aria-label="Mạng xã hội">{icons.map(icon => {
    const link = links.find(l => {
      const host = new URL(l.url).hostname.toLowerCase();
      return icon.hosts.some(h => host === h || host.endsWith('.' + h)) || l.label.toLowerCase() === icon.name.toLowerCase();
    });
    if (link) used.add(link);
    const svg = <svg viewBox="0 0 24 24" aria-hidden="true">{icon.paths.map((d, i) => <path key={i} d={d} fillRule="evenodd" />)}</svg>;
    return link ? <a key={icon.name} className="lvd-social-icon" href={link.url} aria-label={icon.name} title={icon.name} target="_blank" rel="noopener noreferrer">{svg}</a> : <span key={icon.name} className="lvd-social-icon is-unset" role="img" aria-label={icon.name} title={icon.name}>{svg}</span>;
  })}{links.filter(link => !used.has(link)).map(link => <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">{link.label}</a>)}</div>;
}
