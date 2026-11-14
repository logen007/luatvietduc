#!/usr/bin/env python3
"""Adapter to the existing encrypted Drive worker; never a second backup implementation."""
import argparse
import importlib.util
import json
from pathlib import Path
from lvd import Site

def main():
    p=argparse.ArgumentParser();p.add_argument('--dir',type=Path,required=True);p.add_argument('--schedule',action='store_true');args=p.parse_args()
    site=Site(args.dir)
    spec=importlib.util.spec_from_file_location('lvd_backup_runner',Path(__file__).with_name('backup-runner.py'))
    worker=importlib.util.module_from_spec(spec);spec.loader.exec_module(worker)
    worker.PROJECT=site.config['project'];worker.BASE=site.root/'backup-work'
    worker.recovery_environment=lambda: site.root/'runtime.env'
    def bridge(web,action,**values):
        return json.loads(worker.run(['docker','exec','-i','-w','/app',web,'node','maintenance/backup-bridge.mjs'],
            data=json.dumps(dict(action=action,**values)).encode(),timeout=60))
    worker.bridge=bridge
    # Same installation lock as update, stop and manual export.
    with site.lock():
        if args.schedule: worker.schedule()
        worker.once()

if __name__=='__main__':
    try: main()
    except Exception: raise SystemExit('Portable backup worker postponed; no live data replaced') from None
