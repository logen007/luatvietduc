#!/usr/bin/env python3
"""Conservatively select fast CI against the actual deployed revision; failures use full CI."""
import importlib.util,json,os,subprocess,urllib.request
from pathlib import Path
spec=importlib.util.spec_from_file_location('release',Path(__file__).with_name('auto-release.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
fast=False
if os.environ.get('EVENT_NAME')=='push':
    try:
        req=urllib.request.Request('https://luatvietduc.com/release.json',headers={'Cache-Control':'no-cache'})
        with urllib.request.urlopen(req,timeout=10) as response:base=json.load(response)['commit']
        if not m.valid_sha(base):raise ValueError('Unknown base')
        subprocess.run(['git','merge-base','--is-ancestor',base,'HEAD'],check=True,capture_output=True)
        paths=subprocess.check_output(['git','diff','--name-only','--no-renames',base,'HEAD'],text=True).splitlines()
        fast=m.presentation_only(paths)
    except Exception:pass
with open(os.environ['GITHUB_OUTPUT'],'a') as output:output.write('fast='+str(fast).lower()+'\n')
print('Release scope: '+('presentation (no application build)' if fast else 'full application'))
