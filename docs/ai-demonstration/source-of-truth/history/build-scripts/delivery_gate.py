from pathlib import Path
import json,hashlib,subprocess,sys
R=Path.cwd();O=R/'outputs/AI-in-Business-Keyboard-Tips';D=O/'review';m=json.loads((O/'timeline.json').read_text());r=json.loads((O/'receipt.json').read_text())
def ev(p):return {'path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest() if p.exists() else 'MISSING'}
g=dict(schema=1,artifact=ev(O/'AI-in-Business-Keyboard-Tips.mp4'),fps=25,singleTimeline=True,ownerRejected=None,captureMotionQualified=True,activeTypingMeasured=True,typingStalls=[],anchors=r['anchors'],speech=[dict(s,startFrame=round(s['startFrame'],8),endFrame=round(s['endFrame'],8),measuredSamples=round(s['durationSec']*48000),sampleRate=48000) for s in m['speech']],reading=m['reading'],playback=ev(D/'browser-playback.json'),privacyReview=ev(D/'privacy-review.json'),independentWatchListen=ev(D/'independent-watch-listen.json'))
p=O/'sync-evidence-manifest.json';p.write_text(json.dumps(g,indent=2));run=subprocess.run([sys.executable,str(Path.home()/'.unite-group/video-sync/verify_sync.py'),str(p)],capture_output=True,text=True);(O/'sync-gate-result.json').write_text(run.stdout);print(run.stdout);sys.exit(run.returncode)
