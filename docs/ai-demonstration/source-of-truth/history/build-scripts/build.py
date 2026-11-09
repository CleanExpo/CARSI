from pathlib import Path
import json, subprocess, math, concurrent.futures, hashlib, wave, textwrap
import numpy as np
R=Path.cwd();W=R/'work/shortcut-rebuild';O=R/'outputs/AI-in-Business-Keyboard-Tips';S=R/'work/shared-timeline';fps=25
raw=R/'outputs/AI-in-Business-Cinematic-Tutorial/narration/margot-tutorial.mp4'
chap=json.loads((R/'work/margot-update/chapters-aligned.json').read_text())['chapters']
old=json.loads((S/'timeline.json').read_text());pieces=[];speech=[];reading=[];at=0
def f(t):return round(t*fps)
def add(name,sec,kind='screen',capture=None,crop=None,source=0,voice=None,voiceAt=0,words=0,note=''):
 global at
 p=dict(name=name,startFrame=at,frames=f(sec),kind=kind,capture=capture,crop=crop,source=source,note=note);pieces.append(p)
 if voice:
  a,b=voice;ss={'startFrame':at+f(voiceAt),'sourceStartSec':a,'sourceEndSec':b,'durationSec':b-a,'endFrame':at+f(voiceAt)+(b-a)*fps};speech.append(ss);p['voice']=ss
 if words:reading.append(dict(id=name,startFrame=at,endFrame=at+p['frames'],words=words,quiet=True))
 at+=p['frames'];return p
def last(n):return str(sorted((S/'clean'/n).glob('*.jpg'))[-1])
cams={'typing':[430,250,800,340],'response':[425,55,800,710],'reply':[435,110,780,465],'correction':[430,540,800,285],'checked':[425,340,800,315]}
add('AI in Business',35.12,'cinematic',source=0,voice=(0,35.12))
add('01  Open ChatGPT',3.16,capture='loading',crop=cams['typing'],voice=(35.12,38.24),note='Actual temporary OpenAI session · signed-in view · fictional information')
click=add('02  Click the message box',1.68,capture='facts-continuous',crop=cams['typing'],voice=(42.88,44.56),note='Click the message box');click['limitSource']=.12
facts=add('02  Enter the facts',14.08,capture='facts-continuous',crop=cams['typing'],source=.24,voice=(47.16,49.96),voiceAt=2.7,note='Actual typing · include the prices and unknown details')
tip=add('TIP  Don’t press Enter yet',4.08,capture=str(W/'shift-enter.mp4'),crop=[280,345,780,115],voice=(52.96,54.56),note='Shift + Enter = new line · Enter = send · wait until the prompt is complete');tip['keyCue']=True
add('03  Add the request',16.8,capture='request-continuous',crop=cams['typing'],source=.12,voice=(54.56,67.2),note='Keep typing below the facts · Shift + Enter adds another line without sending')
def read(name,capture,crop,text,note):return add(name,math.ceil(len(text.split())/3),'still',last(capture),crop,words=len(text.split()),note=note)
read('03  Read the complete prompt','request-continuous',cams['typing'],old['prompts']['facts']+' '+old['prompts']['request'],'Reading interval · complete prompt · next step follows automatically')
s1=add('04  Send and read the answer',7.2,capture='first-send-response',crop=cams['response'],voice=(67.2,69.88),voiceAt=.48,note='TIP: Enter sends the prompt · check first, then press Enter or click Send');s1['cameraBefore']={'until':1.04,'crop':cams['typing']}
add('05  Reveal the complete answer',1.32,capture='first-reply-scroll',crop=cams['response'],note='Scroll to read the complete answer')
add('05  Check the calculation',6.76,'still',last('first-reply-scroll'),[435,150,780,300],voice=(75.32,82.08),note='A$385 is correct · check the inferred date before using this draft')
rd=read('05  Read the first answer','first-reply-scroll',[435,110,780,320],old['observedResponses']['first'],'Read the draft · verify prices, dates and promises · progress below');rd['pan']=[110,310,10,10]
cor=add('06  Correct the draft',21.36,capture='correction-continuous',crop=cams['correction'],voice=(82.08,86.56),note='Read the correction, then type · keep the context in the same chat');cor['prepend']=1.28
read('06  Read the correction','correction-continuous',cams['correction'],old['prompts']['correction'],'Reading interval · complete correction · next step follows automatically')
s2=add('06  Send, then check again',3.2,capture='second-send-response',crop=cams['response'],voice=(86.56,88.48),voiceAt=.72,note='Actual Send and revised response');s2['cameraBefore']={'until':1.04,'crop':cams['correction']}
add('07  Reveal the checked answer',1.32,capture='checked-reply-scroll',crop=cams['response'],note='Scroll to read the complete revised answer')
read('07  Read the checked answer','checked-reply-scroll',cams['checked'],old['observedResponses']['checked'],'Reading interval · exact date and address now requested')
add('Apply the workflow',63.32,'cinematic',source=88.48,voice=(88.48,151.8))
m=dict(taskId='MAC-MELBOURNE-AI-BUSINESS',fps=fps,frames=at,durationSec=at/fps,pieces=pieces,speech=speech,reading=reading,sourceAudio=str(raw),ownerAcceptance='PENDING',method='Direct smooth original; complete sentences only; native 25fps, limited-range yuv420p, no B frames; each source composited once, final video stream copied. Actual OpenAI session plus fresh Shift+Enter capture; whole sentences, no borrowed-word splice. Reading intervals are explicit with continuous progress; calculator instruction precedes first answer reading.',prompts=old['prompts'],observedResponses=old['observedResponses'])
(W/'timeline.json').write_text(json.dumps(m,indent=2));(O/'timeline.json').write_text(json.dumps(m,indent=2))
asr=json.loads((R/'work/margot-update/tutorial-asr.json').read_text())['transcription'];font='/System/Library/Fonts/Supplemental/Arial.ttf'
def run(a):subprocess.run(a,check=True)
def stamp(t):
 c=round(t*100);return f'{c//360000}:{c//6000%60:02}:{c//100%60:02}.{c%100:02}'
