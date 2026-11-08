'use client';

import {useEffect,type ReactNode,type RefObject} from 'react';

// Reveal content groups, never the hero, navigation, form fields or reading text.
const targets = [
  '.pm-section-head', '.pm-country', '.lvd-home-services > header',
  '.lvd-service-wheel-panel', '.lvd-benefit-card', '.pm-fields-grid > a',
  '.pm-story', '.lvd-team-section > h2', '.lvd-expert-card',
  '.catalog-topic', '.catalog-help', '.native-story-image',
  '.contact-email-heading-image',
].join(',');

export function useScrollReveal(frame:RefObject<HTMLDivElement|null>,content:ReactNode){
  useEffect(()=>{
    const root=frame.current;
    if(!root||!('IntersectionObserver' in window))return;
    const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
    if(motion.matches)return;
    const nodes=Array.from(root.querySelectorAll<HTMLElement>(targets));
    const observer=new IntersectionObserver(entries=>{
      let order=0;
      for(const entry of entries){
        if(!entry.isIntersecting)continue;
        const node=entry.target as HTMLElement;
        node.style.setProperty('--reveal-delay',`${Math.min(order++,3)*65}ms`);
        node.dataset.scrollReveal='visible';
        observer.unobserve(node);
      }
    },{rootMargin:'0px 0px -24px 0px',threshold:0.01});

    // Preserve first paint and restored scroll positions: only prepare content
    // below the viewport. Without JavaScript everything stays visible.
    for(const node of nodes){
      if(node.getBoundingClientRect().top<window.innerHeight)continue;
      node.dataset.scrollReveal='pending';
      observer.observe(node);
    }
    const revealFocused=(event:FocusEvent)=>{
      const target=event.target;
      if(!(target instanceof Element))return;
      const node=target.closest<HTMLElement>('[data-scroll-reveal="pending"]');
      if(!node)return;
      delete node.dataset.scrollReveal;
      observer.unobserve(node);
    };
    const showAll=()=>{
      if(!motion.matches)return;
      observer.disconnect();
      for(const node of nodes){delete node.dataset.scrollReveal;node.style.removeProperty('--reveal-delay');}
    };
    root.addEventListener('focusin',revealFocused);
    motion.addEventListener('change',showAll);
    return()=>{
      observer.disconnect();
      root.removeEventListener('focusin',revealFocused);
      motion.removeEventListener('change',showAll);
      for(const node of nodes){delete node.dataset.scrollReveal;node.style.removeProperty('--reveal-delay');}
    };
  },[frame,content]);
}
