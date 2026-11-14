#!/usr/bin/env python3
"""App-scoped durable indexing runner. No provider credentials in the host service or logs."""
import fcntl,json,pathlib,subprocess

def run(args,timeout=30):
    result=subprocess.run(args,check=True,capture_output=True,text=True,timeout=timeout)
    return result.stdout.strip()

def main():
    with pathlib.Path('/run/lock/luatvietduc-knowledge.lock').open('a') as lock:
        try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        except BlockingIOError:return
        ids=run(['docker','ps','--quiet','--filter','label=com.docker.compose.project=luatvietduc','--filter','label=com.docker.compose.service=web']).splitlines()
        if len(ids)!=1:raise RuntimeError('One application container required')
        info=json.loads(run(['docker','inspect',ids[0]]))[0]
        if not info['Config']['Image'].startswith('luatvietduc-web:'):raise RuntimeError('Unexpected application image')
        # timeout(1) runs INSIDE the container, so interrupted workers cannot linger after a deployment or timer timeout.
        run(['docker','exec','--user','node',ids[0],'timeout','150','node','--import','tsx','scripts/knowledge-worker.ts'],timeout=160)
if __name__=='__main__':
    try:main()
    except Exception:raise SystemExit('Knowledge indexing postponed; it will retry automatically')
