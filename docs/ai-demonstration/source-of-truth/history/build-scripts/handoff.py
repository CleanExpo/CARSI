from pathlib import Path
import json,subprocess,shlex
R=Path.cwd();O=R/'outputs/AI-in-Business-Keyboard-Tips';r=json.loads((O/'receipt.json').read_text())
remote='/Volumes/Mini Mini 2T Storage/tmp/uni-2934-cinematic/keyboard-tips-review/'
subprocess.run(['rsync','-a','--exclude','frames/','--exclude','contact-*.jpg',str(O)+'/','mini-lan:'+shlex.quote(remote)],check=True)
payload={'sha256':r['sha256'],'duration':r['durationSec'],'local':str(O),'remote':remote}
code='''import json,fcntl,sys
from pathlib import Path
v=json.loads(sys.argv[1]);p=Path('/Volumes/Mini Mini 2T Storage/ops/jobs.json')
with Path(str(p)+'.lock').open('a') as l:
 fcntl.flock(l,fcntl.LOCK_EX);d=json.loads(p.read_text())
 def find(x):
  if isinstance(x,dict):
   if x.get('id')=='MAC-MELBOURNE-AI-BUSINESS':return x
   for q in x.values():
    z=find(q)
    if z is not None:return z
  if isinstance(x,list):
   for q in x:
    z=find(q)
    if z is not None:return z
 j=find(d)
 j.update(status='review',claimed_by='MacBook/codex',next_action='Phill reviews keyboard-tip edition. MacBook/codex owns precise pacing corrections. Independent watch/listen and owner acceptance remain required before production use.')
 j['result']=str(j.get('result',''))+'\\n09/11 keyboard-tip revision: '+json.dumps(v)+'. Fresh actual Shift+Enter creates a new paragraph while unsent; visual key cue alongside original Do not send yet. Enter-to-send and same-chat correction tips included. Calculator explanation precedes reading; first answer reading trimmed 32 to 28s with gentle pan and moving reading progress. Original complete sentences preserved. 25fps, exact40ms PTS,0 audio/video duration drift, typing max unchanged0.20s,266 one-second frames and OCR0. Technical/private preview only, production HOLD. Final natural playback:266.4s at1x unmuted,6660frames/0dropped,no midplayback stalls. Startup seek/wait at0 retained; gate HOLD also flags these raw events. Playback evidence and gate stored with artifact. LESSON: Explain reading intervals visibly and show the actual new-line key action before asking learners to send (held for Phill approval).'
 j['video_sync_system']['currentArtifactSHA256']=v['sha256'];j['video_sync_system']['currentReviewPath']=v['remote'];j['video_sync_system']['currentGate']='HOLD — owner acceptance and independent watch/listen'
 p.write_text(json.dumps(d,indent=2));print('Updated review card; previous versions retained')
'''
# Structured JSON is quoted for the remote shell, never interpolated as executable content.
import shlex
subprocess.run(['ssh','mini-lan','python3 - '+shlex.quote(json.dumps(payload))],input=code,text=True,check=True)
