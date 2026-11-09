from pathlib import Path
import json,subprocess,hashlib,math
import numpy as np
from PIL import Image,ImageDraw
R=Path.cwd();W=R/'work/shortcut-rebuild';O=R/'outputs/AI-in-Business-Keyboard-Tips';D=O/'review';F=D/'frames';F.mkdir(parents=True,exist_ok=True);V=O/'AI-in-Business-Keyboard-Tips.mp4';m=json.loads((W/'timeline.json').read_text());fps=25
def cmd(a):return subprocess.check_output(a)
p=json.loads(cmd(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(V)]));v=next(s for s in p['streams'] if s['codec_type']=='video');a=next(s for s in p['streams'] if s['codec_type']=='audio')
assert v['r_frame_rate']=='25/1' and v['pix_fmt']=='yuv420p' and v['has_b_frames']==0 and v['color_range']=='tv'
assert int(v['nb_frames'])==m['frames'];assert abs(float(a['duration'])-float(v['duration']))<.04
subprocess.run(['ffmpeg','-v','error','-i',str(V),'-f','null','-'],check=True)
pts=json.loads(cmd(['ffprobe','-v','error','-select_streams','v','-show_entries','packet=pts_time,dts_time','-of','json',str(V)]))['packets'];ts=np.array([float(q['pts_time']) for q in pts]);assert max(abs(np.diff(ts)-.04))<1e-6
subprocess.run(['ffmpeg','-y','-v','error','-i',str(V),'-vf','fps=1','-q:v','2',str(F/'%04d.jpg')],check=True)
files=sorted(F.glob('*.jpg'))
for start in range(0,len(files),30):
 im=Image.new('RGB',(1920,1410),'#fffdf8');d=ImageDraw.Draw(im)
 for i,f in enumerate(files[start:start+30]):
  x=i%5*384;y=i//5*235;im.paste(Image.open(f).resize((384,216)),(x,y));d.text((x+4,y+218),f'{start+i}s',fill='black')
 im.save(D/f'contact-{start//30+1:02}.jpg',quality=90)
def audio(path):return np.frombuffer(cmd(['ffmpeg','-v','error','-i',str(path),'-vn','-ar','48000','-ac','1','-f','f32le','-']),dtype='<f4')
x=audio(m['sourceAudio']);y=audio(V);checks=[]
for s in m['speech']:
 cs=[]
 for offset in np.arange(.15,s['durationSec']-.4,.5):
  src=round((s['sourceStartSec']+offset)*48000);dest=round(s['startFrame']/25*48000+offset*48000);aa=x[src:src+12000];bb=y[dest:dest+12000]
  if len(aa)==len(bb) and float(np.std(aa))>.002:cs.append(float(np.corrcoef(aa,bb)[0,1]))
 checks.append({'sourceRange':[s['sourceStartSec'],s['sourceEndSec']],'outputStartSec':s['startFrame']/25,'windows':len(cs),'minimumCorrelation':min(cs)})
assert min(c['minimumCorrelation'] for c in checks)>.95,checks
holds=[]
for index in [3,5,11]:
 piece=m['pieces'][index];pre=piece.get('prepend',0);start=piece['startFrame']/25+pre+.4;sec=piece['frames']/25-pre-.8
 pp=subprocess.Popen(['ffmpeg','-v','error','-ss',str(start),'-i',str(V),'-t',str(sec),'-vf','crop=1840:820:40:145,scale=920:410,format=gray','-f','rawvideo','-'],stdout=subprocess.PIPE);size=920*410;anchor=None;i=0;mark=0;gaps=[]
 while True:
  b=pp.stdout.read(size)
  if len(b)!=size:break
  ar=np.frombuffer(b,dtype=np.uint8)>150
  if anchor is None:anchor=ar.copy()
  if np.count_nonzero(ar!=anchor)>15:gaps.append((i-mark)/25);anchor=ar.copy();mark=i
  i+=1
 gaps.append((i-mark)/25);pp.wait();holds.append({'piece':piece['name'],'maxUnchangedSec':max(gaps),'over750ms':[g for g in gaps if g>.75]})
assert not any(h['over750ms'] for h in holds),holds
anchors=[]
for index,label,visible,spoken in [(4,'Do not send yet cue',0,.06),(2,'Click message box',.05,.06),(3,'Prices in facts',3.637-.24,2.7+.58),(7,'First Send',.7667,.48+.4),(11,'Type correction',1.28+.3333,1.56),(13,'Second Send',.7667,.72+.06)]:
 piece=m['pieces'][index];delta=abs(visible-spoken);assert delta<=.25
 at=piece['startFrame']/25+visible;out=D/f'action-{len(anchors):02}.png';subprocess.run(['ffmpeg','-y','-v','error','-ss',str(at),'-i',str(V),'-frames:v','1',str(out)],check=True);anchors.append(dict(id=label,visibleActionFrame=round(at*25),spokenWordFrame=round((piece['startFrame']/25+spoken)*25),mismatchSec=delta,reviewedInFinal=False,evidence={'path':str(out),'sha256':hashlib.sha256(out.read_bytes()).hexdigest()}))
for r in m['reading']:assert (r['endFrame']-r['startFrame'])/25>=max(3,r['words']/3)
r=json.loads((O/'receipt.json').read_text());r.update(wholeDecode='PASS',packetCadence='Every video PTS interval exactly 40ms; no B frames; original cadence retained',audioVideoDriftSec=float(a['duration'])-float(v['duration']),speechPlacement=checks,typingMotion=holds,oneSecondFrames=len(files),anchors=anchors,limitation='Correlation proves unchanged audio placement, not semantic action matching or speaker output. Owner review and independent watch/listen pending.');(O/'receipt.json').write_text(json.dumps(r,indent=2));(D/'technical-verification.json').write_text(json.dumps(r,indent=2));(D/'media-probe.json').write_text(json.dumps(p,indent=2));print(json.dumps(r,indent=2))
