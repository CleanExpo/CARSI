from pathlib import Path
import json,subprocess
R=Path.cwd();W=R/'work/shortcut-rebuild';O=R/'outputs/AI-in-Business-Keyboard-Tips';C=R/'work/shortcut-capture'
r=json.loads((C/'receipt.json').read_text());lines=['ffconcat version 1.0']
for i,f in enumerate(r['frames']):
 dt=r['frames'][i+1]['timestamp']-f['timestamp'] if i+1<len(r['frames']) else .2
 lines.extend([f"file '{C/f['file']}'",f'duration {dt:.9f}'])
lines.append(f"file '{C/r['frames'][-1]['file']}'");(W/'shift-enter.ffconcat').write_text('\n'.join(lines)+'\n')
subprocess.run(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',str(W/'shift-enter.ffconcat'),'-vf','fps=25','-c:v','libx264','-crf','17','-threads','2',str(W/'shift-enter.mp4')],check=True)
s=(W/'build.py').read_text().replace("W=R/'work/sentence-rebuild';O=R/'outputs/AI-in-Business-Sentence-Rebuild'","W=R/'work/shortcut-rebuild';O=R/'outputs/AI-in-Business-Keyboard-Tips'")
s=s.replace("add('02  Facts complete',1.6,'still',last('facts-continuous'),cams['typing'],voice=(52.96,54.56),note='Do not send yet · add the request below the facts')", "tip=add('TIP  Don’t press Enter yet',4.08,capture=str(W/'shift-enter.mp4'),crop=[280,328,780,190],voice=(52.96,54.56),note='Shift + Enter = new line · Enter = send · wait until the prompt is complete');tip['keyCue']=True")
s=s.replace("note='Actual typing · one uninterrupted instruction from Margot'", "note='Keep typing below the facts · Shift + Enter adds another line without sending'")
s=s.replace("note='Actual Send and response · no email is sent'", "note='TIP: Enter sends the prompt · check first, then press Enter or click Send'")
a=s.index("rd=read('05  Read the first answer'");b=s.index("cor=add('06  Correct the draft'",a)
s=s[:a]+"add('05  Check the calculation',6.76,'still',last('first-reply-scroll'),[435,150,780,300],voice=(75.32,82.08),note='A$385 is correct · check the inferred date before using this draft')\nrd=read('05  Read the first answer','first-reply-scroll',[435,110,780,320],old['observedResponses']['first'],'Read the draft · verify prices, dates and promises · progress below');rd['pan']=[110,310,10,10]\n"+s[b:]
s=s.replace("note='Actual correction in the same chat · unsupported exact date removed'", "note='Read the correction, then type · keep the context in the same chat'")
s=s.replace("path=p['capture'] if still else str(S/(p['capture']+'.mp4'))", "path=p['capture'] if still or p['capture'].endswith('.mp4') else str(S/(p['capture']+'.mp4'))")
needle="  filt=vf+f',ass={ap},scale=in_range=auto:out_range=tv,format=yuv420p,setsar=1[v]'"
replace="""  if p.get('keyCue'):
   vf+=f\",drawbox=x=480:y=775:w=960:h=112:color=0x203c49:t=fill,drawtext=fontfile='{font}':text='TIP   SHIFT + ENTER':x=590:y=792:fontsize=48:fontcolor=white,drawtext=fontfile='{font}':text='A new line. Your request stays unsent.':x=575:y=852:fontsize=27:fontcolor=0x85d9e3\"
  if any(r['startFrame']==p['startFrame'] for r in reading):
   vf+=f\",drawbox=x=42:y=1000:w=1836:h=6:color=0x30454b:t=fill,drawbox=x=42:y=1000:w=1836:h=6:color=0x85d9e3:t=fill,drawbox=x='42+1836*t/{dur}':y=1000:w=5:h=6:color=white:t=fill\" if False else f\",drawbox=x=42:y=1000:w=1836:h=6:color=0x30454b:t=fill,drawtext=fontfile='{font}':text='●':x='42+1800*t/{dur}':y=984:fontsize=28:fontcolor=0x85d9e3\"
  filt=vf+f',ass={ap},scale=in_range=auto:out_range=tv,format=yuv420p,setsar=1[v]'"""
s=s.replace(needle,replace)
s=s.replace("dest=O/'AI-in-Business-Sentence-Rebuild.mp4'","dest=O/'AI-in-Business-Keyboard-Tips.mp4'")
s=s.replace("edition='Whole-sentence native-cadence rebuild'", "edition='Whole-sentence rebuild with demonstrated keyboard tip'")
s=s.replace("Actual previously captured OpenAI session; whole obsolete sentences omitted, no borrowed-word splice.", "Actual OpenAI session plus fresh Shift+Enter capture; whole sentences, no borrowed-word splice. Reading intervals are explicit with continuous progress; calculator instruction precedes first answer reading.")
# Reuse unchanged cinematic source composites, never edited audio. Captions remain generated from original ASR.
s=s.replace(" out=W/f'piece-{i:02}.mp4'", " out=W/f'piece-{i:02}.mp4'\n if p['kind']=='cinematic':\n  import shutil\n  shutil.copy2(R/'work/sentence-rebuild'/f'piece-{i:02}.mp4',out);print('Reused unchanged cinematic',i,flush=True);return out")
(W/'build.py').write_text(s)
html=(R/'outputs/AI-in-Business-Sentence-Rebuild/watch.html').read_text().replace('AI-in-Business-Sentence-Rebuild.mp4','AI-in-Business-Keyboard-Tips.mp4').replace('Whole-sentence rebuild · native 25fps','Keyboard tips revision · native 25fps').replace('Clearly labelled reading intervals allow time for the complete prompt and answers.','A demonstrated Shift + Enter tip adds a new line without sending. Reading progress remains visible while you check complete prompts and answers.')
(O/'watch.html').write_text(html)