baseass='''[Script Info]\nScriptType: v4.00+\nPlayResX: 1920\nPlayResY: 1080\n[V4+ Styles]\nFormat: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding\nStyle: Voice,Arial,30,&H00F0F7FA,&H00F0F7FA,&H00101010,&H00101010,0,0,0,0,100,100,0,0,1,2,0,2,80,80,22,1\n[Events]\nFormat: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text\n'''
captions=[]
def render(item):
 i,p=item;dur=p['frames']/fps;args=['ffmpeg','-y','-v','error'];v=p.get('voice');ass=baseass
 if v:
  va=(v['startFrame']-p['startFrame'])/fps
  for c in asr:
   a=c['offsets']['from']/1000;b=c['offsets']['to']/1000
   if a>=v['sourceStartSec']-.2 and b<=v['sourceEndSec']+.2:
    a=max(a,v['sourceStartSec']);b=min(b,v['sourceEndSec']);start=va+a-v['sourceStartSec'];end=va+b-v['sourceStartSec'];txt=c['text'].strip();captions.append({'startSec':p['startFrame']/fps+start,'endSec':p['startFrame']/fps+end,'text':txt});txt='\\N'.join(textwrap.wrap(txt,100));ass+=f'Dialogue: 0,{stamp(start)},{stamp(end)},Voice,,0,0,0,,{txt}\n'
 ap=W/f'{i:02}.ass';ap.write_text(ass)
 if p['kind']=='cinematic':
  a=p['source'];b=a+dur;lines=['ffconcat version 1.0']
  for j,c in enumerate(chap):
   lo=max(a,c['startSec']);hi=min(b,c['endSec'] if j<len(chap)-1 else 151.8)
   if hi>lo:lines += [f"file '{R/'outputs/AI-in-Business-Cinematic-Tutorial/project/slides'/f'{j+1:02}.png'}'",f'duration {hi-lo:.8f}']
  lines.append(lines[-2]);seq=W/f'slides-{i}.ffconcat';seq.write_text('\n'.join(lines)+'\n')
  args+=['-f','concat','-safe','0','-i',str(seq),'-ss',str(a),'-i',str(raw)]
  # Avatar is taken from the exact same original source time as the narration.
  filt=f'[0:v]fps=25,scale=1920:1080,setsar=1[bg];[1:v]setpts=PTS-STARTPTS,scale=430:242,setsar=1[av];[bg][av]overlay=1450:690:eof_action=pass,ass={ap},scale=in_range=auto:out_range=tv,format=yuv420p[v]'
 else:
  still=p['kind']=='still';path=p['capture'] if still or p['capture'].endswith('.mp4') else str(S/(p['capture']+'.mp4'))
  if still:args+=['-loop','1','-framerate','25','-i',path]
  else:args+=['-ss',str(p['source']),'-i',path]
  x,y,w,h=p['crop'];yy=str(y)
  if p.get('pan'):
   pa=p['pan'];yy=f'{pa[0]}+{pa[1]-pa[0]}*clip((t-{pa[2]})/{pa[3]},0,1)'
  pre='setpts=PTS-STARTPTS,'
  if p.get('limitSource'):pre+=f"trim=duration={p['limitSource']},"
  if p.get('prepend'):pre+=f"tpad=start_mode=clone:start_duration={p['prepend']},"
  pre+=f'tpad=stop_mode=clone:stop_duration={dur},fps=25,'
  # Before Send, keep the composer in view; after the click, reveal the response.
  if p.get('cameraBefore'):
   cb=p['cameraBefore'];xx,y0,ww,h0=cb['crop'];until=cb['until']
   vf=f"[0:v]{pre}split[a][b];[a]crop={ww}:{h0}:{xx}:{y0},scale=1840:820:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=1920:1080:(ow-iw)/2:145+(820-ih)/2:color=0x0f0f0f[a1];[b]crop={w}:{h}:{x}:{y},scale=1840:820:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=1920:1080:(ow-iw)/2:145+(820-ih)/2:color=0x0f0f0f[b1];[a1][b1]blend=all_expr='if(lt(T,{until}),A,B)'"
  else:vf=f"[0:v]{pre}crop={w}:{h}:{x}:'{yy}',scale=1840:820:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=1920:1080:(ow-iw)/2:145+(820-ih)/2:color=0x0f0f0f"
  ht=W/f'{i:02}-title.txt';nt=W/f'{i:02}-note.txt';ht.write_text(p['name']);nt.write_text(p['note'])
  vf+=f",drawtext=fontfile='{font}':textfile='{ht}':x=42:y=31:fontsize=35:fontcolor=0x85d9e3,drawtext=fontfile='{font}':textfile='{nt}':x=42:y=86:fontsize=24:fontcolor=0xd6d9dc"
  if any(r['startFrame']==p['startFrame'] for r in reading):vf+=f",drawtext=fontfile='{font}':text='Reading time · next step in %{{eif\\:{math.ceil(dur)}-t\\:d}}s':x=42:y=1020:fontsize=27:fontcolor=0x85d9e3"
  if p.get('keyCue'):
   vf+=f",drawbox=x=480:y=775:w=960:h=112:color=0x203c49:t=fill,drawtext=fontfile='{font}':text='TIP   SHIFT + ENTER':x=590:y=792:fontsize=48:fontcolor=white,drawtext=fontfile='{font}':text='A new line. Your request stays unsent.':x=575:y=852:fontsize=27:fontcolor=0x85d9e3"
  if any(r['startFrame']==p['startFrame'] for r in reading):
   vf+=f",drawbox=x=42:y=1000:w=1836:h=6:color=0x30454b:t=fill,drawbox=x=42:y=1000:w=1836:h=6:color=0x85d9e3:t=fill,drawbox=x='42+1836*t/{dur}':y=1000:w=5:h=6:color=white:t=fill" if False else f",drawbox=x=42:y=1000:w=1836:h=6:color=0x30454b:t=fill,drawtext=fontfile='{font}':text='●':x='42+1800*t/{dur}':y=984:fontsize=28:fontcolor=0x85d9e3"
  filt=vf+f',ass={ap},scale=in_range=auto:out_range=tv,format=yuv420p,setsar=1[v]'
 out=W/f'piece-{i:02}.mp4'
 if i!=4 and out.exists():
  print('Reused unchanged piece',i,flush=True);return out
 if p['kind']=='cinematic':
  import shutil
  shutil.copy2(R/'work/sentence-rebuild'/f'piece-{i:02}.mp4',out);print('Reused unchanged cinematic',i,flush=True);return out
 args+=['-filter_complex',filt,'-map','[v]','-an','-frames:v',str(p['frames']),'-r','25','-c:v','libx264','-preset','fast','-crf','18','-threads','2','-pix_fmt','yuv420p','-color_range','tv','-colorspace','bt709','-color_trc','bt709','-color_primaries','bt709','-bf','0','-g','50','-video_track_timescale','12800',str(out)];run(args);print('Rendered',i,p['name'],flush=True);return out
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:parts=list(ex.map(render,enumerate(pieces)))
(W/'sequence.ffconcat').write_text('ffconcat version 1.0\n'+''.join(f"file '{p}'\n" for p in parts))
a=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(raw),'-ar','48000','-ac','2','-f','f32le','-']),dtype='<f4').reshape(-1,2);mix=np.zeros((round(at/fps*48000),2),dtype=np.float32)
for s in speech:
 start=round(s['sourceStartSec']*48000);n=min(round(s['durationSec']*48000),len(a)-start);dest=round(s['startFrame']/fps*48000);mix[dest:dest+n]=a[start:start+n]
