import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requiresHuman} from '../src/modules/assistant/faq.ts';

test('German personal files and cases require human handoff before provider work',()=>{
 for(const question of ['Bitte prüfen Sie meine Akte.','Bitte prüfen Sie meinen Fall.','Was gilt in meinem Fall?','Meine Unterlagen sollen individuell geprüft werden.','Können Sie meine Dokumente prüfen?'])assert.equal(requiresHuman(question),true,question);
});

test('German requests for a person require human handoff',()=>{
 for(const question of ['Ich möchte mit einem Mitarbeiter sprechen.','Ich möchte mit einer Beraterin sprechen.','Kann ich einen Menschen sprechen?','Ich möchte persönliche Rechtsberatung.','Kann ich mit einer Anwältin sprechen?'])assert.equal(requiresHuman(question),true,question);
});

test('general German FAQ questions retain the approved-source route',()=>{
 for(const question of ['Welche Unterlagen brauchen Unternehmen allgemein?','Welche allgemeinen Voraussetzungen gelten?','Wie beantragt man einen Aufenthaltstitel?','Welche Kündigungsfristen gelten bei einem Arbeitsvertrag mit einem Mitarbeiter?','Ist ein Vertrag mit einem Anwalt generell schriftlich abzuschließen?','Welche Regeln gelten, wenn Unternehmen mit einer Beraterin sprechen?','Kann ich mit einem Anwalt einen Vertrag abschließen?'])assert.equal(requiresHuman(question),false,question);
});
