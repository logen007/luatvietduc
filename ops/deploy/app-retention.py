#!/usr/bin/env python3
"""Keep the current app image; temporary rollback image survives until release lock is released."""
import fcntl,json,pathlib,re,subprocess,urllib.request
STATE=pathlib.Path('/var/lib/luatvietduc-deploy')
# Include the presentation-directory step: an unmatched terminal cache record
# keeps the matching build ancestors alive even after their image is removed.
CACHE_FILTER='description~=fs.accessSync.*fs.constants.R_OK|build-placeholder-not-for-runtime-secret|/legacy-assets|/legacy-index|apps/cms/|prepare-container.mjs|presentation-releases/base'

def obsolete(tags,current,used,inspect):
    if not re.fullmatch(r'[a-f0-9]{40}',current):raise ValueError('Known current release required')
    for tag in tags:
        if not re.fullmatch(r'luatvietduc-web:[a-f0-9]{7,40}',tag) or tag=='luatvietduc-web:'+current:continue
        if inspect(tag) not in used:yield tag

def run(args,timeout=45):return subprocess.check_output(args,text=True,timeout=timeout).strip()

def main():
    with (STATE/'deploy.lock').open('a') as lock:
        try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        except BlockingIOError:return
        state=json.loads((STATE/'state.json').read_text());current=state['current_release']
        with urllib.request.urlopen('http://127.0.0.1:3049/release.json',timeout=5) as response:served=json.loads(response.read(1024))
        if served.get('commit')!=state['current_sha']:raise RuntimeError('Served release differs from deployment state')
        containers=run(['docker','ps','-aq']).splitlines()
        used={json.loads(run(['docker','inspect',item]))[0]['Image'] for item in containers}
        tags=run(['docker','image','ls','luatvietduc-web','--format','{{.Repository}}:{{.Tag}}']).splitlines()
        for tag in obsolete(tags,current,used,lambda tag:json.loads(run(['docker','image','inspect',tag]))[0]['Id']):
            # No force: Docker independently protects a newly referenced image.
            subprocess.run(['docker','image','rm',tag],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=45)
        # Select only this project's recognizable build steps. No volumes, containers, other images or global prune.
        subprocess.run(['docker','buildx','prune','--force','--filter',CACHE_FILTER,'--filter','until=30m'],check=True,stdout=subprocess.DEVNULL,timeout=180)
        print('App retention complete: current image retained; old app artifacts reclaimed')
if __name__=='__main__':
    try:main()
    except Exception:raise SystemExit('App retention deferred; current application remains untouched')