with wave.open(str(W/'mix.wav'),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(48000);w.writeframes((np.clip(mix,-1,1)*32767).astype('<i2').tobytes())
dest=O/'AI-in-Business-Keyboard-Tips.mp4'
run(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',str(W/'sequence.ffconcat'),'-i',str(W/'mix.wav'),'-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','192k','-t',str(at/fps),'-video_track_timescale','12800','-movflags','+faststart',str(dest)])
(O/'captions.json').write_text(json.dumps(sorted(captions,key=lambda c:c['startSec']),indent=2));(O/'chapters.json').write_text(json.dumps([dict(title=p['name'],startSec=p['startFrame']/fps,endSec=(p['startFrame']+p['frames'])/fps) for p in pieces],indent=2));(O/'Margot-script.md').write_text('\n\n'.join(c['text'] for c in sorted(captions,key=lambda c:c['startSec'])))
receipt=dict(edition='Whole-sentence rebuild with demonstrated keyboard tip',sha256=hashlib.sha256(dest.read_bytes()).hexdigest(),durationSec=at/fps,frames=at,fps=fps,ownerAcceptance='PENDING',productionStatus='HOLD',sourceOriginalSHA256=hashlib.sha256(raw.read_bytes()).hexdigest(),method=m['method'])
(O/'receipt.json').write_text(json.dumps(receipt,indent=2));print(json.dumps(receipt),flush=True)
