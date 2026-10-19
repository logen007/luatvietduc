"""Apply reviewed source refinements before the first UX branch release.
No external downloads, no credentials and no user data are handled here.
Every replacement is exact and idempotent; unexpected source aborts the build.
"""
from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if new in text:
        return
    if old not in text:
        raise RuntimeError(f'Expected source not found in {path}: {old[:100]}')
    if text.count(old) != 1:
        raise RuntimeError(f'Ambiguous replacement in {path}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')

replace_once('index.html', ' href="#main" onclick="return false" id="skip-main"', ' href="#main" id="skip-main"')
replace_once('assets/app.js', "const target=e.target.closest('button,a');if(!target)return;", "const target=e.target.closest('button,a');if(!target)return;\n    if(target.id==='skip-main'){e.preventDefault();main.focus({preventScroll:true});main.scrollIntoView({block:'start'});return;}")
replace_once('assets/app.js', "const showHub=!keyword&&!situation&&!topic&&!country&&!kind;", "const showHub=['/tra-cuu','/chu-de'].includes(route.path)&&!keyword&&!situation&&!topic&&!country&&!kind;")
replace_once('assets/app.js', "removed?set.delete(a.id):set.add(a.id);render();toast(removed?", "removed?set.delete(a.id):set.add(a.id);const oldY=window.scrollY;render();window.scrollTo(0,oldY);document.querySelector('[data-save=\"'+a.id+'\"]')?.focus({preventScroll:true});toast(removed?")
replace_once('assets/app.js', r'norm(keyword).split(/\s+/).filter(Boolean)', 'norm(keyword).split(/[^a-z0-9]+/).filter(Boolean)')
replace_once('assets/app.js', 'match:tokens.every(t=>hay.includes(t))', 'match:tokens.every(t=>hay.split(/[^a-z0-9]+/).some(w=>w===t||(t.length>=3&&w.startsWith(t))))')
replace_once('assets/styles.css', 'font-family:-apple-system,BlinkMacSystemFont', 'font-family:system-ui,-apple-system,BlinkMacSystemFont')
css=Path('assets/styles.css')
text=css.read_text(encoding='utf-8')
extra='\n/* Keyboard focus and validation refinements. */\n#main:focus{outline:none}.error{color:var(--danger);font-size:13px;margin-top:6px}.error:empty{display:none}.filter-panel>summary{pointer-events:auto}\n'
if '/* Keyboard focus and validation refinements. */' not in text:
    css.write_text(text+extra,encoding='utf-8')
print('Source refinements ready.')
