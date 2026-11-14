'use client';

import dynamic from 'next/dynamic';

// Keep each view's interactive code separate while retaining its server HTML.
// The server chooses the view; neither data fetching nor access checks move here.
export const Home = dynamic(() => import('./Home').then(module => module.Home));
export const Library = dynamic(() => import('./Library').then(module => module.Library));
export const TopicPage = dynamic(() => import('./Library').then(module => module.TopicPage));
export const News = dynamic(() => import('./News').then(module => module.News));
export const LegacyStory = dynamic(() => import('./News').then(module => module.LegacyStory));
export const About = dynamic(() => import('./Information').then(module => module.About));
export const Policy = dynamic(() => import('./Information').then(module => module.Policy));
export const Help = dynamic(() => import('./Information').then(module => module.Help));
export const Contact = dynamic(() => import('./Contact').then(module => module.Contact));
