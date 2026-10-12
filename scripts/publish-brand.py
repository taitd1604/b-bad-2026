"""Publish the runtime-only mirror at https://b-bad-2026.github.io/."""
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[1]
STAGE=ROOT/'.qa'/'brand-site'
ORG='b-bad-2026'
REPO=ORG+'.github.io'
FULL=ORG+'/'+REPO
ASSETS=['index.html','balanced.html','styles.css','app.js','core.js','favicon.svg','.nojekyll']
spec=importlib.util.spec_from_file_location('bbad_publish',ROOT/'scripts'/'github-pages.py')
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

def run_git(*args):
    result=subprocess.run(['git','-C',str(STAGE),*args],capture_output=True,text=True,timeout=90)
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or 'Git command failed')
    return result.stdout.strip()

def main():
    token=module.credentials()
    profile=module.api(token,'/user')
    if profile['login']!='taitd1604':
        raise RuntimeError('The signed-in account differs from the user-authorized owner.')
    membership=module.api(token,'/user/memberships/orgs/'+ORG,allow_missing=True)
    if not membership or membership.get('state')!='active' or membership.get('role')!='admin':
        print(json.dumps({'ready':False,'action':'Create the free b-bad-2026 organization and complete GitHub verification/terms first.'}))
        return
    repo=module.api(token,'/repos/'+FULL,allow_missing=True)
    if '--publish' not in sys.argv:
        print(json.dumps({'ready':True,'repository_exists':repo is not None,'site':'https://b-bad-2026.github.io/'}))
        return
    if repo is None:
        repo=module.api(token,'/orgs/'+ORG+'/repos','POST',{'name':REPO,'description':'B-Bad 2026 — giải đơn cầu lông. Hai phương án sơ đồ và bàn điều hành.','private':False,'auto_init':False})
    if not STAGE.resolve().is_relative_to(ROOT.resolve()):
        raise RuntimeError('Staging path is outside the dedicated workspace.')
    STAGE.mkdir(parents=True,exist_ok=True)
    if not (STAGE/'.git').is_dir():
        if repo.get('size',0)!=0:
            raise RuntimeError('Existing brand repository is non-empty; refusing to overwrite.')
        run_git('init','-b','main')
        for setting in ['user.name','user.email']:
            value=subprocess.run(['git','-C',str(ROOT),'config',setting],capture_output=True,text=True).stdout.strip()
            if value: run_git('config',setting,value)
        run_git('remote','add','origin','https://github.com/'+FULL+'.git')
    if run_git('remote','get-url','origin')!='https://github.com/'+FULL+'.git':
        raise RuntimeError('Brand mirror origin mismatch.')
    for asset in ASSETS:
        shutil.copyfile(ROOT/asset,STAGE/asset)
    (STAGE/'.gitattributes').write_text('* text=auto eol=lf\n',encoding='utf8')
    run_git('add','--','.')
    if run_git('status','--porcelain'):
        print(run_git('commit','-m','Publish B-Bad 2026 tournament desk'))
    print(run_git('push','-u','origin','main'))
    pages=module.api(token,'/repos/'+FULL+'/pages',allow_missing=True)
    if pages is None:
        try:
            pages=module.api(token,'/repos/'+FULL+'/pages','POST',{'build_type':'legacy','source':{'branch':'main','path':'/'}})
        except RuntimeError as error:
            if 'HTTP 409' not in str(error) or 'already enabled' not in str(error):
                raise
            pages=module.api(token,'/repos/'+FULL+'/pages')
    print(json.dumps({'site':pages.get('html_url'),'repository':repo['html_url'],'balanced':'https://b-bad-2026.github.io/balanced.html'}))

if __name__=='__main__':
    try: main()
    except Exception as error:
        print(str(error))
        raise SystemExit(1)
